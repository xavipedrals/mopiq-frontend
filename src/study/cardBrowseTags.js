const RECENT_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isNewBrowseCard(card) {
  if (!card) return true;
  const reviewCount = Number(card.reviewCount) || 0;
  const state = String(card.state || '').toUpperCase();
  return reviewCount === 0 || state === 'NEW' || !card.dueDate;
}

export function browseDueTag(card, now = new Date()) {
  if (isNewBrowseCard(card)) return null;
  const due = new Date(card.dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const today = startOfLocalDay(now);
  const dueDay = startOfLocalDay(due);
  if (dueDay.getTime() <= today.getTime()) return { kind: 'today' };
  const days = Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);
  if (days === 1) return { kind: 'tomorrow' };
  return { kind: 'inDays', days };
}

export function isRecentBrowseCard(card, now = new Date()) {
  if (!card?.updatedAt) return false;
  const modified = new Date(card.updatedAt).getTime();
  if (!Number.isFinite(modified)) return false;
  return modified > now.getTime() - RECENT_MS;
}

export function hasBrowseCardTags(card, now = new Date()) {
  return Boolean(browseDueTag(card, now) || isRecentBrowseCard(card, now));
}
