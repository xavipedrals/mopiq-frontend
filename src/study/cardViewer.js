export const SHOW_ANSWERS_KEY = 'cardViewer.showAnswers';

export function readShowAnswers(storage) {
  if (!storage) return false;
  try {
    return storage.getItem(SHOW_ANSWERS_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeShowAnswers(value, storage) {
  if (!storage) return;
  try {
    storage.setItem(SHOW_ANSWERS_KEY, value ? '1' : '0');
  } catch {
    // The preference is optional when storage is blocked.
  }
}

export function viewerCanGoPrevious(index) {
  return index > 0;
}

export function viewerCanGoNext(index, loadedCount, hasMore) {
  if (!Number.isInteger(index) || index < 0) return false;
  return index + 1 < loadedCount || Boolean(hasMore);
}

// Same window test as the iOS card viewer: a wide, landscape-enough pane
// puts previous and next beside the card.
export function usesWideCardViewer(width, height) {
  return width >= 1000 && height >= 600 && width > height * 1.1;
}

// After a deletion, keep the following card, or the previous one at the end.
// undefined means the open card was not removed.
export function replacementAfterRemoval(cards, removedIds, selectedId) {
  const removed = removedIds instanceof Set ? removedIds : new Set(removedIds);
  if (selectedId == null || !removed.has(selectedId)) return undefined;
  const list = cards || [];
  const index = list.findIndex((card) => card?.id === selectedId);
  if (index < 0) return null;
  for (let i = index + 1; i < list.length; i += 1) {
    if (!removed.has(list[i].id)) return list[i];
  }
  for (let i = index - 1; i >= 0; i -= 1) {
    if (!removed.has(list[i].id)) return list[i];
  }
  return null;
}

const RELATIVE_STEPS = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
];

export function relativeReviewLabel(value, now = new Date(), locale = 'en') {
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return '';
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const absolute = Math.abs(seconds);
  let unit = 'second';
  let size = 1;
  for (const [name, step] of RELATIVE_STEPS) {
    if (absolute >= step) {
      unit = name;
      size = step;
      break;
    }
  }
  const amount = unit === 'second' ? 0 : Math.round(seconds / size);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(amount, unit);
}
