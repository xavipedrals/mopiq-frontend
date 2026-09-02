import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapDisplayProfileRow, mergeHighestStats, statNumber } from './mapProfile.js';

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
