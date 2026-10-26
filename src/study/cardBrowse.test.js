import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CARD_BROWSE_FIRST_PAGE,
  CARD_BROWSE_PAGE_SIZE,
  cardBrowsePageLimit,
  defaultCardBrowseQuery,
  filterPreviewBrowseCards,
  hasActiveCardBrowseFilters,
  isDefaultCardBrowseQuery,
  normalizeCardBrowseQuery,
  resetCardBrowseFilters,
  toBrowseDeckCardsParams,
} from './cardBrowse.js';

describe('cardBrowse', () => {
  it('defaults to last modified, newest first', () => {
    const query = defaultCardBrowseQuery();
    assert.equal(query.sort, 'lastModified');
    assert.equal(query.ascending, false);
    assert.equal(query.status, null);
    assert.equal(isDefaultCardBrowseQuery(query), true);
    assert.equal(hasActiveCardBrowseFilters(query), false);
  });

  it('treats unknown sort/status as defaults and ignores order for position', () => {
    const query = normalizeCardBrowseQuery({
      query: '  mango  ',
      sort: 'nope',
      status: 'again',
      ascending: true,
    });
    assert.equal(query.query, 'mango');
    assert.equal(query.sort, 'lastModified');
    assert.equal(query.status, null);
    assert.equal(query.ascending, true);

    const byPosition = normalizeCardBrowseQuery({
      sort: 'byPosition',
      ascending: true,
    });
    assert.equal(byPosition.ascending, false);
  });

  it('marks image, status, and non-default sort as active filters', () => {
    assert.equal(hasActiveCardBrowseFilters({ hasImage: true }), true);
    assert.equal(hasActiveCardBrowseFilters({ status: 'new' }), true);
    assert.equal(hasActiveCardBrowseFilters({ sort: 'reviewDate' }), true);
    assert.equal(hasActiveCardBrowseFilters({ query: 'mango' }), false);
    assert.equal(hasActiveCardBrowseFilters({ ascending: true }), false);
  });

  it('reset keeps the search text', () => {
    assert.deepEqual(
      resetCardBrowseFilters({
        query: 'mango',
        hasImage: true,
        status: 'learning',
        sort: 'reviewDate',
        ascending: true,
      }),
      {
        ...defaultCardBrowseQuery(),
        query: 'mango',
      },
    );
  });

  it('pages 20 then 60 and maps RPC params', () => {
    assert.equal(cardBrowsePageLimit(0), CARD_BROWSE_FIRST_PAGE);
    assert.equal(cardBrowsePageLimit(20), CARD_BROWSE_PAGE_SIZE);
    assert.deepEqual(
      toBrowseDeckCardsParams(
        'deck-1',
        { query: 'mango fruit', hasAudio: true, status: 'studied', sort: 'reviewDate', ascending: true },
        20,
        60,
      ),
      {
        p_deck_version_id: 'deck-1',
        p_query: 'mango fruit',
        p_has_image: false,
        p_has_audio: true,
        p_status: 'studied',
        p_last_answers: [],
        p_any_flag: false,
        p_flag_ids: [],
        p_subdeck_ids: null,
        p_sort: 'reviewDate',
        p_ascending: true,
        p_limit: 60,
        p_offset: 20,
      },
    );
  });
});

describe('iOS-equivalent search filters', () => {
  it('normalizes multi-selects and preserves an empty folder scope', () => {
    const query = normalizeCardBrowseQuery({
      status: 'studied', lastAnswers: ['GOOD', 'AGAIN', 'GOOD', 'invalid'],
      flagIDs: ['b', 'a', 'b', '', null], anyFlag: true, subdeckIDs: [3, 2, 3, null, '4', 2.5],
    });
    assert.equal(query.status, 'studied');
    assert.deepEqual(query.lastAnswers, ['AGAIN', 'GOOD']);
    assert.deepEqual(query.flagIDs, ['a', 'b']);
    assert.deepEqual(query.subdeckIDs, [2, 3]);
    assert.deepEqual(normalizeCardBrowseQuery({ subdeckIDs: [] }).subdeckIDs, []);
    assert.equal(normalizeCardBrowseQuery({ status: 'mastered' }).status, null);
  });

  it('marks each new filter active and resets them while retaining search text', () => {
    for (const query of [{ lastAnswers: ['HARD'] }, { anyFlag: true }, { flagIDs: ['custom'] }, { subdeckIDs: [2] }]) {
      assert.equal(hasActiveCardBrowseFilters(query), true);
      assert.equal(isDefaultCardBrowseQuery(query), false);
      assert.deepEqual(resetCardBrowseFilters({ ...query, query: 'mango' }), { ...defaultCardBrowseQuery(), query: 'mango' });
    }
  });

  it('sends all predicates with every paginated request', () => {
    const params = toBrowseDeckCardsParams('deck', {
      status: 'studied', lastAnswers: ['GOOD', 'HARD'], flagIDs: ['important'], anyFlag: true, subdeckIDs: [2, 4],
    }, 80, 60);
    assert.deepEqual(params.p_last_answers, ['HARD', 'GOOD']);
    assert.deepEqual(params.p_flag_ids, ['important']);
    assert.equal(params.p_any_flag, true);
    assert.deepEqual(params.p_subdeck_ids, [2, 4]);
    assert.equal(params.p_offset, 80);
  });

  it('preview combines groups with AND, selections within groups with OR', () => {
    const cards = [
      { id: '1', state: 'NEW', reviewCount: 0, lastAnswerGiven: 'GOOD', flagIDs: ['a'], subdeckId: 2 },
      { id: '2', state: 'REVIEW', reviewCount: 1, lastAnswerGiven: 'GOOD', flagIDs: ['a'], subdeckId: 2 },
      { id: '3', state: 'LEARNING', reviewCount: 0, lastAnswerGiven: 'HARD', flagIDs: ['b'], subdeckId: 3 },
      { id: '4', state: 'NEW', reviewCount: 1, lastAnswerGiven: 'EASY', flagIDs: [], subdeckId: 2 },
    ];
    const ids = (query) => filterPreviewBrowseCards(cards, query).map((card) => card.id).sort();
    assert.deepEqual(ids({ status: 'new' }), ['1']);
    assert.deepEqual(ids({ status: 'studied' }), ['2', '3', '4']);
    assert.deepEqual(ids({ lastAnswers: ['GOOD', 'HARD'] }), ['2', '3']);
    assert.deepEqual(ids({ anyFlag: true }), ['1', '2', '3']);
    assert.deepEqual(ids({ anyFlag: true, flagIDs: ['a', 'b'], status: 'studied', subdeckIDs: [2] }), ['2']);
    assert.deepEqual(ids({ subdeckIDs: [] }), []);
  });
});
