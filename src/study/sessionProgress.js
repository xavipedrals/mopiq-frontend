export const GRADE_COLORS = {
  AGAIN: '#f87171',
  HARD: '#fbbf24',
  GOOD: '#a3e635',
  EASY: '#38bdf8',
};

const GRADE_POINTS = {
  EASY: 1,
  GOOD: 0.66,
  HARD: 0.33,
  AGAIN: 0,
};

export function emptyLast10() {
  return Array(10).fill(null);
}

export function currentSlotIndex(last10) {
  const index = last10.indexOf(null);
  return index === -1 ? 0 : index;
}

export function sessionGrade(answers) {
  if (!answers.length) return 0;
  const points = answers.reduce((sum, ease) => sum + (GRADE_POINTS[ease] || 0), 0);
  return Math.floor((points / answers.length) * 100);
}

export function gradeCounts(answers) {
  return {
    AGAIN: answers.filter((ease) => ease === 'AGAIN').length,
    HARD: answers.filter((ease) => ease === 'HARD').length,
    GOOD: answers.filter((ease) => ease === 'GOOD').length,
    EASY: answers.filter((ease) => ease === 'EASY').length,
  };
}

export function stackedPercents(answers, totalCards) {
  const total = Math.max(totalCards, answers.length, 1);
  const counts = gradeCounts(answers);
  return {
    again: counts.AGAIN / total,
    hard: (counts.AGAIN + counts.HARD) / total,
    good: (counts.AGAIN + counts.HARD + counts.GOOD) / total,
    easy: answers.length / total,
  };
}

export function formatStudyDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}

export function estimatedTimeLeft(elapsedSeconds, studiedCount, remainingCount) {
  if (studiedCount <= 0) return null;
  return (remainingCount * elapsedSeconds) / studiedCount;
}
