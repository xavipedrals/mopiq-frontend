import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { amountFromLowestUnit, yearlyMonthlyEquivalent, yearlySavingsPercent } from './money.js';

describe('amountFromLowestUnit', () => {
  it('treats JPY, KRW and CLP as whole units', () => {
    assert.equal(amountFromLowestUnit('1200', 'JPY'), 1200);
    assert.equal(amountFromLowestUnit('1200', 'KRW'), 1200);
    assert.equal(amountFromLowestUnit('1200', 'CLP'), 1200);
  });

  it('divides other currencies by 100', () => {
    assert.equal(amountFromLowestUnit('2999', 'USD'), 29.99);
    assert.equal(amountFromLowestUnit('2999', 'EUR'), 29.99);
  });
});

describe('yearly pricing display', () => {
  it('shows the yearly price as a per-month equivalent', () => {
    assert.equal(yearlyMonthlyEquivalent('2999', 'USD', 'en-US'), '$2.50');
  });

  it('does not invent a monthly price from a zero trial total', () => {
    assert.equal(yearlyMonthlyEquivalent('0', 'USD', 'en-US'), '');
  });

  it('rounds the savings against twelve monthly payments', () => {
    assert.equal(yearlySavingsPercent('599', '2999', 'USD'), 58);
  });

  it('hides the savings badge when yearly is not cheaper', () => {
    assert.equal(yearlySavingsPercent('599', '8000', 'USD'), null);
  });
});
