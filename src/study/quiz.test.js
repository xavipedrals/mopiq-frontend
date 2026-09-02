import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isUsableQuizCard,
  optionLetter,
  parseQuizQuery,
  percentageBand,
  pickQuizFlashcards,
  purifyQuestion,
  quizSourceCards,
} from './quiz.js';

describe('quizSourceCards', () => {
  it('drops empty and image-only text, and can keep studied cards only', () => {
    const cards = [
      { id: '1', question: 'Q', answer: 'A', state: 'NEW', reviewCount: 0 },
      { id: '2', question: '<img src="x">', answer: '', state: 'REVIEW', reviewCount: 3 },
      { id: '3', question: 'Hello', answer: 'World', state: 'REVIEW', reviewCount: 1 },
    ];
    assert.equal(isUsableQuizCard(cards[1]), false);
    assert.equal(quizSourceCards(cards, false).map((card) => card.id).join(','), '1,3');
    assert.equal(quizSourceCards(cards, true).map((card) => card.id).join(','), '3');
  });
});

describe('pickQuizFlashcards', () => {
  it('excludes used ids and strips html', () => {
    const cards = [
      { id: 'a', question: '<p>Front</p>', answer: '<p>Back</p>' },
      { id: 'b', question: 'B', answer: '2' },
    ];
    const picked = pickQuizFlashcards(cards, { excludeIds: ['a'], limit: 5 });
    assert.equal(picked.length, 1);
    assert.equal(picked[0].id, 'b');
    assert.equal(pickQuizFlashcards(cards, { limit: 5 })[0].front.includes('<'), false);
  });
});

describe('purifyQuestion', () => {
  it('maps letter answers and true/false', () => {
    const multi = purifyQuestion({
      id: 'q1',
      position: 0,
      question: {
        type: 'multiple_choice',
        question: 'Capital?',
        options: ['Madrid', 'Paris', 'Rome', 'Lisbon'],
        correct_answer: 'B',
        source_flashcard_ids: [12],
      },
    });
    assert.equal(multi.options.length, 4);
    assert.equal(multi.options[multi.correctIndex], 'Paris');

    const tf = purifyQuestion({
      id: 'q2',
      position: 1,
      question: {
        type: 'true_false',
        question: 'Water boils at 100C',
        correct_answer: true,
      },
    }, { trueLabel: 'True', falseLabel: 'False' });
    assert.equal(tf.options[0], 'True');
    assert.equal(tf.correctIndex, 0);
  });
});

describe('parseQuizQuery', () => {
  it('defaults and clamps like the iOS quiz sheet', () => {
    const parsed = parseQuizQuery({
      source: 'studied',
      count: '40',
      multi: '0',
      tf: '1',
      difficulty: 'hard',
    });
    assert.equal(parsed.source, 'studied');
    assert.equal(parsed.count, 40);
    assert.equal(parsed.multi, false);
    assert.equal(parsed.trueFalse, true);
    assert.equal(parsed.difficulty, 'hard');
    assert.equal(parseQuizQuery({ count: '3' }).count, 10);
    assert.equal(parseQuizQuery({ multi: '0', tf: '0' }).multi, true);
  });
});

describe('percentageBand', () => {
  it('matches the iOS result colour bands', () => {
    assert.equal(percentageBand(0), 'red');
    assert.equal(percentageBand(25), 'red');
    assert.equal(percentageBand(26), 'amber');
    assert.equal(percentageBand(50), 'amber');
    assert.equal(percentageBand(51), 'green');
    assert.equal(percentageBand(75), 'green');
    assert.equal(percentageBand(76), 'cyan');
    assert.equal(percentageBand(100), 'cyan');
  });
});

describe('optionLetter', () => {
  it('labels the first four options A to D', () => {
    assert.equal(optionLetter(0), 'A');
    assert.equal(optionLetter(3), 'D');
    assert.equal(optionLetter(4), '5');
  });
});
