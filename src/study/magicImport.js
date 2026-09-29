export const MAGIC_IMPORT_BUCKET = 'user-imports';
export const POLL_INTERVAL_MS = 2000;
export const MIN_PROMPT_CHARS = 8;
export const MAX_PROMPT_CHARS = 2000;
export const MIN_NOTES_CHARS = 200;
export const MAX_NOTES_CHARS = 400_000;
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
export const MAX_ANKI_BYTES = 80 * 1024 * 1024;

// Tabler Icons (MIT), outline set. https://tabler.io/icons
const ICONS = {
  sparkles: ['M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z'],
  pdf: [
    'M14 3v4a1 1 0 0 0 1 1h4',
    'M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4',
    'M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6',
    'M17 18h2',
    'M20 15h-3v6',
    'M11 15v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2h-1z',
  ],
  ppt: [
    'M14 3v4a1 1 0 0 0 1 1h4',
    'M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6',
    'M11 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6',
    'M16.5 15h3',
    'M18 15v6',
    'M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4',
  ],
  word: [
    'M14 3v4a1 1 0 0 0 1 1h4',
    'M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4',
    'M5 15v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2h-1z',
    'M20 16.5a1.5 1.5 0 0 0 -3 0v3a1.5 1.5 0 0 0 3 0',
    'M12.5 15a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1 -3 0v-3a1.5 1.5 0 0 1 1.5 -1.5z',
  ],
  headphones: [
    'M4 13m0 2a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z',
    'M15 13m0 2a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z',
    'M4 15v-3a8 8 0 0 1 16 0v3',
  ],
  camera: [
    'M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2',
    'M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
  ],
  box: [
    'M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5',
    'M12 12l8 -4.5',
    'M12 12l0 9',
    'M12 12l-8 -4.5',
    'M16 5.25l-8 4.5',
  ],
  paste: [
    'M5 3m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z',
    'M9 7l6 0',
    'M9 11l6 0',
    'M9 15l4 0',
  ],
  table: [
    'M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z',
    'M3 10h18',
    'M10 3v18',
  ],
  youtube: [
    'M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8z',
    'M10 9l5 3l-5 3z',
  ],
};

const FILE_DROP_SOURCES = new Set(['pdf', 'powerpoint', 'word', 'photo', 'audioFile', 'anki']);

const FILE_EXTENSIONS = {
  pdf: ['pdf'],
  powerpoint: ['pptx'],
  word: ['docx'],
  photo: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  audioFile: ['mp3', 'm4a', 'wav', 'webm', 'mp4', 'aac', 'ogg'],
  anki: ['apkg', 'colpkg'],
};

const ACCEPT = {
  pdf: '.pdf,application/pdf',
  powerpoint: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  word: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  photo: 'image/jpeg,image/png,image/gif,image/webp',
  audioFile: 'audio/*,.mp3,.m4a,.wav,.webm,.mp4,.aac,.ogg',
  anki: '.apkg,.colpkg,application/zip',
};

export const MAGIC_SOURCES = [
  { id: 'aiPrompt', titleKey: 'decks.magicAiPrompt', edge: 'create_deck_from_prompt', icon: ICONS.sparkles },
  { id: 'pdf', titleKey: 'decks.magicPdf', edge: 'create_deck_from_file', icon: ICONS.pdf },
  { id: 'powerpoint', titleKey: 'decks.magicPowerpoint', edge: 'create_deck_from_file', icon: ICONS.ppt },
  { id: 'word', titleKey: 'decks.magicWord', edge: 'create_deck_from_file', icon: ICONS.word },
  { id: 'audioFile', titleKey: 'decks.magicAudioFile', edge: 'create_deck_from_audio', icon: ICONS.headphones },
  { id: 'photo', titleKey: 'decks.magicPhoto', edge: 'create_deck_from_file', icon: ICONS.camera },
  { id: 'anki', titleKey: 'decks.magicAnki', edge: 'import_anki_package', icon: ICONS.box },
  { id: 'paste', titleKey: 'decks.magicPaste', edge: 'create_deck_from_text', icon: ICONS.paste },
  { id: 'sheets', titleKey: 'decks.magicSheets', edge: '', icon: ICONS.table },
  { id: 'youtube', titleKey: 'decks.magicYoutube', edge: 'create_deck_from_text', icon: ICONS.youtube },
];

export function isFileDropSource(sourceId) {
  return FILE_DROP_SOURCES.has(sourceId);
}

export function sourcesForExistingDeck() {
  return MAGIC_SOURCES.filter((source) => source.id !== 'anki');
}

export function magicImportRoute(sourceId, { existingDeck = false } = {}) {
  const source = MAGIC_SOURCES.find((item) => item.id === sourceId);
  if (!source) return 'rejected';
  if (source.id === 'anki') return existingDeck ? 'rejected' : 'appOnly';
  if (source.id === 'sheets') return 'spreadsheet';
  return 'job';
}

export function edgeForSource(sourceId) {
  return MAGIC_SOURCES.find((source) => source.id === sourceId)?.edge || '';
}

export function acceptForSource(sourceId) {
  return ACCEPT[sourceId] || '';
}

export function fileMatchesSource(sourceId, fileName) {
  const ext = String(fileName || '').split('.').pop().toLowerCase();
  return (FILE_EXTENSIONS[sourceId] || []).includes(ext);
}

export function fileTooLarge(sourceId, size) {
  const limit = sourceId === 'anki' ? MAX_ANKI_BYTES : MAX_IMPORT_BYTES;
  return Number(size) > limit;
}

export function validatePrompt(text) {
  const value = String(text || '').trim();
  if (value.length < MIN_PROMPT_CHARS) return 'prompt_too_short';
  if (value.length > MAX_PROMPT_CHARS) return 'prompt_too_long';
  return '';
}

export function validateNotes(text) {
  const value = String(text || '').trim();
  if (value.length < MIN_NOTES_CHARS) return 'notes_too_short';
  if (value.length > MAX_NOTES_CHARS) return 'notes_too_long';
  return '';
}

export function validateYouTubeUrl(url) {
  const value = String(url || '').trim();
  if (!/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?|shorts\/|live\/|embed\/)|youtu\.be\/)/i.test(value)) {
    return 'youtube_invalid';
  }
  return '';
}

const MAX_OBJECT_NAME = 80;
const MAX_OBJECT_EXT = 12;

export function magicImportObjectPath(userId, jobId, fileName) {
  const cleaned = String(fileName || 'source')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '');
  const dot = cleaned.lastIndexOf('.');
  const hasExt = dot > 0 && dot < cleaned.length - 1;
  const ext = hasExt ? cleaned.slice(dot + 1).slice(0, MAX_OBJECT_EXT).toLowerCase() : '';
  const base = (hasExt ? cleaned.slice(0, dot) : cleaned).replace(/\.+$/, '');
  const suffix = ext ? `.${ext}` : '';
  const safe = `${base.slice(0, Math.max(1, MAX_OBJECT_NAME - suffix.length))}${suffix}` || 'source';
  return `users/${String(userId || '').toLowerCase()}/imports/${String(jobId || '').toLowerCase()}/${safe}`;
}

export function mapImportJob(row) {
  if (!row?.job_id && !row?.jobId) return null;
  return {
    jobId: row.job_id || row.jobId,
    deckVersionId: row.deck_version_id || row.deckVersionId,
    sourceKind: row.source_kind || row.sourceKind,
    status: row.status,
    progress: Number(row.progress) || 0,
    targetCards: row.target_cards ?? row.targetCards ?? null,
    generatedCards: row.generated_cards ?? row.generatedCards ?? null,
    insertedCards: Number(row.inserted_cards ?? row.insertedCards) || 0,
    warningMessages: row.warning_messages || row.warningMessages || [],
    errorCode: row.error_code || row.errorCode || '',
    errorMessage: row.error_message || row.errorMessage || '',
  };
}

export function usesPdfPagePicker(source) {
  return source === 'pdf';
}

export function backgroundsPromptDeck({ source, deckId, jobId, status } = {}) {
  if (source !== 'aiPrompt' || deckId || !jobId) return false;
  return importJobView({ status: status || 'queued' }).phase === 'active';
}

export function importJobView(job) {
  const status = job?.status || '';
  const failed = status === 'failed';
  const finished = status === 'done' || status === 'done_with_warnings';
  const active = status === 'queued' || status === 'generating';
  let phase = 'missing';
  if (failed) phase = 'failed';
  else if (finished) phase = 'done';
  else if (active) phase = 'active';
  return {
    phase,
    progress: Number(job?.progress) || 0,
    finished,
    failed,
    warnings: status === 'done_with_warnings',
  };
}
