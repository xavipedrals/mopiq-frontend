import { applyAnswer, previewIntervals } from './scheduler.js';
function earlyLearning(card, now) {
  return ['LEARNING','RELEARNING'].includes(card.state) && new Date(card.dueDate).getTime() > now.getTime();
}
function againInterval(card, config) {
  return card.state === 'RELEARNING' ? (config.relearningStepsInSecs[0] ?? config.minIntervalSecs) : (config.learningStepsInSecs[0] ?? config.graduatingIntervalSecs);
}
export function applyFilteredAnswer(card, answer, config, now = new Date()) {
  if (!earlyLearning(card, now)) return applyAnswer(card, answer, config);
  const next = { ...card, reviewCount: (card.reviewCount || 0) + 1 };
  if (answer === 'AGAIN') {
    next.intervalSecs = againInterval(card, config);
    next.dueDate = new Date(now.getTime() + next.intervalSecs * 1000);
  }
  return next;
}
export function filteredPreviewIntervals(card, config, now = new Date()) {
  if (!earlyLearning(card, now)) return previewIntervals(card, config);
  const remaining = Math.max(0, Math.trunc((new Date(card.dueDate).getTime() - now.getTime()) / 1000));
  return { AGAIN: againInterval(card, config), HARD: remaining, GOOD: remaining, EASY: remaining };
}
