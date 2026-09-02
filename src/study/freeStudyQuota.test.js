import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyQuota, FREE_CARD_DAILY_LIMIT, isDailyLimitReached } from './freeStudyQuota.js';

describe('applyQuota', () => {
  it('takes the max of local and server used for the same Anki day', () => {
    const applied = applyQuota(5, {
      unlimited: false,
      used: 27,
      limit: 30,
      remaining: 3,
      studyDay: '2026-09-01',
    }, '2026-09-01');
    assert.equal(applied.used, 27);
    assert.equal(applied.remaining, 3);
    assert.equal(applied.unlimited, false);
  });

  it('ignores server used when studyDay does not match the local Anki day', () => {
    const applied = applyQuota(4, {
      unlimited: false,
      used: 30,
      limit: 30,
      remaining: 0,
      studyDay: '1999-01-01',
    }, '2026-09-01');
    assert.equal(applied.used, 4);
    assert.equal(applied.remaining, FREE_CARD_DAILY_LIMIT - 4);
  });

  it('treats premium as unlimited', () => {
    const applied = applyQuota(40, {
      unlimited: true,
      used: 0,
      limit: 30,
      remaining: null,
      studyDay: '2026-09-01',
    }, '2026-09-01');
    assert.equal(applied.unlimited, true);
    assert.equal(applied.remaining, Infinity);
  });
});

describe('isDailyLimitReached', () => {
  it('blocks free users at the daily cap', () => {
    assert.equal(isDailyLimitReached({
      unlimited: false,
      used: 30,
      limit: 30,
      remaining: 0,
      studyDay: '2026-09-01',
    }, '2026-09-01'), true);
  });

  it('does not block premium or users with remaining cards', () => {
    assert.equal(isDailyLimitReached({
      unlimited: true,
      used: 0,
      limit: 30,
      remaining: null,
      studyDay: '2026-09-01',
    }, '2026-09-01', 40), false);
    assert.equal(isDailyLimitReached({
      unlimited: false,
      used: 12,
      limit: 30,
      remaining: 18,
      studyDay: '2026-09-01',
    }, '2026-09-01'), false);
  });
});
