import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cardDocument } from './cardHtml.js';
import {
  SHOW_ANSWERS_KEY,
  readShowAnswers,
  relativeReviewLabel,
  replacementAfterRemoval,
  usesWideCardViewer,
  viewerCanGoNext,
  viewerCanGoPrevious,
  writeShowAnswers,
} from './cardViewer.js';

describe('card viewer navigation', () => {
  const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('walks to the next card, or the previous one when the last card is removed', () => {
    assert.equal(viewerCanGoPrevious(0), false);
    assert.equal(viewerCanGoPrevious(1), true);
    assert.equal(viewerCanGoNext(0, 3, false), true);
    assert.equal(viewerCanGoNext(2, 3, false), false);
    assert.equal(viewerCanGoNext(2, 3, true), true);
    assert.equal(viewerCanGoNext(-1, 3, true), false);
    assert.equal(replacementAfterRemoval(cards, ['b'], 'a'), undefined);
    assert.equal(replacementAfterRemoval(cards, ['b'], 'b')?.id, 'c');
    assert.equal(replacementAfterRemoval(cards, ['c'], 'c')?.id, 'b');
    assert.equal(replacementAfterRemoval([{ id: 'a' }], ['a'], 'a'), null);
  });

  it('uses the iPad layout only for a wide landscape pane', () => {
    assert.equal(usesWideCardViewer(1194, 700), true);
    assert.equal(usesWideCardViewer(900, 800), false);
    assert.equal(usesWideCardViewer(1100, 500), false);
    assert.equal(usesWideCardViewer(1000, 950), false);
  });
});

describe('card viewer preferences', () => {
  it('remembers show answers', () => {
    const storage = {
      value: null,
      getItem() { return this.value; },
      setItem(_key, value) { this.value = value; },
    };
    assert.equal(readShowAnswers(storage), false);
    writeShowAnswers(true, storage);
    assert.equal(storage.value, '1');
    assert.equal(storage.getItem(SHOW_ANSWERS_KEY), '1');
    assert.equal(readShowAnswers(storage), true);
    writeShowAnswers(false, storage);
    assert.equal(readShowAnswers(storage), false);
    assert.equal(readShowAnswers(null), false);
  });

  it('formats the last review the way a relative date reads', () => {
    const now = new Date('2026-10-23T12:00:00Z');
    const then = new Date('2026-10-20T12:00:00Z');
    assert.equal(relativeReviewLabel(then.toISOString(), now, 'en'), '3 days ago');
    assert.equal(relativeReviewLabel('not-a-date', now, 'en'), '');
  });
});

describe('card viewer document', () => {
  it('centers short cards vertically', () => {
    const html = cardDocument('<p>Hola</p>', { viewer: true });
    assert.match(html, /margin-top: auto !important/);
    assert.match(html, /margin-bottom: auto !important/);
    assert.equal(html.includes('font-size: 14pt'), false);
  });
});
