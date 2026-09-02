import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { durationParts, gaugeProgress, histogramShares, shortDate } from './deckStats.js';

describe('gaugeProgress', () => {
  it('matches the iOS dashboard ring, including the 1% floor', () => {
    assert.equal(gaugeProgress({ cardsForToday: 30, cardsStudiedToday: 10 }), 0.25);
    assert.equal(gaugeProgress({ cardsForToday: 0, cardsStudiedToday: 12 }), 1);
    assert.equal(gaugeProgress({ cardsForToday: 20, cardsStudiedToday: 0 }), 0.01);
    assert.equal(gaugeProgress({ cardsForToday: 0, cardsStudiedToday: 0 }), 0.01);
    assert.equal(gaugeProgress(), 0.01);
  });

  it('ignores negative and unparseable counts', () => {
    assert.equal(gaugeProgress({ cardsForToday: -5, cardsStudiedToday: 'x' }), 0.01);
  });
});

describe('histogramShares', () => {
  it('gives each grade its own share of the answer log', () => {
    const shares = histogramShares({ AGAIN: 10, HARD: 10, GOOD: 20, EASY: 60 });
    assert.equal(shares.again, 0.1);
    assert.equal(shares.hard, 0.1);
    assert.equal(shares.good, 0.2);
    assert.equal(shares.easy, 0.6);
    assert.equal(shares.total, 100);
  });

  it('collapses to zero width with no reviews', () => {
    assert.deepEqual(histogramShares({}), { again: 0, hard: 0, good: 0, easy: 0, total: 0 });
  });
});

describe('durationParts', () => {
  it('drops seconds once there is an hour, and keeps minutes at zero otherwise', () => {
    assert.deepEqual(durationParts(3600_000), [{ value: 1, unit: 'h' }]);
    assert.deepEqual(durationParts(5_460_000), [{ value: 1, unit: 'h' }, { value: 31, unit: 'm' }]);
    assert.deepEqual(durationParts(125_000), [{ value: 2, unit: 'm' }, { value: 5, unit: 's' }]);
    assert.deepEqual(durationParts(120_000), [{ value: 2, unit: 'm' }]);
    assert.deepEqual(durationParts(0), [{ value: 0, unit: 'm' }]);
    assert.deepEqual(durationParts(null), [{ value: 0, unit: 'm' }]);
  });
});

describe('shortDate', () => {
  it('formats a month and day, and stays empty without a date', () => {
    assert.equal(shortDate('2026-03-09T10:00:00Z', 'en-US'), 'Mar 9');
    assert.equal(shortDate(null), '');
  });
});
