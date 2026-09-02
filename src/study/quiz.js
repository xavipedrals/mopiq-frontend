import { stripHtml } from './cardHtml.js';

const LETTER_INDEX = { a: 0, b: 1, c: 2, d: 3 };

export function isUsableQuizCard(card) {
  const front = stripHtml(card?.noteFields?.[0] || card?.question || '');
  const back = stripHtml(card?.noteFields?.[1] || card?.answer || '');
  return Boolean(front && back);
}

export function isStudiedCard(card) {
  return Boolean(card && (card.state !== 'NEW' || Number(card.reviewCount) > 0 || card.lastReviewedAt));
}

export function quizSourceCards(cards, studiedOnly) {
  return (cards || []).filter((card) => {
    if (!isUsableQuizCard(card)) return false;
    if (studiedOnly && !isStudiedCard(card)) return false;
    return true;
  });
}

export function pickQuizFlashcards(cards, { excludeIds = [], limit = 15 } = {}) {
  const excluded = new Set(excludeIds.map(String));
  const pool = cards.filter((card) => !excluded.has(String(card.id)));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, limit).map((card) => ({
    id: String(card.id),
    front: stripHtml(card.noteFields?.[0] || card.question || ''),
    back: stripHtml(card.noteFields?.[1] || card.answer || ''),
  }));
}

export function shuffleOptions(options, correctIndex) {
  const order = options.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    options: order.map((index) => options[index]),
    correctIndex: order.indexOf(correctIndex),
  };
}

function sourceIds(value) {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function multipleChoiceIndex(correctAnswer, options) {
  if (typeof correctAnswer === 'boolean') return correctAnswer ? 0 : 1;
  const raw = String(correctAnswer || '').trim();
  const letter = LETTER_INDEX[raw.toLowerCase()];
  if (letter != null) return letter;
  const match = options.findIndex((option) => option === raw);
  return match >= 0 ? match : 0;
}

export function purifyQuestion(row, labels = { trueLabel: 'True', falseLabel: 'False' }) {
  const content = row?.question && typeof row.question === 'object' ? row.question : {};
  const type = content.type === 'true_false' ? 'true_false' : 'multiple_choice';
  const text = String(content.question || '').trim();
  if (!text) return null;

  if (type === 'true_false') {
    const truthy = content.correct_answer === true
      || content.correct_answer === 'true'
      || String(content.correct_answer).toLowerCase() === 'a';
    return {
      id: row.id,
      position: row.position || 0,
      type,
      question: text,
      options: [labels.trueLabel, labels.falseLabel],
      correctIndex: truthy ? 0 : 1,
      sourceFlashcardIds: sourceIds(content.source_flashcard_ids),
    };
  }

  const options = Array.isArray(content.options) ? content.options.map(String) : [];
  if (options.length < 2) return null;
  const correctIndex = multipleChoiceIndex(content.correct_answer, options);
  const shuffled = shuffleOptions(options, correctIndex);
  return {
    id: row.id,
    position: row.position || 0,
    type,
    question: text,
    options: shuffled.options,
    correctIndex: shuffled.correctIndex,
    sourceFlashcardIds: sourceIds(content.source_flashcard_ids),
  };
}

export function purifyQuestions(rows, labels) {
  return (rows || []).map((row) => purifyQuestion(row, labels)).filter(Boolean);
}

export function resultCopy(percentage, t) {
  if (percentage >= 81) {
    return { title: t('quiz.resultGoodTitle'), body: t('quiz.resultGoodBody') };
  }
  if (percentage >= 51) {
    return { title: t('quiz.resultOkTitle'), body: t('quiz.resultOkBody') };
  }
  return { title: t('quiz.resultBadTitle'), body: t('quiz.resultBadBody') };
}

export function percentageBand(percentage) {
  const value = Number(percentage) || 0;
  if (value < 26) return 'red';
  if (value < 51) return 'amber';
  if (value < 76) return 'green';
  return 'cyan';
}

export function optionLetter(index) {
  return ['A', 'B', 'C', 'D'][index] || String(index + 1);
}

export function formatQuizTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function usedSourceIds(questions) {
  return (questions || []).flatMap((question) => question.sourceFlashcardIds || []);
}

export function parseQuizQuery(query = {}) {
  const multi = query.multi !== '0';
  const trueFalse = query.tf === '1';
  return {
    source: query.source === 'studied' ? 'studied' : 'all',
    count: Math.min(1000, Math.max(10, Number(query.count) || 10)),
    multi: multi || !trueFalse,
    trueFalse,
    difficulty: ['easy', 'medium', 'hard'].includes(query.difficulty) ? query.difficulty : 'medium',
  };
}
