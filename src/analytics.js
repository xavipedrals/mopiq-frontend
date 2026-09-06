export const SHARE_VISIT_KEY = 'mopiq-arrived-via-share';
export const LANDING_VISIT_KEY = 'mopiq-landing-anonymous-sent';
export const LANDING_EVENT = 'web_landing_anonymous';

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

export async function trackAnonymousLandingVisit(context) {
  if (!shouldTrackAnonymousLanding(context)) return false;
  try {
    const { getAnalytics, initializeAnalytics, isSupported, logEvent } = await import('firebase/analytics');
    const { app } = await import('./firebaseInit');
    if (!(await isSupported())) return false;
    let analytics;
    try {
      analytics = initializeAnalytics(app, { config: { send_page_view: false } });
    } catch {
      analytics = getAnalytics(app);
    }
    logEvent(analytics, LANDING_EVENT);
    markLandingTracked();
    return true;
  } catch {
    return false;
  }
}
