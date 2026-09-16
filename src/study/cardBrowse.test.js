import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CARD_BROWSE_FIRST_PAGE,
  CARD_BROWSE_PAGE_SIZE,
  cardBrowsePageLimit,
  defaultCardBrowseQuery,
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
        { query: 'mango fruit', hasAudio: true, status: 'mastered', sort: 'reviewDate', ascending: true },
        20,
        60,
      ),
      {
        p_deck_version_id: 'deck-1',
        p_query: 'mango fruit',
        p_has_image: false,
        p_has_audio: true,
        p_status: 'mastered',
        p_sort: 'reviewDate',
        p_ascending: true,
        p_limit: 60,
        p_offset: 20,
      },
    );
  });
});
