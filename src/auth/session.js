import { httpsCallable } from 'firebase/functions';
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, functions } from '../firebaseInit';
import { supabase } from '../supabaseInit';
import { registerWebDevice } from '../api/userDevice';

const getSupabaseTokens = httpsCallable(functions, 'getSupabaseTokensV1');

let readyResolve;
export const authReady = new Promise((resolve) => {
  readyResolve = resolve;
});

const listeners = new Set();
let currentUser = null;

function notify() {
  for (const fn of listeners) fn(currentUser);
}

function sessionUserFrom(firebaseUser, supabaseUid) {
  return {
    firebaseUid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || '',
    supabaseUid,
  };
}

function tokenLooksExpired(session) {
  const expiresAt = Number(session?.expires_at || 0) * 1000;
  return Boolean(expiresAt && expiresAt < Date.now() + 30_000);
}

function trackWebSession() {
  if (!currentUser) return;
  void getAccessToken()
    .then((token) => (token ? registerWebDevice(token) : null))
    .catch((error) => {
      console.warn('Could not register web device', error);
    });
}

export async function getAccessToken() {
  if (!auth.currentUser) return null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData.user) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && !tokenLooksExpired(session)) {
      return session.access_token;
    }
  }
  const refreshed = await supabase.auth.refreshSession();
  if (!refreshed.error && refreshed.data.session?.access_token) {
    return refreshed.data.session.access_token;
  }
  await bridgeSupabaseSession();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export function onSessionChange(fn) {
  listeners.add(fn);
  fn(currentUser);
  return () => listeners.delete(fn);
}

export function getCurrentUser() {
  return currentUser;
}

export function isLoggedIn() {
  return Boolean(currentUser);
}

async function bridgeSupabaseSession() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    await supabase.auth.signOut();
    currentUser = null;
    return;
  }
  if (!firebaseUser.email) {
    throw new Error('This account has no email, so web study is not available. Use the iOS app, or sign in with Apple, Google, or email.');
  }
  const result = await getSupabaseTokens();
  const data = result.data || {};
  if (!data.access_token || !data.refresh_token) {
    throw new Error('Could not create a study session. Please try again.');
  }
  const { error } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error) throw error;
  currentUser = sessionUserFrom(firebaseUser, data.supabase_uid);
}

onAuthStateChanged(auth, async (user) => {
  try {
    if (user) {
      const token = await getAccessToken();
      const { data: { session } } = await supabase.auth.getSession();
      if (!token || !session?.user?.id) {
        currentUser = null;
      } else {
        currentUser = sessionUserFrom(user, session.user.id);
      }
    } else {
      await supabase.auth.signOut();
      currentUser = null;
    }
  } catch (error) {
    console.error('Auth bridge failed', error);
    currentUser = null;
  } finally {
    notify();
    trackWebSession();
    readyResolve();
  }
});

export async function loginWithEmail(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  await getAccessToken();
  notify();
  trackWebSession();
}

export async function registerWithEmail(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(result.user, { displayName: name });
  }
  await getAccessToken();
  notify();
  trackWebSession();
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
  await getAccessToken();
  notify();
  trackWebSession();
}

export async function loginWithApple() {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  await signInWithPopup(auth, provider);
  await getAccessToken();
  notify();
  trackWebSession();
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  await firebaseSignOut(auth);
  await supabase.auth.signOut();
  currentUser = null;
  notify();
}

export async function ensureSession() {
  await authReady;
  if (auth.currentUser) {
    const token = await getAccessToken();
    if (token) {
      notify();
      trackWebSession();
    }
  }
  return currentUser;
}
