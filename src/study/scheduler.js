const STATES = {
  NEW: 'NEW',
  LEARNING: 'LEARNING',
  REVIEW: 'REVIEW',
  RELEARNING: 'RELEARNING',
};

export const ANSWERS = {
  AGAIN: 'AGAIN',
  HARD: 'HARD',
  GOOD: 'GOOD',
  EASY: 'EASY',
};

function cloneCard(card) {
  return { ...card };
}

function setDue(card) {
  const next = cloneCard(card);
  if (next.state === STATES.NEW) return next;
  next.dueDate = new Date(Date.now() + next.intervalSecs * 1000);
  return next;
}

function capInterval(intervalSecs, config) {
  const max = config.maxIntervalDays * 86400;
  return intervalSecs > max ? max : intervalSecs;
}

function applyEaseDelta(easeFactor, delta, easyCap) {
  let next = easeFactor + delta;
  if (delta > 0 && easyCap && next > easyCap) next = easyCap;
  return next < 1300 ? 1300 : next;
}

function firstIndexOf(list, value) {
  const idx = list.indexOf(value);
  return idx >= 0 ? idx : null;
}

// Swift `Int(Double * …)` truncates toward zero.
function iosInt(value) {
  return Math.trunc(value);
}

function learningAgainInterval(config) {
  return config.learningStepsInSecs[0];
}

function learningHardInterval(card, config) {
  const steps = config.learningStepsInSecs;
  const i = firstIndexOf(steps, card.intervalSecs) ?? 0;
  if (i + 1 >= steps.length) return steps[i];
  return iosInt((steps[i] + steps[i + 1]) / 2);
}

function learningGoodInterval(card, config) {
  const steps = config.learningStepsInSecs;
  const i = firstIndexOf(steps, card.intervalSecs);
  if (i == null) return steps[Math.min(1, steps.length - 1)];
  if (i >= steps.length - 1) return config.graduatingIntervalSecs;
  return steps[i + 1];
}

function learningEasyInterval(config) {
  return config.easyIntervalSecs;
}

function reviewAgainInterval(config) {
  return config.relearningStepsInSecs[0];
}

function reviewHardInterval(card, config) {
  return capInterval(
    iosInt(card.intervalSecs * config.hardFactor * config.intervalModifier),
    config
  );
}

function reviewGoodInterval(card, config) {
  const ease = (card.easeFactor || config.defaultEaseFactor) / 1000;
  return capInterval(
    iosInt(card.intervalSecs * ease * config.intervalModifier),
    config
  );
}

function reviewEasyInterval(card, config) {
  const ease = (card.easeFactor || config.defaultEaseFactor) / 1000;
  return capInterval(
    iosInt(card.intervalSecs * ease * config.intervalModifier * config.easyBonus),
    config
  );
}

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Matches iOS CalendarHelper / web ankiDay.js (day starts at 04:00).
const ANKI_DAY_STARTS_AT_HOUR = 4;

function ankiDayStart(date = new Date()) {
  const supposed = startOfLocalDay(date);
  supposed.setHours(supposed.getHours() + ANKI_DAY_STARTS_AT_HOUR);
  if (supposed <= date) return supposed;
  return new Date(supposed.getTime() - 24 * 3600 * 1000);
}

function isReviewDueTodayOrOverdue(card, now = new Date()) {
  if (card.dueDate == null) return true;
  const due = new Date(card.dueDate);
  if (Number.isNaN(due.getTime())) return true;
  return ankiDayStart(due).getTime() <= ankiDayStart(now).getTime();
}

function remainingSecondsUntilDue(card, now = new Date()) {
  if (card.dueDate == null) return 0;
  const due = new Date(card.dueDate).getTime();
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.trunc((due - now.getTime()) / 1000));
}

function hardWouldPostpone(card, config, now = new Date()) {
  const hardDue = now.getTime() + reviewHardInterval(card, config) * 1000;
  const currentDue = card.dueDate ? new Date(card.dueDate).getTime() : now.getTime();
  return hardDue >= currentDue;
}

function reviewEaseAfter(card, answer, config) {
  const current = card.easeFactor || config.defaultEaseFactor;
  switch (answer) {
    case ANSWERS.AGAIN:
      return applyEaseDelta(current, -200);
    case ANSWERS.HARD:
      return applyEaseDelta(current, -150);
    case ANSWERS.EASY:
      return applyEaseDelta(current, 100, 3500);
    default:
      return current;
  }
}

function easyLapseInterval(card, config) {
  const last = card.intervalSecsBeforeLapse;
  if (last == null) return config.minIntervalSecs;
  const next = last * config.rehabilitationIntervalMultiplier;
  return next < config.minIntervalSecs ? config.minIntervalSecs : iosInt(next);
}

function relearningAgainInterval(config) {
  return config.relearningStepsInSecs[0];
}

function relearningHardInterval(card, config) {
  const steps = config.relearningStepsInSecs;
  const i = firstIndexOf(steps, card.intervalSecs) ?? 0;
  if (i - 1 < steps.length && i + 1 < steps.length) {
    return iosInt((steps[i] + steps[i + 1]) / 2);
  }
  return steps[i];
}

function relearningGoodInterval(card, config) {
  const steps = config.relearningStepsInSecs;
  const i = firstIndexOf(steps, card.intervalSecs);
  if (i == null) return steps[steps.length > 1 ? 1 : 0];
  if (i >= steps.length - 1) return easyLapseInterval(card, config);
  return steps[i + 1];
}

function updateLearning(card, answer, config) {
  let next = cloneCard(card);
  switch (answer) {
    case ANSWERS.AGAIN:
      next.intervalSecs = learningAgainInterval(config);
      next.state = STATES.LEARNING;
      break;
    case ANSWERS.HARD:
      next.intervalSecs = learningHardInterval(next, config);
      next.state = STATES.LEARNING;
      break;
    case ANSWERS.GOOD:
      next.intervalSecs = learningGoodInterval(next, config);
      next.state = STATES.LEARNING;
      if (next.intervalSecs === config.graduatingIntervalSecs) {
        next.state = STATES.REVIEW;
        next.easeFactor = config.defaultEaseFactor;
      }
      break;
    case ANSWERS.EASY:
      next.intervalSecs = learningEasyInterval(config);
      next.state = STATES.REVIEW;
      next.easeFactor = config.defaultEaseFactor;
      break;
    default:
      break;
  }
  next = setDue(next);
  next.reviewCount = (next.reviewCount || 0) + 1;
  return next;
}

function applyOffScheduleHard(card, config, now = new Date()) {
  const next = cloneCard(card);
  next.easeFactor = reviewEaseAfter(next, ANSWERS.HARD, config);
  next.state = STATES.REVIEW;
  next.reviewCount = (next.reviewCount || 0) + 1;
  if (hardWouldPostpone(card, config, now)) {
    return next;
  }
  next.intervalSecs = reviewHardInterval(card, config);
  return setDue(next);
}

function updateReview(card, answer, config, now = new Date()) {
  const offSchedule = !isReviewDueTodayOrOverdue(card, now);
  if (offSchedule && (answer === ANSWERS.GOOD || answer === ANSWERS.EASY)) {
    const next = cloneCard(card);
    next.state = STATES.REVIEW;
    next.reviewCount = (next.reviewCount || 0) + 1;
    return next;
  }
  if (offSchedule && answer === ANSWERS.HARD) {
    return applyOffScheduleHard(card, config, now);
  }

  let next = cloneCard(card);
  // iOS ReviewCardStatus.update applies the new ease factor before the interval.
  next.easeFactor = reviewEaseAfter(next, answer, config);
  switch (answer) {
    case ANSWERS.AGAIN:
      next.intervalSecsBeforeLapse = card.intervalSecs;
      next.intervalSecs = reviewAgainInterval(config);
      next.state = STATES.RELEARNING;
      next.lapseCount = (next.lapseCount || 0) + 1;
      if (next.lapseCount >= config.leechFails) {
        next.suspended = config.leechAction === 0;
      }
      break;
    case ANSWERS.HARD:
      next.intervalSecs = reviewHardInterval(card, config);
      next.state = STATES.REVIEW;
      break;
    case ANSWERS.GOOD:
      next.intervalSecs = reviewGoodInterval(card, config);
      next.state = STATES.REVIEW;
      break;
    case ANSWERS.EASY:
      next.intervalSecs = reviewEasyInterval(next, config);
      next.state = STATES.REVIEW;
      break;
    default:
      break;
  }
  next.reviewCount = (next.reviewCount || 0) + 1;
  return setDue(next);
}

function relearningEaseAfter(card, answer, config) {
  const current = card.easeFactor || config.defaultEaseFactor;
  switch (answer) {
    case ANSWERS.AGAIN:
      return applyEaseDelta(current, -200);
    case ANSWERS.HARD:
      return applyEaseDelta(current, -150);
    case ANSWERS.EASY:
      return applyEaseDelta(current, 150);
    default:
      return current;
  }
}

function updateRelearning(card, answer, config) {
  let next = cloneCard(card);
  next.easeFactor = relearningEaseAfter(next, answer, config);
  switch (answer) {
    case ANSWERS.AGAIN:
      next.intervalSecs = relearningAgainInterval(config);
      next.state = STATES.RELEARNING;
      next.lapseCount = (next.lapseCount || 0) + 1;
      break;
    case ANSWERS.HARD:
      next.intervalSecs = relearningHardInterval(card, config);
      next.state = STATES.RELEARNING;
      break;
    case ANSWERS.GOOD: {
      const interval = relearningGoodInterval(card, config);
      next.intervalSecs = interval;
      next.state = interval === easyLapseInterval(card, config) ? STATES.REVIEW : STATES.RELEARNING;
      break;
    }
    case ANSWERS.EASY:
      next.intervalSecs = easyLapseInterval(card, config);
      next.state = STATES.REVIEW;
      break;
    default:
      break;
  }
  next.reviewCount = (next.reviewCount || 0) + 1;
  return setDue(next);
}

export function applyAnswer(card, answer, config) {
  const state = card.state || STATES.NEW;
  if (state === STATES.NEW || state === STATES.LEARNING) {
    return updateLearning(card, answer, config);
  }
  if (state === STATES.REVIEW) {
    return updateReview(card, answer, config);
  }
  return updateRelearning(card, answer, config);
}

// Matches iOS CardStatusExtra.getTimeEstimatesInSecs — no ease-factor side effects.
export function previewIntervals(card, config) {
  const state = card.state || STATES.NEW;
  if (state === STATES.NEW || state === STATES.LEARNING) {
    return {
      [ANSWERS.AGAIN]: learningAgainInterval(config),
      [ANSWERS.HARD]: learningHardInterval(card, config),
      [ANSWERS.GOOD]: learningGoodInterval(card, config),
      [ANSWERS.EASY]: learningEasyInterval(config),
    };
  }
  if (state === STATES.REVIEW) {
    if (!isReviewDueTodayOrOverdue(card)) {
      const remaining = remainingSecondsUntilDue(card);
      return {
        [ANSWERS.AGAIN]: reviewAgainInterval(config),
        [ANSWERS.HARD]: hardWouldPostpone(card, config) ? remaining : reviewHardInterval(card, config),
        [ANSWERS.GOOD]: remaining,
        [ANSWERS.EASY]: remaining,
      };
    }
    return {
      [ANSWERS.AGAIN]: reviewAgainInterval(config),
      [ANSWERS.HARD]: reviewHardInterval(card, config),
      [ANSWERS.GOOD]: reviewGoodInterval(card, config),
      [ANSWERS.EASY]: reviewEasyInterval(card, config),
    };
  }
  return {
    [ANSWERS.AGAIN]: relearningAgainInterval(config),
    [ANSWERS.HARD]: relearningHardInterval(card, config),
    [ANSWERS.GOOD]: relearningGoodInterval(card, config),
    [ANSWERS.EASY]: easyLapseInterval(card, config),
  };
}

export function formatInterval(seconds) {
  if (seconds < 60) return '< 1 min';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600);
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const days = Math.round(seconds / 86400);
  if (days < 30) return days === 1 ? '1 day' : `${days} days`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? '1 month' : `${months} months`;
  const years = Math.round(days / 365);
  return years === 1 ? '1 year' : `${years} years`;
}

export { STATES };
