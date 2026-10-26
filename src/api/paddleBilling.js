import { supabaseAnonKey } from '../supabaseInit';
import { getAccessToken } from '../auth/session';
import { edgeFunctionUrl } from './functionsUrl';

export async function openPaddlePortal() {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to manage your subscription.');
  const response = await fetch(edgeFunctionUrl('create_paddle_portal_session'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok || typeof body?.url !== 'string') {
    throw new Error(body?.error || 'Could not open billing.');
  }
  window.location.assign(body.url);
}
