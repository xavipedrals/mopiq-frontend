import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  LANDING_VISIT_KEY,
  LOGIN_EVENT,
  SHARE_VISIT_KEY,
  markArrivedViaShare,
  markLandingTracked,
  shouldTrackAnonymousLanding,
} from './analytics.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

describe('shouldTrackAnonymousLanding', () => {
  const previous = globalThis.sessionStorage;

  beforeEach(() => {
    globalThis.sessionStorage = memoryStorage();
  });

  afterEach(() => {
    if (previous === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previous;
  });

  it('counts a guest on the marketing landing once', () => {
    assert.equal(shouldTrackAnonymousLanding({ loggedIn: false, path: '/', nextQuery: '' }), true);
    markLandingTracked();
    assert.equal(shouldTrackAnonymousLanding({ loggedIn: false, path: '/', nextQuery: '' }), false);
  });

  it('skips logged-in users, other routes, app login bounces, and share-link sessions', () => {
    assert.equal(shouldTrackAnonymousLanding({ loggedIn: true, path: '/', nextQuery: '' }), false);
    assert.equal(shouldTrackAnonymousLanding({ loggedIn: false, path: '/about', nextQuery: '' }), false);
    assert.equal(shouldTrackAnonymousLanding({ loggedIn: false, path: '/', nextQuery: '/decks' }), false);
    markArrivedViaShare();
    assert.equal(shouldTrackAnonymousLanding({ loggedIn: false, path: '/', nextQuery: '' }), false);
    assert.equal(globalThis.sessionStorage.getItem(SHARE_VISIT_KEY), '1');
    assert.equal(globalThis.sessionStorage.getItem(LANDING_VISIT_KEY), null);
  });
});

describe('web login event', () => {
  it('uses a distinct Firebase event from landing visits', () => {
    assert.equal(LOGIN_EVENT, 'web_login');
  });
});
