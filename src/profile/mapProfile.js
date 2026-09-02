export function statNumber(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function mapDisplayProfileRow(row = {}, extras = {}) {
  const sessionUser = extras.sessionUser || {};
  return {
    name: row.name || sessionUser.name || 'Mopiq user',
    email: extras.email || sessionUser.email || '',
    firebaseId: extras.firebaseId || row.firebaseId || sessionUser.firebaseUid || '',
    supabaseUserId: extras.supabaseUserId || sessionUser.supabaseUid || '',
    experience: statNumber(row.experience),
    secondsStudied: statNumber(row.seconds_studied, row.secondsStudied),
    daysUsingApp: statNumber(row.days_using_app, row.daysUsingApp),
    cardsStudied: statNumber(row.cards_studied, row.cardsStudied),
    avatarNumber: statNumber(row.avatar_number, row.avatarNumber),
    joinedDate: row.joined_date || row.joinedDate || null,
    imageStoragePath: row.image_storage_path || row.imageStoragePath || '',
    isPremium: row.is_premium === true || row.isPremium === true,
    locale: row.locale || extras.locale || '',
  };
}

export function mergeHighestStats(base, other) {
  if (!other) return base || null;
  if (!base) return other;
  return {
    ...base,
    name: other.name || base.name,
    email: other.email || base.email,
    firebaseId: other.firebaseId || base.firebaseId,
    supabaseUserId: other.supabaseUserId || base.supabaseUserId,
    experience: Math.max(base.experience || 0, other.experience || 0),
    secondsStudied: Math.max(base.secondsStudied || 0, other.secondsStudied || 0),
    daysUsingApp: Math.max(base.daysUsingApp || 0, other.daysUsingApp || 0),
    cardsStudied: Math.max(base.cardsStudied || 0, other.cardsStudied || 0),
    avatarNumber: other.avatarNumber || base.avatarNumber,
    joinedDate: base.joinedDate || other.joinedDate,
    imageStoragePath: other.imageStoragePath || base.imageStoragePath,
    isPremium: Boolean(other.isPremium || base.isPremium),
    locale: base.locale || other.locale || '',
  };
}
