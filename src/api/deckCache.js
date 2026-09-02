/**
 * Whatever we already learned about a deck, so the list and the detail page can
 * paint real content before their own requests come back.
 */
const deckById = new Map();
const listStatsById = new Map();
let listOrder = null;

export function cacheDeckList(rows) {
  if (!Array.isArray(rows)) return rows;
  const order = [];
  for (const row of rows) {
    if (!row?.id) continue;
    const id = String(row.id);
    deckById.set(id, { ...(deckById.get(id) || {}), ...row });
    listStatsById.set(id, row);
    order.push(id);
  }
  listOrder = order;
  return rows;
}

export function cacheDeck(deck) {
  if (!deck?.id) return deck;
  const id = String(deck.id);
  deckById.set(id, { ...(deckById.get(id) || {}), ...deck });
  return deck;
}

export function cachedDeck(deckId) {
  return deckById.get(String(deckId)) || null;
}

export function cachedDeckStats(deckId) {
  return listStatsById.get(String(deckId)) || null;
}

/** Null until the list has been fetched once, so callers can tell empty from unknown. */
export function cachedDeckList() {
  if (!listOrder) return null;
  return listOrder.map((id) => deckById.get(id)).filter(Boolean);
}

export function clearDeckCache() {
  deckById.clear();
  listStatsById.clear();
  listOrder = null;
}
