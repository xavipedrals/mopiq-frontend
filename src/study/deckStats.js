import { toDate } from '../profile/experience.js';

/**
 * Remaining new/review for the dashboard, matching get_user_deck_list_stats
 * once the cohort gate is off: min(daily allowance left, live unseen/due).
 */
export function todayStatsFromCounts({
  cardCount = 0,
  progressCount = 0,
  newStudiedToday = 0,
  rawDueCount = 0,
  newCardsPerDay = 20,
  maxReviewsPerDay = 200,
} = {}) {
  const cards = Math.max(0, Number(cardCount) || 0);
  const progress = Math.max(0, Number(progressCount) || 0);
  const newStudied = Math.max(0, Number(newStudiedToday) || 0);
  const rawDue = Math.max(0, Number(rawDueCount) || 0);
  const newCap = Math.max(0, Number(newCardsPerDay) || 0);
  const reviewCap = Math.max(0, Number(maxReviewsPerDay) || 0);
  const unseen = Math.max(0, cards - progress);
  const newRemainingToday = Math.min(Math.max(0, newCap - newStudied), unseen);
  const reviewDueToday = Math.min(reviewCap, rawDue);
  return {
    statsAvailable: true,
    newRemainingToday,
    reviewDueToday,
    cardsForToday: newRemainingToday + reviewDueToday,
  };
}

/** iOS StudyDashboardView.displayProgress: never render a truly empty ring. */
export function gaugeProgress({ cardsForToday = 0, cardsStudiedToday = 0 } = {}) {
  const forToday = Math.max(0, Number(cardsForToday) || 0);
  const studied = Math.max(0, Number(cardsStudiedToday) || 0);
  const total = forToday + studied;
  if (total <= 0) return 0.01;
  const progress = studied / total;
  return progress <= 0 ? 0.01 : Math.min(1, progress);
}

/** Each grade's own share of the answer log, for the segmented distribution bar. */
export function histogramShares(counts = {}) {
  const again = Math.max(0, Number(counts.AGAIN) || 0);
  const hard = Math.max(0, Number(counts.HARD) || 0);
  const good = Math.max(0, Number(counts.GOOD) || 0);
  const easy = Math.max(0, Number(counts.EASY) || 0);
  const total = again + hard + good + easy;
  if (total <= 0) return { again: 0, hard: 0, good: 0, easy: 0, total: 0 };
  return {
    again: again / total,
    hard: hard / total,
    good: good / total,
    easy: easy / total,
    total,
  };
}

/** iOS DeckStudyTimeCard: hours+minutes once an hour is reached, else minutes+seconds. */
export function durationParts(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    const parts = [{ value: hours, unit: 'h' }];
    if (minutes > 0) parts.push({ value: minutes, unit: 'm' });
    return parts;
  }
  const parts = [{ value: minutes, unit: 'm' }];
  if (seconds > 0) parts.push({ value: seconds, unit: 's' });
  return parts;
}

export function shortDate(value, localeTag = 'en') {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });
}
