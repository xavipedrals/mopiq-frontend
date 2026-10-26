// IDs and seed timestamps match iOS PersonalStudyStore so deleted or renamed
// starter flags are never recreated over a newer record from another device.
export const STARTER_FLAGS = [
  { flag_id: 'starter-important', name: 'Important', color: 'blue', labelKey: 'study.flagImportant' },
  { flag_id: 'starter-confusing', name: 'Review later', color: 'orange', labelKey: 'study.flagReviewLater' },
  { flag_id: 'starter-wording', name: 'Difficult', color: 'red', labelKey: 'study.flagDifficult' },
];

export function visiblePersonalFlags(records) {
  const byID = new Map(records.map((record) => [record.flag_id, record]));
  const starters = STARTER_FLAGS.map((flag) => byID.get(flag.flag_id) || flag);
  const custom = records.filter((record) => !STARTER_FLAGS.some((flag) => flag.flag_id === record.flag_id));
  return [...starters, ...custom.sort((a, b) => a.name.localeCompare(b.name))]
    .filter((record) => !record.deleted);
}

export function personalFlagRecord(flag) {
  return {
    kind: 'flag', deck_id: '', card_id: '', flag_id: flag.flag_id,
    name: flag.name, color: flag.color, emoji: flag.emoji || '',
    deleted: false, event_at: 0, event_id: flag.flag_id,
  };
}

export function cardFlagRecord(deckId, cardId, flagId, enabled) {
  return {
    kind: 'assignment', deck_id: String(deckId), card_id: String(cardId), flag_id: flagId,
    deleted: !enabled, event_at: Date.now() / 1000, event_id: crypto.randomUUID(),
  };
}

const COLORS = {
  red: ['#ef4444', '#f87171'], orange: ['#f97316', '#fb923c'], yellow: ['#eab308', '#facc15'],
  lime: ['#84cc16', '#a3e635'], green: ['#22c55e', '#4ade80'], teal: ['#14b8a6', '#2dd4bf'],
  sky: ['#0ea5e9', '#38bdf8'], blue: ['#3b82f6', '#60a5fa'], indigo: ['#6366f1', '#818cf8'],
  purple: ['#a855f7', '#c084fc'], pink: ['#ec4899', '#f472b6'],
};

export function personalFlagColor(color, dark = false) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  return (COLORS[color] || COLORS.blue)[dark ? 1 : 0];
}

// Match PersonalFlag.presets and CardFlagTilesHTML on iOS (fill, border).
const CHIP_COLORS = {
  red: ['#fef2f2', '#fecaca', '#450a0a', '#991b1b'],
  orange: ['#fff7ed', '#fed7aa', '#431407', '#9a3412'],
  yellow: ['#fefce8', '#fef08a', '#422006', '#854d0e'],
  lime: ['#f7fee7', '#d9f99d', '#1a2e05', '#3f6212'],
  green: ['#f0fdf4', '#bbf7d0', '#052e16', '#166534'],
  teal: ['#f0fdfa', '#99f6e4', '#042f2e', '#115e59'],
  sky: ['#f0f9ff', '#bae6fd', '#082f49', '#075985'],
  blue: ['#eff6ff', '#bfdbfe', '#172554', '#1e40af'],
  indigo: ['#eef2ff', '#c7d2fe', '#1e1b4b', '#3730a3'],
  purple: ['#faf5ff', '#e9d5ff', '#3b0764', '#6b21a8'],
  pink: ['#fdf2f8', '#fbcfe8', '#500724', '#9d174d'],
};

export function personalFlagChipColors(flag, dark = false) {
  if (flag.emoji) {
    return dark
      ? { foreground: '#e2e8f0', background: '#334155', border: '#1e293b' }
      : { foreground: '#334155', background: '#f8fafc', border: '#f1f5f9' };
  }
  const color = String(flag.color || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const channels = color.slice(1).match(/../g);
    const background = '#' + channels.map(channel => Math.round(parseInt(channel, 16) * 0.14 + 255 * 0.86).toString(16).padStart(2, '0')).join('');
    return { foreground: color, background, border: color };
  }
  const preset = Object.hasOwn(CHIP_COLORS, color) ? color : 'blue';
  const palette = CHIP_COLORS[preset];
  const offset = dark ? 2 : 0;
  return {
    foreground: personalFlagColor(preset, dark),
    background: palette[offset],
    border: palette[offset + 1],
  };
}
