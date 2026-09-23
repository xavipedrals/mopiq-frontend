export const MAGIC_IMPORT_BUCKET = 'user-imports';
export const POLL_INTERVAL_MS = 2000;
export const MIN_PROMPT_CHARS = 8;
export const MAX_PROMPT_CHARS = 2000;
export const MIN_NOTES_CHARS = 200;
export const MAX_NOTES_CHARS = 400_000;
export const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
export const MAX_ANKI_BYTES = 80 * 1024 * 1024;

const ICONS = {
  sparkles: 'M12 2.4l1.15 5.05L18 8.6l-4.85 1.15L12 14.8l-1.15-5.05L6 8.6l4.85-1.15L12 2.4zm6.6 10.3l.7 3.05 3.1.7-3.1.7-.7 3.05-.7-3.05-3.1-.7 3.1-.7.7-3.05zM5.4 14.2l.55 2.4 2.45.55-2.45.55-.55 2.4-.55-2.4-2.45-.55 2.45-.55.55-2.4z',
  pdf: 'M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm7 1.5V9h4.5',
  ppt: 'M4 7.5h11a2 2 0 0 1 2 2V18H6a2 2 0 0 1-2-2V7.5zm4-3h11a2 2 0 0 1 2 2v1.2',
  word: 'M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 7l1.4 7h1.3L14.2 12 16 17h1.3L17 10h-1.3l-1.2 5.2L13.2 10H12l-1.3 5.2L9.6 10H8.2z',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm7 9a7 7 0 0 1-14 0h2a5 5 0 0 0 10 0h2zM11 19h2v2h-2z',
  headphones: 'M5 13a7 7 0 0 1 14 0v6a2 2 0 0 1-2 2h-1v-7h3M8 21H7a2 2 0 0 1-2-2v-6h3v7z',
  camera: 'M9 6l1.2-1.6A2 2 0 0 1 11.8 4h.4a2 2 0 0 1 1.6.4L15 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3zm3 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  box: 'M3.5 8.5L12 4l8.5 4.5v9L12 22l-8.5-4.5v-9zM12 12.5l8.5-4.5M12 12.5V22M12 12.5L3.5 8.5',
  paste: 'M8 4h2.2a2 2 0 0 1 3.6 0H16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm1 7h6v1.6H9V11zm0 3.5h6V16H9v-1.5z',
  table: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm0 4h16M4 14h16M10 6v12',
  youtube: 'M3 8.2A3.2 3.2 0 0 1 6.2 5h11.6A3.2 3.2 0 0 1 21 8.2v7.6A3.2 3.2 0 0 1 17.8 19H6.2A3.2 3.2 0 0 1 3 15.8V8.2zM10 9.2v5.6l5-2.8-5-2.8z',
};

const FILE_EXTENSIONS = {
  pdf: ['pdf'],
  powerpoint: ['pptx'],
  word: ['docx'],
  photo: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  record: ['mp3', 'm4a', 'wav', 'webm', 'mp4', 'aac', 'ogg'],
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
  { id: 'aiPrompt', titleKey: 'decks.magicAiPrompt', edge: 'create_deck_from_prompt', icon: ICONS.sparkles, filled: true },
  { id: 'pdf', titleKey: 'decks.magicPdf', edge: 'create_deck_from_file', icon: ICONS.pdf },
  { id: 'powerpoint', titleKey: 'decks.magicPowerpoint', edge: 'create_deck_from_file', icon: ICONS.ppt },
  { id: 'word', titleKey: 'decks.magicWord', edge: 'create_deck_from_file', icon: ICONS.word },
  { id: 'record', titleKey: 'decks.magicRecord', edge: 'create_deck_from_audio', icon: ICONS.mic },
  { id: 'audioFile', titleKey: 'decks.magicAudioFile', edge: 'create_deck_from_audio', icon: ICONS.headphones },
  { id: 'photo', titleKey: 'decks.magicPhoto', edge: 'create_deck_from_file', icon: ICONS.camera },
  { id: 'anki', titleKey: 'decks.magicAnki', edge: 'import_anki_package', icon: ICONS.box },
  { id: 'paste', titleKey: 'decks.magicPaste', edge: 'create_deck_from_text', icon: ICONS.paste },
  { id: 'sheets', titleKey: 'decks.magicSheets', edge: '', icon: ICONS.table },
  { id: 'youtube', titleKey: 'decks.magicYoutube', edge: 'create_deck_from_text', icon: ICONS.youtube },
];

export function sourcesForExistingDeck() {
  return MAGIC_SOURCES.filter((source) => source.id !== 'anki');
}

export function magicImportRoute(sourceId, { existingDeck = false } = {}) {
  const source = MAGIC_SOURCES.find((item) => item.id === sourceId);
  if (!source) return 'rejected';
  if (existingDeck && source.id === 'anki') return 'rejected';
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

export function magicImportObjectPath(userId, jobId, fileName) {
  const safe = String(fileName || 'source')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80) || 'source';
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
