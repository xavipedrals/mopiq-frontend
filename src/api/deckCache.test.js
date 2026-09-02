import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  cacheDeck,
  cacheDeckList,
  cachedDeck,
  cachedDeckList,
  cachedDeckStats,
  clearDeckCache,
} from './deckCache.js';

describe('deckCache', () => {
  beforeEach(() => clearDeckCache());

  it('returns null for decks it has never seen', () => {
    assert.equal(cachedDeck('missing'), null);
    assert.equal(cachedDeckStats('missing'), null);
    assert.equal(cachedDeckList(), null);
  });

  it('keeps list rows so the detail page can paint title and topic first', () => {
    cacheDeckList([{ id: 'a', name: 'Spanish', cardCount: 12, cardsForToday: 3, canStudy: true }]);
    assert.equal(cachedDeck('a').name, 'Spanish');
    assert.equal(cachedDeckStats('a').cardsForToday, 3);
  });

  it('merges the full deck over the list row without losing today’s counts', () => {
    cacheDeckList([{ id: 'a', name: 'Spanish', cardsForToday: 3 }]);
    cacheDeck({ id: 'a', name: 'Spanish 2', canEdit: true });
    assert.deepEqual(cachedDeck('a'), {
      id: 'a',
      name: 'Spanish 2',
      cardsForToday: 3,
      canEdit: true,
    });
    assert.equal(cachedDeckStats('a').cardsForToday, 3);
  });

  it('replays the list in fetch order, not in the order decks were touched', () => {
    cacheDeck({ id: 'c', name: 'Touched first' });
    cacheDeckList([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]);
    assert.deepEqual(cachedDeckList().map((deck) => deck.name), ['A', 'B', 'C']);
  });

  it('shows an empty list as empty rather than unknown, and keeps deck edits', () => {
    cacheDeckList([]);
    assert.deepEqual(cachedDeckList(), []);
    cacheDeckList([{ id: 'a', name: 'Old name', cardsForToday: 3 }]);
    cacheDeck({ id: 'a', name: 'Renamed' });
    assert.deepEqual(cachedDeckList(), [{ id: 'a', name: 'Renamed', cardsForToday: 3 }]);
  });

  it('ignores rows with no id and passes payloads through', () => {
    assert.deepEqual(cacheDeckList([{ name: 'nope' }]), [{ name: 'nope' }]);
    assert.equal(cacheDeckList(undefined), undefined);
    const deck = { name: 'nope' };
    assert.equal(cacheDeck(deck), deck);
    assert.equal(cachedDeck(undefined), null);
  });

  it('looks up by string even when ids arrive as numbers', () => {
    cacheDeck({ id: 7, name: 'Seven' });
    assert.equal(cachedDeck('7').name, 'Seven');
  });
});
