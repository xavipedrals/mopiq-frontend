import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyDeckSettings, expandPreset, readDeckSettings } from './deckSettings.js';

describe('readDeckSettings', () => {
  it('defaults like iOS / parseDeckConfig', () => {
    const settings = readDeckSettings({});
    assert.equal(settings.presetId, 0);
    assert.equal(settings.newCardsPerDay, 20);
    assert.equal(settings.displayNewCardsInOrder, true);
    assert.equal(settings.showCheckpoints, true);
    assert.equal(settings.autoplayAudio, false);
  });
});

describe('applyDeckSettings', () => {
  it('merges without dropping nested scheduler fields', () => {
    const extra = {
      presetId: 0,
      newCardsConfig: { newCardsPerDay: 20, learningStepsMinutes: [1, 10] },
      reviewCardsConfig: { hardFactor: 1.2 },
    };
    const next = applyDeckSettings(extra, {
      newCardsPerDay: 40,
      updateNewCardsPerDay: true,
      displayNewCardsInOrder: false,
      showCheckpoints: false,
    });
    assert.equal(next.newCardsPerDay, 40);
    assert.equal(next.newCardsConfig.newCardsPerDay, 40);
    assert.equal(next.newCardsConfig.displayNewCardsInOrder, false);
    assert.deepEqual(next.newCardsConfig.learningStepsMinutes, [1, 10]);
    assert.equal(next.reviewCardsConfig.hardFactor, 1.2);
    assert.equal(next.showCheckpoints, false);
  });
});

describe('expandPreset', () => {
  it('writes medical learning steps and keeps the new-cards override', () => {
    const next = expandPreset({ newCardsConfig: { newCardsPerDay: 15 } }, 1);
    assert.equal(next.presetId, 1);
    assert.equal(next.newCardsConfig.newCardsPerDay, 15);
    assert.deepEqual(next.newCardsConfig.learningStepsMinutes, [1, 24, 96, 240]);
    assert.equal(next.newCardsConfig.graduationIntervalDays, 10);
  });
});
