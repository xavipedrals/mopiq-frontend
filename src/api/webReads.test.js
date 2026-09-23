import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  effectiveContentMode,
  emptyHistogram,
  isPostgresDeck,
  mapBrowseCard,
  mapDeckListRow,
  mapHistogramRow,
  mapProgressCountsRow,
  mapStudyBundleRow,
  mapUserDeckRow,
  nextStudyBundleCursor,
} from './webReads.js';

describe('webReads mappers', () => {
  it('treats content_mode_2 as the routing mode', () => {
    assert.equal(effectiveContentMode({ content_mode: 'file', content_mode_2: 'postgres' }), 'postgres');
    assert.equal(effectiveContentMode({ content_mode: 'file' }), 'legacy_firebase_file');
    assert.equal(isPostgresDeck('postgres'), true);
    assert.equal(isPostgresDeck('legacy_firebase_file'), false);
  });

  it('maps an owned deck row for the website', () => {
    const deck = mapUserDeckRow({
      id: 'deck-1',
      firebase_id: 'fb-1',
      name: 'Spanish',
      topic: 'languages',
      card_count: 12,
      extra_config: { sharedDeckId: 'share-1' },
      decks: { 1: { id: 1, name: 'Spanish' } },
      created_at: '2026-09-01T00:00:00.000Z',
      last_used_at: '2026-09-20T00:00:00.000Z',
      content_mode: 'postgres',
      content_mode_2: 'postgres',
      creator_id: 'user-1',
    }, 'user-1');
    assert.equal(deck.id, 'deck-1');
    assert.equal(deck.name, 'Spanish');
    assert.equal(deck.canStudy, true);
    assert.equal(deck.canEdit, true);
    assert.equal(deck.sharedDeckId, 'share-1');
    assert.equal(deck.config.newCardsPerDay > 0, true);
  });

  it('maps list stats onto the same deck shape', () => {
    const row = mapDeckListRow({
      deck_id: 'deck-1',
      firebase_id: 'fb-1',
      name: 'Spanish',
      topic: 'languages',
      card_count: 12,
      content_mode: 'postgres',
      content_mode_2: 'postgres',
      creator_id: 'user-1',
      extra_config: {},
      decks: {},
      stats_available: true,
      new_remaining_today: 4,
      review_due_today: 2,
      cards_for_today: 6,
    }, 'user-1');
    assert.equal(row.id, 'deck-1');
    assert.equal(row.cardsForToday, 6);
    assert.equal(row.statsAvailable, true);
  });

  it('fills default SRS fields when a study bundle row has no progress', () => {
    const card = mapStudyBundleRow({
      id: 'c1',
      question: 'Q',
      answer: 'A',
      note_fields: ['Q', 'A'],
      position: 3,
    });
    assert.equal(card.state, 'NEW');
    assert.equal(card.easeFactor, 2500);
    assert.equal(card.reviewCount, 0);
    assert.equal(card.suspended, false);
  });

  it('keeps progress fields from the study bundle', () => {
    const card = mapStudyBundleRow({
      id: 'c1',
      question: 'Q',
      answer: 'A',
      note_fields: ['Q', 'A'],
      position: 1,
      state: 'REVIEW',
      ease_factor: 2300,
      interval_secs: 86400,
      review_count: 4,
      lapse_count: 1,
      due_date: '2026-09-22T00:00:00.000Z',
      last_reviewed: '2026-09-20T00:00:00.000Z',
      last_answer_given: 'GOOD',
      suspended: true,
    });
    assert.equal(card.state, 'REVIEW');
    assert.equal(card.easeFactor, 2300);
    assert.equal(card.intervalSecs, 86400);
    assert.equal(card.reviewCount, 4);
    assert.equal(card.lastAnswerGiven, 'GOOD');
    assert.equal(card.suspended, true);
  });

  it('maps browse progress tags without a second table read', () => {
    const card = mapBrowseCard({
      id: 'c1',
      question: 'Q',
      note_fields: ['Q', 'A'],
      state: 'LEARNING',
      review_count: 2,
      due_date: '2026-09-21T00:00:00.000Z',
      updated_at: '2026-09-20T00:00:00.000Z',
    });
    assert.equal(card.state, 'LEARNING');
    assert.equal(card.reviewCount, 2);
    assert.equal(card.updatedAt, '2026-09-20T00:00:00.000Z');
  });

  it('maps histogram counts the dashboard already consumes', () => {
    assert.deepEqual(
      mapHistogramRow({
        again_count: 0,
        hard_count: 1,
        good_count: 1,
        easy_count: 1,
        total: 3,
        grade: 66,
      }),
      {
        counts: { AGAIN: 0, HARD: 1, GOOD: 1, EASY: 1 },
        total: 3,
        grade: 66,
      },
    );
    assert.deepEqual(emptyHistogram(), {
      counts: { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 },
      total: 0,
      grade: 0,
    });
  });

  it('maps progress counts and study-bundle cursors', () => {
    assert.deepEqual(
      mapProgressCountsRow({ seen: 9, studied_today: 2 }),
      { seen: 9, studiedToday: 2 },
    );
    assert.deepEqual(
      nextStudyBundleCursor([{ id: 'a', position: 1 }, { id: 'b', position: 4 }]),
      { position: 4, id: 'b' },
    );
    assert.equal(nextStudyBundleCursor([]), null);
  });
});

describe('mopiq.js table access', () => {
  const source = readFileSync(fileURLToPath(new URL('./mopiq.js', import.meta.url)), 'utf8');

  it('does not scrape study tables or storage from the browser', () => {
    for (const table of [
      'cards_static',
      'user_card_states',
      'review_logs',
      'deck_versions',
      'deck_version_media',
      'deck-media',
    ]) {
      assert.equal(source.includes(`.from('${table}')`), false, `unexpected .from('${table}')`);
    }
    assert.equal(source.includes('upsert_card_static_for_caller'), false);
    assert.equal(source.includes('insert_deck_version_media_for_caller'), false);
  });
});

it('uses the same integer grade as iOS, including truncation and zero', () => {
  assert.equal(mapHistogramRow({ hard_count: 1, easy_count: 20, total: 21, grade: 97 }).grade, 96);
  assert.equal(mapHistogramRow({ good_count: 1, total: 1 }).grade, 66);
  assert.equal(mapHistogramRow({ hard_count: 1, good_count: 1, easy_count: 1, total: 3 }).grade, 66);
  assert.equal(mapHistogramRow({ again_count: 21, total: 21 }).grade, 0);
  assert.equal(mapHistogramRow({}).grade, 0);
});
