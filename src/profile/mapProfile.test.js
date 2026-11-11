import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapDisplayProfileRow, mapProfileStatisticsRow, mergeHighestStats, statNumber } from './mapProfile.js';

describe('statNumber', () => {
  it('reads the first finite value', () => {
    assert.equal(statNumber(undefined, '42', 7), 42);
  });

  it('treats missing values as 0', () => {
    assert.equal(statNumber(undefined, null, ''), 0);
  });
});

describe('mapDisplayProfileRow', () => {
  it('maps snake_case get_user_profile rows', () => {
    const profile = mapDisplayProfileRow({
      name: 'Ada',
      experience: 120,
      seconds_studied: 3600,
      days_using_app: 9,
      cards_studied: 80,
      avatar_number: 3,
      joined_date: '2024-01-01T00:00:00Z',
      image_storage_path: 'users/x/a.png',
      locale: 'ja',
      answer_feedback_position: 'bottom',
    }, {
      email: 'ada@example.com',
      firebaseId: 'fb',
      supabaseUserId: 'sb',
    });
    assert.equal(profile.cardsStudied, 80);
    assert.equal(profile.secondsStudied, 3600);
    assert.equal(profile.daysUsingApp, 9);
    assert.equal(profile.experience, 120);
    assert.equal(profile.email, 'ada@example.com');
    assert.equal(profile.isPremium, false);
    assert.equal(profile.locale, 'ja');
    assert.equal(profile.answerFeedbackPosition, 'bottom');
  });

  it('treats either store as Plus without replacing the Apple flag on the row', () => {
    const profile = mapDisplayProfileRow({ is_premium: false }, { hasPaidAccess: true });
    assert.equal(profile.isPremium, true);
  });

  it('lets an explicit unpaid result override a stale premium flag', () => {
    const profile = mapDisplayProfileRow(
      { is_premium: true },
      { hasPaidAccess: false, canManageSubscription: false },
    );
    assert.equal(profile.isPremium, false);
    assert.equal(profile.canManageSubscription, false);
  });

  it('keeps manage separate from an active website subscription', () => {
    const profile = mapDisplayProfileRow({ is_premium: false }, {
      hasPaidAccess: true,
      canManageSubscription: true,
    });
    assert.equal(profile.isPremium, true);
    assert.equal(profile.canManageSubscription, true);
  });

  it('maps is_premium from get_user_profile', () => {
    const profile = mapDisplayProfileRow({ is_premium: true, name: 'Ada' });
    assert.equal(profile.isPremium, true);
  });

  it('maps camelCase Firestore rows', () => {
    const profile = mapDisplayProfileRow({
      name: 'Ada',
      experience: 12,
      secondsStudied: 90,
      daysUsingApp: 2,
      cardsStudied: 4,
      avatarNumber: 1,
    });
    assert.equal(profile.cardsStudied, 4);
    assert.equal(profile.secondsStudied, 90);
    assert.equal(profile.daysUsingApp, 2);
  });
});

describe('mergeHighestStats', () => {
  it('keeps the higher monotonic stats', () => {
    const merged = mergeHighestStats(
      mapDisplayProfileRow({ experience: 10, cards_studied: 3, seconds_studied: 8, days_using_app: 1 }),
      mapDisplayProfileRow({ experience: 4, cardsStudied: 9, secondsStudied: 2, daysUsingApp: 6, name: 'Remote' }),
    );
    assert.equal(merged.experience, 10);
    assert.equal(merged.cardsStudied, 9);
    assert.equal(merged.secondsStudied, 8);
    assert.equal(merged.daysUsingApp, 6);
    assert.equal(merged.name, 'Remote');
  });
});

// RPC snapshots must not inherit higher, stale Firebase or local totals.
describe('profile statistics snapshot', () => {
  const row = {
    today_cards_studied: '42', today_milliseconds: '1260999',
    today_ends_at_epoch: 1793746800,
    cards_studied: '274', seconds_studied: '12600', days_using_app: '18', experience: '1280',
  };
  it('converts milliseconds to whole seconds and keeps the server study-day boundary', () => {
    const stats = mapProfileStatisticsRow(row);
    assert.equal(stats.todayCardsStudied, 42);
    assert.equal(stats.todaySecondsStudied, 1260);
    assert.equal(stats.todayEndsAtEpoch, row.today_ends_at_epoch);
    assert.equal(stats.cardsStudied, 274);
    assert.equal(stats.secondsStudied, 12600);
    assert.equal(stats.daysUsingApp, 18);
    assert.equal(stats.experience, 1280);
  });
  it('shows zero for a valid day without reviews', () => {
    const stats = mapProfileStatisticsRow({ ...row, today_cards_studied: 0, today_milliseconds: 0 });
    assert.equal(stats.todayCardsStudied, 0);
    assert.equal(stats.todaySecondsStudied, 0);
  });
  it('rejects missing or invalid statistics instead of displaying false zeroes', () => {
    for (const bad of [null, undefined, '', 'invalid', -1, Infinity]) {
      assert.throws(() => mapProfileStatisticsRow({ ...row, today_cards_studied: bad }));
    }
    assert.throws(() => mapProfileStatisticsRow(null));
  });
});
