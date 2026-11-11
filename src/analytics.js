export const SHARE_VISIT_KEY = 'mopiq-arrived-via-share';
export const LANDING_VISIT_KEY = 'mopiq-landing-anonymous-sent';
export const ANALYTICS_CONSENT_KEY = 'mopiq-analytics-consent';
export const ANALYTICS_CONSENT_EVENT = 'mopiq-analytics-consent';
export const LANDING_EVENT = 'web_landing_anonymous';
export const LOGIN_EVENT = 'web_login';

function localStore() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readAnalyticsConsent() {
  try {
    const value = localStore()?.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function analyticsConsentGranted() {
  return readAnalyticsConsent() === 'granted';
}

export function setAnalyticsConsent(value) {
  const decision = value === 'granted' ? 'granted' : 'denied';
  try {
    localStore()?.setItem(ANALYTICS_CONSENT_KEY, decision);
  } catch {
    return;
  }
  if (decision === 'granted' && typeof globalThis.dispatchEvent === 'function') {
    globalThis.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
  }
}

function sessionStore() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function markArrivedViaShare() {
  sessionStore()?.setItem(SHARE_VISIT_KEY, '1');
}

export function markLandingTracked() {
  sessionStore()?.setItem(LANDING_VISIT_KEY, '1');
}

export function shouldTrackAnonymousLanding({ loggedIn, path, nextQuery }) {
  if (loggedIn) return false;
  if (path !== '/') return false;
  if (typeof nextQuery === 'string' && nextQuery.length > 0) return false;
  const store = sessionStore();
  if (store?.getItem(SHARE_VISIT_KEY) === '1') return false;
  if (store?.getItem(LANDING_VISIT_KEY) === '1') return false;
  return true;
}

let analyticsClient;

async function initializeAnalyticsClient() {
  const { getAnalytics, initializeAnalytics, isSupported, logEvent } = await import('firebase/analytics');
  const { app } = await import('./firebaseInit');
  if (!(await isSupported())) return null;
  let analytics;
  try {
    analytics = initializeAnalytics(app, { config: { send_page_view: false } });
  } catch {
    analytics = getAnalytics(app);
  }
  return (name) => logEvent(analytics, name);
}

async function logAnalyticsEvent(name) {
  analyticsClient ??= initializeAnalyticsClient().catch(() => {
    analyticsClient = undefined;
    return null;
  });
  const log = await analyticsClient;
  if (!log || !analyticsConsentGranted()) return false;
  log(name);
  return true;
}

// Only send product milestones from the live web app, using the existing consent.
export async function trackProductEvent(name) {
  if (!import.meta.env?.PROD || !['mopiq.app', 'www.mopiq.app'].includes(globalThis.location?.hostname)) return false;
  if (!analyticsConsentGranted()) return false;
  try {
    return await logAnalyticsEvent(name);
  } catch {
    return false;
  }
}

export function createStudyMilestones(track = trackProductEvent) {
  let presented = false;
  const answered = new Set();
  return {
    present() {
      if (presented) return;
      presented = true;
      void track('study_session_started');
    },
    acknowledge(cardId) {
      void track('study_review_saved');
      if (answered.size >= 5) return;
      answered.add(cardId);
      if (answered.size === 5) void track('study_five_cards_answered');
    },
  };
}

export async function trackAnonymousLandingVisit(context) {
  if (!analyticsConsentGranted()) return false;
  if (!shouldTrackAnonymousLanding(context)) return false;
  try {
    const sent = await logAnalyticsEvent(LANDING_EVENT);
    if (sent) markLandingTracked();
    return sent;
  } catch {
    return false;
  }
}

export async function trackWebLogin() {
  if (!analyticsConsentGranted()) return false;
  try {
    return await logAnalyticsEvent(LOGIN_EVENT);
  } catch {
    return false;
  }
}
