export const ANSWER_FEEDBACK_POSITIONS = ['top', 'bottom', 'hide'];
export const ANSWER_FEEDBACK_STORAGE_KEY = 'mopiqAnswerFeedbackPosition';
export const DEFAULT_ANSWER_FEEDBACK_POSITION = 'top';

export function normalizeAnswerFeedbackPosition(value) {
  return ANSWER_FEEDBACK_POSITIONS.includes(value) ? value : DEFAULT_ANSWER_FEEDBACK_POSITION;
}

export function hasLocalAnswerFeedbackPosition(storage) {
  try {
    return ANSWER_FEEDBACK_POSITIONS.includes(storage?.getItem?.(ANSWER_FEEDBACK_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function readAnswerFeedbackPosition(storage) {
  try {
    return normalizeAnswerFeedbackPosition(storage?.getItem?.(ANSWER_FEEDBACK_STORAGE_KEY));
  } catch {
    return DEFAULT_ANSWER_FEEDBACK_POSITION;
  }
}

export function writeAnswerFeedbackPosition(position, storage) {
  const next = normalizeAnswerFeedbackPosition(position);
  try {
    storage?.setItem?.(ANSWER_FEEDBACK_STORAGE_KEY, next);
  } catch {
    // Private browsing may disable storage.
  }
  return next;
}

export const STUDY_TIMER_STORAGE_KEY = 'ankiShowStudySessionTimer';

export function readShowStudyTimer(storage) {
  try {
    const raw = storage?.getItem?.(STUDY_TIMER_STORAGE_KEY);
    if (raw == null) return false;
    return raw === 'true' || raw === '1';
  } catch {
    return false;
  }
}

export function writeShowStudyTimer(show, storage) {
  const next = Boolean(show);
  try {
    storage?.setItem?.(STUDY_TIMER_STORAGE_KEY, next ? 'true' : 'false');
  } catch {
    // Private browsing may disable storage.
  }
  return next;
}

export function formatStudyTimer(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const ANSWER_FEEDBACK_GRADES = {
  AGAIN: { className: 'again', icon: 'x' },
  HARD: { className: 'hard', icon: 'down' },
  GOOD: { className: 'good', icon: 'up' },
  EASY: { className: 'easy', icon: 'check' },
};

export function answerFeedbackGrade(ease) {
  return ANSWER_FEEDBACK_GRADES[ease] || null;
}
