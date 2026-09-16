import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  browseDueTag,
  hasBrowseCardTags,
  isNewBrowseCard,
  isRecentBrowseCard,
} from './cardBrowseTags.js';

const now = new Date('2026-09-16T15:00:00');

describe('cardBrowseTags', () => {
  it('hides due tags on new or unreviewed cards', () => {
    assert.equal(isNewBrowseCard({ reviewCount: 0, dueDate: now.toISOString() }), true);
    assert.equal(browseDueTag({ reviewCount: 0, dueDate: now.toISOString() }, now), null);
    assert.equal(browseDueTag({ reviewCount: 3, state: 'NEW', dueDate: now.toISOString() }, now), null);
    assert.equal(browseDueTag({ reviewCount: 2, state: 'LEARNING' }, now), null);
  });

  it('labels today, overdue, tomorrow, and later like iOS', () => {
    assert.deepEqual(
      browseDueTag({ reviewCount: 2, state: 'REVIEW', dueDate: '2026-09-16T08:00:00' }, now),
      { kind: 'today' },
    );
    assert.deepEqual(
      browseDueTag({ reviewCount: 2, state: 'REVIEW', dueDate: '2026-09-15T23:00:00' }, now),
      { kind: 'today' },
    );
    assert.deepEqual(
      browseDueTag({ reviewCount: 2, state: 'REVIEW', dueDate: '2026-09-17T01:00:00' }, now),
      { kind: 'tomorrow' },
    );
    assert.deepEqual(
      browseDueTag({ reviewCount: 2, state: 'REVIEW', dueDate: '2026-09-21T12:00:00' }, now),
      { kind: 'inDays', days: 5 },
    );
  });

  it('marks cards modified in the last 24 hours as recent', () => {
    assert.equal(isRecentBrowseCard({ updatedAt: '2026-09-16T10:00:00' }, now), true);
    assert.equal(isRecentBrowseCard({ updatedAt: '2026-09-15T14:00:00' }, now), false);
    assert.equal(hasBrowseCardTags({
      reviewCount: 2,
      state: 'REVIEW',
      dueDate: '2026-09-16T08:00:00',
      updatedAt: '2026-09-16T10:00:00',
    }, now), true);
  });
});
