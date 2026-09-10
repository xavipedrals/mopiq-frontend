import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEBUG_UNLIMITED_STUDY_KEY, isDebugUnlimitedStudy, setDebugUnlimitedStudy } from './flags.js';

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

describe('debug unlimited study flag', () => {
  it('is off when storage is empty or missing', () => {
    assert.equal(isDebugUnlimitedStudy(memoryStorage()), false);
    assert.equal(isDebugUnlimitedStudy(null), false);
  });

  it('persists on and off in storage', () => {
    const storage = memoryStorage();
    setDebugUnlimitedStudy(true, storage);
    assert.equal(storage.getItem(DEBUG_UNLIMITED_STUDY_KEY), '1');
    assert.equal(isDebugUnlimitedStudy(storage), true);
    setDebugUnlimitedStudy(false, storage);
    assert.equal(storage.getItem(DEBUG_UNLIMITED_STUDY_KEY), null);
    assert.equal(isDebugUnlimitedStudy(storage), false);
  });
});
