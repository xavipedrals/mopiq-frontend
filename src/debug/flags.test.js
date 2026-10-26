import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEBUG_ALWAYS_SHOW_FEEDBACK_KEY,
  DEBUG_ALWAYS_SHOW_STUDY_TUTORIAL_KEY,
  DEBUG_UNLIMITED_STUDY_KEY,
  isDebugAlwaysShowFeedback,
  isDebugAlwaysShowStudyTutorial,
  isDebugUnlimitedStudy,
  isLocalDebugHost,
  setDebugAlwaysShowFeedback,
  setDebugAlwaysShowStudyTutorial,
  setDebugUnlimitedStudy,
} from './flags.js';

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
  };
}

describe('localhost debug host', () => {
  it('allows only loopback hosts', () => {
    assert.equal(isLocalDebugHost('localhost'), true);
    assert.equal(isLocalDebugHost('LOCALHOST'), true);
    assert.equal(isLocalDebugHost('127.0.0.1'), true);
    assert.equal(isLocalDebugHost('::1'), true);
    assert.equal(isLocalDebugHost('[::1]'), true);
    assert.equal(isLocalDebugHost('mopiq.app'), false);
    assert.equal(isLocalDebugHost('192.168.1.8'), false);
    assert.equal(isLocalDebugHost(''), false);
  });
});

describe('debug unlimited study flag', () => {
  it('is off when storage is empty or missing', () => {
    assert.equal(isDebugUnlimitedStudy(memoryStorage(), 'localhost'), false);
    assert.equal(isDebugUnlimitedStudy(null, 'localhost'), false);
  });

  it('persists on and off in storage', () => {
    const storage = memoryStorage();
    setDebugUnlimitedStudy(true, storage);
    assert.equal(storage.getItem(DEBUG_UNLIMITED_STUDY_KEY), '1');
    assert.equal(isDebugUnlimitedStudy(storage, 'localhost'), true);
    setDebugUnlimitedStudy(false, storage);
    assert.equal(storage.getItem(DEBUG_UNLIMITED_STUDY_KEY), null);
    assert.equal(isDebugUnlimitedStudy(storage, 'localhost'), false);
  });

  it('ignores a stored flag away from localhost', () => {
    const storage = memoryStorage();
    setDebugUnlimitedStudy(true, storage);
    assert.equal(isDebugUnlimitedStudy(storage, 'mopiq.app'), false);
    assert.equal(isDebugUnlimitedStudy(storage, '192.168.0.4'), false);
  });
});

describe('debug study prompts', () => {
  it('stores the tutorial and feedback switches and reads them only on localhost', () => {
    const storage = memoryStorage();
    assert.equal(isDebugAlwaysShowStudyTutorial(storage, 'localhost'), false);
    assert.equal(isDebugAlwaysShowFeedback(storage, 'localhost'), false);
    setDebugAlwaysShowStudyTutorial(true, storage);
    setDebugAlwaysShowFeedback(true, storage);
    assert.equal(storage.getItem(DEBUG_ALWAYS_SHOW_STUDY_TUTORIAL_KEY), '1');
    assert.equal(storage.getItem(DEBUG_ALWAYS_SHOW_FEEDBACK_KEY), '1');
    assert.equal(isDebugAlwaysShowStudyTutorial(storage, 'localhost'), true);
    assert.equal(isDebugAlwaysShowFeedback(storage, '127.0.0.1'), true);
    assert.equal(isDebugAlwaysShowStudyTutorial(storage, 'mopiq.app'), false);
    assert.equal(isDebugAlwaysShowFeedback(storage, 'mopiq.app'), false);
    setDebugAlwaysShowStudyTutorial(false, storage);
    setDebugAlwaysShowFeedback(false, storage);
    assert.equal(isDebugAlwaysShowStudyTutorial(storage, 'localhost'), false);
    assert.equal(isDebugAlwaysShowFeedback(storage, 'localhost'), false);
  });
});
