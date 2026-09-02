export const FREE_CARD_DAILY_LIMIT = 30;

export function applyQuota(localUsed, quota, studyDay) {
  const local = Math.max(0, Number(localUsed) || 0);
  if (quota?.unlimited) {
    return { used: local, unlimited: true, remaining: Infinity };
  }
  if (quota?.studyDay && quota.studyDay !== studyDay) {
    return {
      used: local,
      unlimited: false,
      remaining: Math.max(0, FREE_CARD_DAILY_LIMIT - local),
    };
  }
  const used = Math.max(local, Number(quota?.used) || 0);
  const limit = Number(quota?.limit) || FREE_CARD_DAILY_LIMIT;
  return {
    used,
    unlimited: false,
    remaining: Math.max(0, limit - used),
  };
}

export function isDailyLimitReached(quota, studyDay, localUsed = 0) {
  const applied = applyQuota(localUsed, quota, studyDay);
  return !applied.unlimited && applied.remaining <= 0;
}
