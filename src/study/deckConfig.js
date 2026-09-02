const DEFAULTS = {
  newCardsPerDay: 20,
  maxReviewsPerDay: 200,
  learningStepsMinutes: [1, 10],
  graduationIntervalDays: 1,
  easyGraduationIntervalDays: 4,
  defaultEaseFactor: 2500,
  displayNewCardsInOrder: true,
  hardFactor: 1.2,
  intervalModifier: 1,
  maxIntervalDays: 180,
  easyBonus: 1.4,
  leechFails: 8,
  leechAction: 1,
  minIntervalDays: 1,
  relearningStepsMinutes: [10],
  rehabilitationIntervalMultiplier: 0,
};

function minutesToSecs(minutes) {
  const list = Array.isArray(minutes) && minutes.length > 0 ? minutes : null;
  return (list || [1, 10]).map((m) => Number(m) * 60);
}

export function parseDeckConfig(extraConfig) {
  const extra = extraConfig && typeof extraConfig === 'object' ? extraConfig : {};
  const newCfg = extra.newCardsConfig || {};
  const reviewCfg = extra.reviewCardsConfig || {};
  const lapseCfg = extra.lapseCardsConfig || {};

  const learningStepsMinutes = newCfg.learningStepsMinutes || DEFAULTS.learningStepsMinutes;
  const relearningStepsMinutes = lapseCfg.relearningStepsMinutes || DEFAULTS.relearningStepsMinutes;

  return {
    newCardsPerDay: Number(newCfg.newCardsPerDay ?? extra.newCardsPerDay ?? DEFAULTS.newCardsPerDay) || DEFAULTS.newCardsPerDay,
    maxReviewsPerDay: Number(reviewCfg.maxReviewsPerDay ?? DEFAULTS.maxReviewsPerDay) || DEFAULTS.maxReviewsPerDay,
    learningStepsInSecs: minutesToSecs(learningStepsMinutes),
    graduatingIntervalSecs: (Number(newCfg.graduationIntervalDays ?? DEFAULTS.graduationIntervalDays) || 1) * 86400,
    easyIntervalSecs: (Number(newCfg.easyGraduationIntervalDays ?? DEFAULTS.easyGraduationIntervalDays) || 4) * 86400,
    defaultEaseFactor: Number(newCfg.defaultEaseFactor ?? DEFAULTS.defaultEaseFactor) || 2500,
    displayNewCardsInOrder: newCfg.displayNewCardsInOrder !== false,
    hardFactor: Number(reviewCfg.hardFactor ?? DEFAULTS.hardFactor) || 1.2,
    intervalModifier: Number(reviewCfg.intervalModifier ?? DEFAULTS.intervalModifier) || 1,
    maxIntervalDays: Number(reviewCfg.maxIntervalDays ?? DEFAULTS.maxIntervalDays) || 180,
    easyBonus: Number(reviewCfg.easyBonusMultiplier ?? DEFAULTS.easyBonus) || 1.4,
    leechFails: Number(lapseCfg.leechFails ?? DEFAULTS.leechFails) || 8,
    leechAction: Number(lapseCfg.leechAction ?? DEFAULTS.leechAction),
    minIntervalSecs: (Number(lapseCfg.minIntervalDays ?? DEFAULTS.minIntervalDays) || 1) * 86400,
    relearningStepsInSecs: minutesToSecs(relearningStepsMinutes),
    rehabilitationIntervalMultiplier: Number(
      lapseCfg.rehabilitationIntervalMultiplier ?? DEFAULTS.rehabilitationIntervalMultiplier
    ),
    showCheckpoints: extra.showCheckpoints !== false,
  };
}
