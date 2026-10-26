import { normalizeCardBrowseQuery } from './cardBrowse.js';

export const CUSTOM_STUDY_OPTIONS = ['entireDeck', 'needsPractice', 'flagged', 'chooseCards'];
export function customStudyDefaults(option = 'entireDeck') {
  return { ...normalizeCardBrowseQuery({}),
    lastAnswers: option === 'needsPractice' ? ['AGAIN', 'HARD'] : [],
    anyFlag: option === 'flagged', matchAllFlags: false, addedWithinDays: null,
    limit: ['needsPractice', 'flagged'].includes(option) ? 20 : null, shuffle: true };
}
export function normalizeCustomStudy(input = {}) {
  const limit = input.limit == null || input.limit === '' ? null : Math.trunc(Number(input.limit));
  const days = Math.trunc(Number(input.addedWithinDays));
  return { ...normalizeCardBrowseQuery(input), matchAllFlags: Boolean(input.matchAllFlags),
    addedWithinDays: days > 0 ? Math.min(days, 36500) : null,
    limit: limit == null ? null : Number.isFinite(limit) ? Math.max(0, Math.min(limit, 1000000)) : 0,
    shuffle: Boolean(input.shuffle) };
}
export function customStudyParams(deckId, input, includeIDs = false) {
  const { limit, shuffle, ...filters } = normalizeCustomStudy(input);
  return { p_deck_version_id: deckId, p_filters: filters, p_limit: limit,
    p_shuffle: includeIDs && shuffle, p_include_ids: includeIDs };
}

// Same queue interface as ordinary study, but each snapshot card appears once.
export function createCustomStudyQueue(cards) {
  const byID = new Map(cards.filter(c => c && !c.deleted && !c.suspended).map(c => [c.id, c]));
  const pending = [...byID.keys()];
  const history = [];
  let current = null;
  return {
    remaining: () => pending.length,
    uniqueStudiedCount: () => new Set(history).size,
    pop() { current = pending.shift() ?? null; return byID.get(current) || null; },
    afterAnswer(_previous, card) { byID.set(card.id, card); history.push(card.id); },
    recordCard(card) { byID.set(card.id, card); },
    cardById: id => byID.get(id) || null,
    cardStudiedBefore: () => history.at(-1) ?? null,
    restoreLastPopped() { if (current != null) pending.unshift(current); history.pop(); current = null; },
  };
}

export function saveCustomStudySnapshot(storage, userId, deckId, cardIDs) {
  if (!userId || !cardIDs.length) throw new Error('No cards selected');
  const id = crypto.randomUUID();
  storage.setItem(`mopiq.customStudy.${id}`, JSON.stringify({ userId, deckId, cardIDs: [...new Set(cardIDs)] }));
  return id;
}
export function readCustomStudySnapshot(storage, id, userId, deckId) {
  try {
    const value = JSON.parse(storage.getItem(`mopiq.customStudy.${id}`));
    return value?.userId === userId && value?.deckId === deckId && Array.isArray(value.cardIDs)
      ? value.cardIDs.filter(id => typeof id === 'string') : null;
  } catch { return null; }
}
