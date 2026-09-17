import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  answerFeedbackGrade,
  formatStudyTimer,
  hasLocalAnswerFeedbackPosition,
  normalizeAnswerFeedbackPosition,
  readAnswerFeedbackPosition,
  readShowStudyTimer,
  writeAnswerFeedbackPosition,
  writeShowStudyTimer,
} from './answerFeedback.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
  };
}

describe('answer feedback position', () => {
  it('defaults to top and ignores unknown values', () => {
    const storage = memoryStorage();
    assert.equal(readAnswerFeedbackPosition(storage), 'top');
    assert.equal(hasLocalAnswerFeedbackPosition(storage), false);
    assert.equal(normalizeAnswerFeedbackPosition('sideways'), 'top');
    assert.equal(writeAnswerFeedbackPosition('bottom', storage), 'bottom');
    assert.equal(readAnswerFeedbackPosition(storage), 'bottom');
    assert.equal(hasLocalAnswerFeedbackPosition(storage), true);
  });
});

describe('study timer preference', () => {
  it('is off until the user turns it on', () => {
    const storage = memoryStorage();
    assert.equal(readShowStudyTimer(storage), false);
    assert.equal(writeShowStudyTimer(true, storage), true);
    assert.equal(readShowStudyTimer(storage), true);
  });

  it('formats elapsed time like iOS mm:ss', () => {
    assert.equal(formatStudyTimer(0), '00:00');
    assert.equal(formatStudyTimer(75), '01:15');
    assert.equal(formatStudyTimer(3600), '60:00');
  });
});

describe('answerFeedbackGrade', () => {
  it('maps study grades to toast styles', () => {
    assert.equal(answerFeedbackGrade('EASY').className, 'easy');
    assert.equal(answerFeedbackGrade('AGAIN').icon, 'x');
    assert.equal(answerFeedbackGrade('nope'), null);
  });
});
