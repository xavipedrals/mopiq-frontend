/** Same presets as iOS DeckConfigPreset. Web study reads nested extra_config, so
 * changing preset also writes those nested scheduler fields. */

export const DECK_PRESETS = [
  {
    id: 0,
    key: 'general',
    newCardsConfig: {
      learningStepsMinutes: [1, 10],
      graduationIntervalDays: 1,
      easyGraduationIntervalDays: 4,
      defaultEaseFactor: 2500,
    },
    reviewCardsConfig: {
      maxReviewsPerDay: 100,
      intervalModifier: 1,
      maxIntervalDays: 180,
      easyBonusMultiplier: 1.3,
      hardFactor: 1.2,
    },
    lapseCardsConfig: {
      leechFails: 8,
      minIntervalDays: 1,
      relearningStepsMinutes: [10],
      leechAction: 1,
      rehabilitationIntervalMultiplier: 0,
    },
  },
  {
    id: 1,
    key: 'medical',
    newCardsConfig: {
      learningStepsMinutes: [1, 24, 96, 240],
      graduationIntervalDays: 10,
      easyGraduationIntervalDays: 10,
      defaultEaseFactor: 2500,
    },
    reviewCardsConfig: {
      maxReviewsPerDay: 100,
      intervalModifier: 1,
      maxIntervalDays: 180,
      easyBonusMultiplier: 1.3,
      hardFactor: 1.2,
    },
    lapseCardsConfig: {
      leechFails: 8,
      minIntervalDays: 1,
      relearningStepsMinutes: [1, 24, 96, 240],
      leechAction: 1,
      rehabilitationIntervalMultiplier: 0,
    },
  },
  {
    id: 2,
    key: 'languages',
    newCardsConfig: {
      learningStepsMinutes: [1, 5, 60],
      graduationIntervalDays: 1,
      easyGraduationIntervalDays: 5,
      defaultEaseFactor: 2500,
    },
    reviewCardsConfig: {
      maxReviewsPerDay: 100,
      intervalModifier: 1,
      maxIntervalDays: 180,
      easyBonusMultiplier: 1.4,
      hardFactor: 1.3,
    },
    lapseCardsConfig: {
      leechFails: 8,
      minIntervalDays: 1,
      relearningStepsMinutes: [10],
      leechAction: 1,
      rehabilitationIntervalMultiplier: 0,
    },
  },
];

function cloneExtra(extra) {
  return extra && typeof extra === 'object' ? JSON.parse(JSON.stringify(extra)) : {};
}

export function readDeckSettings(extra = {}) {
  const newCfg = extra.newCardsConfig || {};
  return {
    presetId: Number(extra.presetId) || 0,
    newCardsPerDay: Number(newCfg.newCardsPerDay ?? extra.newCardsPerDay ?? 20) || 20,
    displayNewCardsInOrder: newCfg.displayNewCardsInOrder !== false,
    showCheckpoints: extra.showCheckpoints !== false,
    autoplayAudio: extra.autoplayAudio === true,
  };
}

export function expandPreset(extra, presetId) {
  const preset = DECK_PRESETS.find((item) => item.id === presetId) || DECK_PRESETS[0];
  const next = cloneExtra(extra);
  const previousNew = next.newCardsConfig || {};
  next.presetId = preset.id;
  next.newCardsConfig = {
    ...previousNew,
    ...preset.newCardsConfig,
    newCardsPerDay: previousNew.newCardsPerDay ?? next.newCardsPerDay ?? preset.newCardsConfig.newCardsPerDay,
    displayNewCardsInOrder: previousNew.displayNewCardsInOrder !== false,
  };
  next.reviewCardsConfig = {
    ...(next.reviewCardsConfig || {}),
    ...preset.reviewCardsConfig,
  };
  next.lapseCardsConfig = {
    ...(next.lapseCardsConfig || {}),
    ...preset.lapseCardsConfig,
  };
  return next;
}

/** Mirrors apply_deck_version_extra_config_settings, plus optional preset expansion. */
export function applyDeckSettings(extra, settings = {}) {
  let next = cloneExtra(extra);
  const presetId = settings.presetId == null ? Number(next.presetId) || 0 : Number(settings.presetId) || 0;
  if (settings.expandPreset) {
    next = expandPreset(next, presetId);
  } else {
    next.presetId = presetId;
  }

  const newCfg = { ...(next.newCardsConfig || {}) };
  if (settings.updateNewCardsPerDay) {
    const value = Number(settings.newCardsPerDay);
    if (Number.isFinite(value) && value > 0) {
      newCfg.newCardsPerDay = value;
      next.newCardsPerDay = value;
    }
  }
  if (settings.displayNewCardsInOrder != null) {
    newCfg.displayNewCardsInOrder = Boolean(settings.displayNewCardsInOrder);
  }
  next.newCardsConfig = newCfg;
  if (settings.showCheckpoints != null) next.showCheckpoints = Boolean(settings.showCheckpoints);
  if (settings.autoplayAudio != null) next.autoplayAudio = Boolean(settings.autoplayAudio);
  next.listStatsSettingsSyncedAt = new Date().toISOString();
  return next;
}
