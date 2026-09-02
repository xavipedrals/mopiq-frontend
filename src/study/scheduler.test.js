import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ANSWERS, STATES, applyAnswer, previewIntervals } from './scheduler.js';

// Same defaults as AnkiTests/{Learning,Review,Lapsed}CardStatusTest.swift
function iosConfig(overrides = {}) {
  return {
    newCardsPerDay: 20,
    maxReviewsPerDay: 20,
    learningStepsInSecs: [60, 600],
    graduatingIntervalSecs: 86400,
    easyIntervalSecs: 4 * 86400,
    defaultEaseFactor: 2500,
    displayNewCardsInOrder: true,
    hardFactor: 1.2,
    intervalModifier: 1,
    maxIntervalDays: 180,
    easyBonus: 1.3,
    leechFails: 8,
    leechAction: 1,
    minIntervalSecs: 86400,
    relearningStepsInSecs: [600],
    rehabilitationIntervalMultiplier: 0,
    ...overrides,
  };
}

function newCard(extra = {}) {
  return {
    id: 0,
    state: STATES.NEW,
    intervalSecs: 0,
    easeFactor: 2500,
    reviewCount: 0,
    lapseCount: 0,
    ...extra,
  };
}

function reviewCard(extra = {}) {
  return {
    id: 0,
    state: STATES.REVIEW,
    intervalSecs: 86400,
    easeFactor: 2500,
    reviewCount: 0,
    lapseCount: 0,
    ...extra,
  };
}

function relearningCard(extra = {}) {
  return {
    id: 0,
    state: STATES.RELEARNING,
    intervalSecs: 0,
    easeFactor: 2500,
    reviewCount: 0,
    lapseCount: 1,
    intervalSecsBeforeLapse: 30 * 86400,
    ...extra,
  };
}

function iosInt(value) {
  return Math.trunc(value);
}

function assertDueMatchesInterval(card, beforeMs) {
  const due = new Date(card.dueDate).getTime();
  const expected = beforeMs + card.intervalSecs * 1000;
  assert.ok(
    Math.abs(due - expected) < 5000,
    `due ${due} should be within 5s of now+interval ${expected}`
  );
}

describe('learning (iOS LearningCardStatusTest)', () => {
  it('Easy graduates at the easy interval with the default ease', () => {
    const config = iosConfig();
    const before = Date.now();
    const updated = applyAnswer(newCard(), ANSWERS.EASY, config);
    assert.equal(updated.intervalSecs, 4 * 86400);
    assert.equal(updated.state, STATES.REVIEW);
    assert.equal(updated.easeFactor, 2500);
    assertDueMatchesInterval(updated, before);
  });

  it('Good walks 10 minutes, then graduates at 1 day', () => {
    const config = iosConfig();
    const first = applyAnswer(newCard(), ANSWERS.GOOD, config);
    assert.equal(first.intervalSecs, 600);
    assert.equal(first.state, STATES.LEARNING);

    const second = applyAnswer(first, ANSWERS.GOOD, config);
    assert.equal(second.intervalSecs, 86400);
    assert.equal(second.state, STATES.REVIEW);
    assert.equal(second.easeFactor, 2500);
  });

  it('Good with extra learning steps matches iOS step-by-step times', () => {
    const config = iosConfig({
      learningStepsInSecs: [15 * 60, 1440 * 60, 4320 * 60],
      graduatingIntervalSecs: 5 * 86400,
      easyIntervalSecs: 6 * 86400,
    });
    const first = applyAnswer(newCard(), ANSWERS.GOOD, config);
    assert.equal(first.intervalSecs, 1440 * 60);
    assert.equal(first.state, STATES.LEARNING);

    const second = applyAnswer(first, ANSWERS.GOOD, config);
    assert.equal(second.intervalSecs, 4320 * 60);
    assert.equal(second.state, STATES.LEARNING);

    const third = applyAnswer(second, ANSWERS.GOOD, config);
    assert.equal(third.intervalSecs, 5 * 86400);
    assert.equal(third.state, STATES.REVIEW);
  });

  it('Hard averages the current and next learning steps', () => {
    const config = iosConfig({
      learningStepsInSecs: [15 * 60, 1440 * 60, 4320 * 60],
      graduatingIntervalSecs: 5 * 86400,
      easyIntervalSecs: 6 * 86400,
    });
    const first = applyAnswer(newCard(), ANSWERS.HARD, config);
    assert.equal(first.intervalSecs, iosInt((15 * 60 + 1440 * 60) / 2));
    assert.equal(first.state, STATES.LEARNING);

    const afterGood = applyAnswer(first, ANSWERS.GOOD, config);
    const hardAgain = applyAnswer(afterGood, ANSWERS.HARD, config);
    assert.equal(hardAgain.intervalSecs, iosInt((1440 * 60 + 4320 * 60) / 2));
    assert.equal(hardAgain.state, STATES.LEARNING);
  });

  it('Again always returns the first learning step', () => {
    const config = iosConfig({
      learningStepsInSecs: [15 * 60, 1440 * 60, 4320 * 60],
      graduatingIntervalSecs: 5 * 86400,
      easyIntervalSecs: 6 * 86400,
    });
    const first = applyAnswer(newCard(), ANSWERS.AGAIN, config);
    assert.equal(first.intervalSecs, 15 * 60);
    assert.equal(first.state, STATES.LEARNING);

    const later = applyAnswer(
      applyAnswer(applyAnswer(first, ANSWERS.GOOD, config), ANSWERS.GOOD, config),
      ANSWERS.AGAIN,
      config
    );
    assert.equal(later.intervalSecs, 15 * 60);
    assert.equal(later.state, STATES.LEARNING);
  });

  it('preview times match the intervals that will actually be applied', () => {
    const config = iosConfig();
    const card = newCard();
    const preview = previewIntervals(card, config);
    for (const ease of Object.values(ANSWERS)) {
      assert.equal(preview[ease], applyAnswer(card, ease, config).intervalSecs);
    }
  });
});

describe('review (iOS ReviewCardStatusTest)', () => {
  it('Again lapses to the first relearning step and drops ease by 200', () => {
    const config = iosConfig();
    const card = reviewCard();
    const updated = applyAnswer(card, ANSWERS.AGAIN, config);
    assert.equal(updated.intervalSecs, 600);
    assert.equal(updated.state, STATES.RELEARNING);
    assert.equal(updated.easeFactor, 2300);
    assert.equal(updated.lapseCount, 1);
    assert.equal(updated.intervalSecsBeforeLapse, 86400);
  });

  it('Hard is interval × 1.2 and drops ease by 150', () => {
    const config = iosConfig();
    const card = reviewCard();
    const updated = applyAnswer(card, ANSWERS.HARD, config);
    assert.equal(updated.intervalSecs, iosInt(86400 * 1.2 * 1));
    assert.equal(updated.intervalSecs, 103680);
    assert.equal(updated.state, STATES.REVIEW);
    assert.equal(updated.easeFactor, 2350);
  });

  it('Good is interval × current ease, ease unchanged', () => {
    const config = iosConfig();
    const card = reviewCard();
    const updated = applyAnswer(card, ANSWERS.GOOD, config);
    assert.equal(updated.intervalSecs, iosInt(86400 * 2.5 * 1));
    assert.equal(updated.intervalSecs, 216000);
    assert.equal(updated.state, STATES.REVIEW);
    assert.equal(updated.easeFactor, 2500);
  });

  it('Easy bumps ease first, then interval × new ease × easy bonus (iOS update)', () => {
    const config = iosConfig();
    const card = reviewCard();
    const updated = applyAnswer(card, ANSWERS.EASY, config);
    const afterEase = 2.6;
    assert.equal(updated.easeFactor, 2600);
    assert.equal(updated.intervalSecs, iosInt(86400 * afterEase * 1 * 1.3));
    assert.equal(updated.intervalSecs, 292032);
    assert.equal(updated.state, STATES.REVIEW);
  });

  it('Easy preview uses the current ease, like iOS button estimates', () => {
    const config = iosConfig();
    const card = reviewCard();
    const preview = previewIntervals(card, config);
    assert.equal(preview.EASY, iosInt(86400 * 2.5 * 1 * 1.3));
    assert.equal(preview.EASY, 280800);
    assert.notEqual(preview.EASY, applyAnswer(card, ANSWERS.EASY, config).intervalSecs);
    assert.equal(preview.AGAIN, 600);
    assert.equal(preview.HARD, 103680);
    assert.equal(preview.GOOD, 216000);
  });

  it('Hard → Good → Easy → Again matches iOS testMultiSteps seconds', () => {
    const config = iosConfig();
    let card = reviewCard();
    let ease = 2500;

    card = applyAnswer(card, ANSWERS.HARD, config);
    ease -= 150;
    const first = iosInt(86400 * 1.2 * 1);
    assert.equal(card.intervalSecs, first);
    assert.equal(card.easeFactor, ease);

    card = applyAnswer(card, ANSWERS.GOOD, config);
    const second = iosInt(first * (ease / 1000) * 1);
    assert.equal(card.intervalSecs, second);
    assert.equal(card.easeFactor, ease);

    card = applyAnswer(card, ANSWERS.EASY, config);
    ease += 100;
    const third = iosInt(second * (ease / 1000) * 1.3 * 1);
    assert.equal(card.intervalSecs, third);
    assert.equal(card.easeFactor, ease);

    card = applyAnswer(card, ANSWERS.AGAIN, config);
    ease -= 200;
    assert.equal(card.intervalSecs, 600);
    assert.equal(card.state, STATES.RELEARNING);
    assert.equal(card.easeFactor, ease);
    assert.equal(card.lapseCount, 1);
  });

  it('caps Good/Easy at maxIntervalDays', () => {
    const config = iosConfig({ maxIntervalDays: 180 });
    const card = reviewCard({ intervalSecs: 100 * 86400, easeFactor: 2500 });
    const maxSecs = 180 * 86400;
    assert.equal(applyAnswer(card, ANSWERS.GOOD, config).intervalSecs, maxSecs);
    assert.equal(applyAnswer(card, ANSWERS.EASY, config).intervalSecs, maxSecs);
    assert.equal(applyAnswer(card, ANSWERS.HARD, config).intervalSecs, iosInt(100 * 86400 * 1.2));
  });
});

describe('relearning (iOS LapsedCardStatusTest)', () => {
  const twoStep = (overrides = {}) => iosConfig({ relearningStepsInSecs: [600, 3600], ...overrides });

  it('Easy uses min interval when rehabilitation is 0', () => {
    const config = twoStep();
    const updated = applyAnswer(relearningCard(), ANSWERS.EASY, config);
    assert.equal(updated.intervalSecs, 86400);
    assert.equal(updated.state, STATES.REVIEW);
    assert.equal(updated.easeFactor, 2650);
  });

  it('Easy uses last interval × rehabilitation multiplier when that is larger', () => {
    const config = twoStep({ rehabilitationIntervalMultiplier: 0.1 });
    const last = 30 * 86400;
    const updated = applyAnswer(
      relearningCard({ intervalSecs: last }),
      ANSWERS.EASY,
      config
    );
    assert.equal(updated.intervalSecs, iosInt(last * 0.1));
    assert.equal(updated.intervalSecs, 259200);
    assert.equal(updated.state, STATES.REVIEW);
    assert.equal(updated.easeFactor, 2650);
  });

  it('Good walks the next relearning step, then graduates at the Easy interval', () => {
    const config = twoStep();
    const first = applyAnswer(relearningCard(), ANSWERS.GOOD, config);
    assert.equal(first.intervalSecs, 3600);
    assert.equal(first.state, STATES.RELEARNING);
    assert.equal(first.easeFactor, 2500);

    const second = applyAnswer(first, ANSWERS.GOOD, config);
    assert.equal(second.intervalSecs, 86400);
    assert.equal(second.state, STATES.REVIEW);
  });

  it('Hard averages the current and next relearning steps', () => {
    const config = twoStep();
    const updated = applyAnswer(relearningCard(), ANSWERS.HARD, config);
    assert.equal(updated.intervalSecs, iosInt((600 + 3600) / 2));
    assert.equal(updated.intervalSecs, 2100);
    assert.equal(updated.state, STATES.RELEARNING);
    assert.equal(updated.easeFactor, 2350);
  });

  it('Again returns the first relearning step and drops ease by 200', () => {
    const config = twoStep();
    const updated = applyAnswer(relearningCard(), ANSWERS.AGAIN, config);
    assert.equal(updated.intervalSecs, 600);
    assert.equal(updated.state, STATES.RELEARNING);
    assert.equal(updated.easeFactor, 2300);
  });
});
