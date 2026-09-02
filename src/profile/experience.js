const BARRIERS = [28, 40, 50, 60, 70, 80, 90, 100];
const OTHER_LEVEL_BARRIER = 110;

export function getLevelAndPercentage(exp) {
  let remaining = Math.max(0, Number(exp) || 0);
  let level = 1;
  for (const barrier of BARRIERS) {
    if (remaining >= barrier) {
      remaining -= barrier;
      level += 1;
    } else {
      break;
    }
  }
  level += Math.floor(remaining / OTHER_LEVEL_BARRIER);
  const toNext = level <= BARRIERS.length
    ? BARRIERS[level - 1]
    : OTHER_LEVEL_BARRIER;
  const leftover = remaining % OTHER_LEVEL_BARRIER;
  const percentage = toNext > 0 ? leftover / toNext : 0;
  return { level, percentage: Math.min(1, Math.max(0, percentage)) };
}

export function formatJoinedDate(value, locale = 'en') {
  const date = toDate(value);
  if (!date) return '';
  const tag = locale === 'pt' ? 'pt-BR' : locale;
  return date.toLocaleDateString(tag, { month: 'long', year: 'numeric' });
}

export function formatStudiedTime(seconds) {
  const secs = Math.max(0, Number(seconds) || 0);
  if (secs < 60) return { primary: '0', unit: 'm' };
  const days = Math.floor(secs / 86400);
  let remaining = secs - days * 86400;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const parts = [];
  if (days > 0) parts.push({ primary: String(days), unit: 'd' });
  if (hours > 0) parts.push({ primary: String(hours), unit: 'h' });
  if (days <= 0 && minutes > 0) parts.push({ primary: String(minutes), unit: 'm' });
  if (parts.length === 0) return { primary: '0', unit: 'm' };
  return { parts };
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
