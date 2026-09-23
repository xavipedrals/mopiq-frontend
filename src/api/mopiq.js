import { assertReviewSyncResults } from '../study/reviewSync';
import { supabase, supabaseAnonKey, supabaseUrl } from '../supabaseInit';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebaseInit';
import { deleteFirebaseUser, getAccessToken, getCurrentUser, logout } from '../auth/session';
import { MAX_REVIEW_DURATION_MS, PAGE_SIZE } from '../constants';
import { CARD_BROWSE_FIRST_PAGE, defaultCardBrowseQuery, toBrowseDeckCardsParams } from '../study/cardBrowse';
import { ankiDayEndExclusive, ankiDayStart, ankiDayString, studyDayWireFields, toIso } from '../study/ankiDay';
import { parseDeckConfig } from '../study/deckConfig';
import { mapDisplayProfileRow, mergeHighestStats } from '../profile/mapProfile';
import { getAvatarImageName, getDeckTopicByPostgresId } from '../utils';
import { edgeFunctionUrl } from './functionsUrl';
import { cacheDeck, cacheDeckList, clearDeckCache, prependCachedDeck, removeCachedDeck } from './deckCache';
import { emptyDeckCreatePayload } from './emptyDeck';
import {
  adoptFromProfileIfNeeded,
  getLanguagePreference,
  getLocale,
  localeForProfileSync,
} from '../i18n';
import { TTS_MAX_CHARS } from '../study/ttsLanguages';
import { applyDeckSettings } from '../study/deckSettings';
import {
  cardSyncFields,
  copiedCardFields,
  extractMediaFilenames,
  fieldsHaveAudio,
  replaceFrontBackFields,
  reversedCardFields,
} from '../study/cardFields';
import {
  CardHtmlTooLargeError,
  editorHtmlToStored,
  fieldsHaveImage,
  noteModelIdForWebFields,
  sanitizeCardHtml,
} from '../study/sanitizeCardHtml';
import { parseDeckFolders, rootFolderId } from '../study/deckFolders';
import {
  assertSpreadsheetLimits,
  spreadsheetCardFields,
} from '../study/spreadsheetImport';
import {
  edgeForSource,
  fileMatchesSource,
  fileTooLarge,
  MAGIC_IMPORT_BUCKET,
  magicImportObjectPath,
  mapImportJob,
  validateNotes,
  validatePrompt,
  validateYouTubeUrl,
} from '../study/magicImport';
import {
  MEDIA_URL_PAGE_SIZE,
  STUDY_BUNDLE_PAGE_SIZE,
  effectiveContentMode,
  emptyHistogram,
  isPostgresDeck,
  mapBrowseCard,
  mapDeckListRow,
  mapHistogramRow,
  mapProgressCountsRow,
  mapStudyBundleRow,
  mapUserDeckRow,
  nextStudyBundleCursor,
} from './webReads.js';

function throwIfError(error, fallback) {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

function bulkOp(id, entity, operation, recordId, payload) {
  return {
    id,
    entity,
    operation,
    record_id: String(recordId),
    payload: JSON.stringify(payload),
  };
}

async function invokeBulkSync(operations, fallback) {
  const token = await getAccessToken();
  const { data, error } = await supabase.functions.invoke('bulk_sync', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: { operations },
  });
  if (error) {
    let detail = error.message || fallback;
    try {
      const body = typeof error.context?.json === 'function'
        ? await error.context.json()
        : null;
      detail = body?.error || body?.results?.[0]?.error || detail;
    } catch {
      // keep detail
    }
    throw new Error(detail);
  }
  if (!data || !Array.isArray(data.results)) {
    throw new Error(data?.error || fallback);
  }
  const failed = data.results.find((row) => row.status !== 'ok');
  if (failed) {
    throw new Error(failed.error || fallback);
  }
  return data.results;
}

export { effectiveContentMode, isPostgresDeck };

export async function fetchDeckList() {
  const dayStart = toIso(ankiDayStart());
  const dayEnd = toIso(ankiDayEndExclusive());
  const supabaseUid = getCurrentUser()?.supabaseUid;
  const rows = [];
  let offset = 0;
  let page;
  do {
    const { data, error } = await supabase.rpc('get_user_deck_list_with_meta', {
      p_limit: PAGE_SIZE,
      p_study_day_start: dayStart,
      p_study_day_end_exclusive: dayEnd,
      p_offset: offset,
    });
    throwIfError(error, 'Could not load your decks');
    page = data || [];
    rows.push(...page);
    offset += page.length;
  } while (page.length >= PAGE_SIZE);

  return cacheDeckList(rows.map((row) => mapDeckListRow(row, supabaseUid)));
}

export async function fetchDeck(deckId) {
  const { data, error } = await supabase.rpc('get_user_deck', {
    p_deck_id: deckId,
  });
  throwIfError(error, 'Could not load this deck');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Deck not found');
  return cacheDeck(mapUserDeckRow(row, getCurrentUser()?.supabaseUid));
}

export async function fetchStudyTimeSummary(deckId) {
  const { data, error } = await supabase.rpc('get_user_deck_study_time_summary', {
    p_deck_id: deckId,
  });
  throwIfError(error, 'Could not load study time');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { todayMilliseconds: 0, totalMilliseconds: 0, activeDays: 0, firstStudiedAt: null };
  }
  return {
    todayMilliseconds: Number(row.today_milliseconds) || 0,
    totalMilliseconds: Number(row.total_milliseconds) || 0,
    activeDays: Number(row.active_days) || 0,
    firstStudiedAt: row.first_studied_at || null,
  };
}

export async function fetchAnswerHistogram(deckId) {
  if (!deckId) return emptyHistogram();
  const { data, error } = await supabase.rpc('get_deck_answer_histogram', {
    p_deck_id: deckId,
  });
  throwIfError(error, 'Could not load answer stats');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Grade unavailable');
  return mapHistogramRow(row);
}

function mapTodayStatsRow(deckId, row) {
  return {
    id: deckId,
    statsAvailable: true,
    newRemainingToday: Number(row?.new_remaining_today) || 0,
    reviewDueToday: Number(row?.review_due_today) || 0,
    cardsForToday: Number(row?.cards_for_today) || 0,
  };
}

export async function fetchDeckTodayStats(deck) {
  const deckId = deck?.id;
  if (!deckId) {
    return {
      id: deckId,
      statsAvailable: false,
      newRemainingToday: 0,
      reviewDueToday: 0,
      cardsForToday: 0,
    };
  }
  const { data, error } = await supabase.rpc('get_user_deck_today_stats', {
    p_deck_id: deckId,
    p_study_day_start: toIso(ankiDayStart()),
    p_study_day_end_exclusive: toIso(ankiDayEndExclusive()),
  });
  throwIfError(error, 'Could not load today’s stats');
  const row = Array.isArray(data) ? data[0] : data;
  return mapTodayStatsRow(deckId, row);
}

export async function fetchDeckProgressCounts(deckId) {
  const { data, error } = await supabase.rpc('get_deck_progress_counts', {
    p_deck_id: deckId,
    p_study_day_start: toIso(ankiDayStart()),
    p_study_day_end_exclusive: toIso(ankiDayEndExclusive()),
  });
  throwIfError(error, 'Could not load study progress');
  const row = Array.isArray(data) ? data[0] : data;
  return mapProgressCountsRow(row);
}

export async function fetchStudiedTodayCount(deckId) {
  return (await fetchDeckProgressCounts(deckId)).studiedToday;
}

export async function fetchSeenCount(deckId) {
  return (await fetchDeckProgressCounts(deckId)).seen;
}

export async function fetchCardsPage(
  deckId,
  offset = 0,
  limit = CARD_BROWSE_FIRST_PAGE,
  browse = defaultCardBrowseQuery(),
) {
  const { data, error } = await supabase.rpc(
    'browse_deck_cards',
    toBrowseDeckCardsParams(deckId, browse, offset, limit),
  );
  throwIfError(error, 'Could not load cards');
  const rows = data || [];
  return {
    cards: rows.map(mapBrowseCard),
    total: rows.length ? Number(rows[0].total_count) || rows.length : 0,
  };
}

export async function fetchAllStudyCards(deckId) {
  const all = [];
  let cursor = null;
  for (;;) {
    const params = {
      p_deck_id: deckId,
      p_limit: STUDY_BUNDLE_PAGE_SIZE,
    };
    if (cursor) {
      params.p_cursor_position = cursor.position;
      params.p_cursor_id = cursor.id;
    }
    const { data, error } = await supabase.rpc('get_deck_study_bundle', params);
    throwIfError(error, 'Could not load cards');
    const page = data || [];
    all.push(...page.map(mapStudyBundleRow));
    if (page.length < STUDY_BUNDLE_PAGE_SIZE) break;
    cursor = nextStudyBundleCursor(page);
    if (!cursor) break;
  }
  return all;
}

export async function fetchMediaMap(deckId) {
  const map = {};
  let cursor = null;
  for (;;) {
    const body = { deckVersionId: deckId, limit: MEDIA_URL_PAGE_SIZE };
    if (cursor) body.cursor = cursor;
    const parsed = await invokeEdgeFunction('get_deck_media_urls', body, 'Could not load media');
    const files = parsed?.files || [];
    for (const file of files) {
      if (file?.fileName && file?.url) map[file.fileName] = file.url;
    }
    if (!parsed?.nextCursor) break;
    cursor = parsed.nextCursor;
  }
  return map;
}

export async function submitReview({ deckId, card, previous, answer, durationMs, reviewedAt }) {
  const now = reviewedAt ? new Date(reviewedAt) : new Date();
  const studyDay = studyDayWireFields(now);
  const reviewedAtIso = toIso(now);
  const isFirstReview = !previous.firstReviewedAt && (previous.reviewCount || 0) === 0;
  const ops = [
    {
      id: 1,
      entity: 'cardStatus',
      operation: 'update',
      record_id: card.id,
      payload: JSON.stringify({
        cardId: card.id,
        deckId,
        ankiDay: ankiDayString(now),
        studyDayStart: studyDay.start,
        studyDayEndExclusive: studyDay.end,
        timezone: studyDay.timezone,
        dueDate: card.dueDate ? toIso(card.dueDate) : reviewedAtIso,
        lastReviewedAt: reviewedAtIso,
        updatedAt: reviewedAtIso,
        firstReviewedAt: isFirstReview ? reviewedAtIso : undefined,
        lastAnswerGiven: answer,
        easeFactor: card.easeFactor || 2500,
        intervalSecs: card.intervalSecs || 0,
        state: card.state,
        lapseCount: card.lapseCount || 0,
      }),
    },
    {
      id: 2,
      entity: 'reviewLog',
      operation: 'create',
      record_id: `${card.id}-${now.getTime()}`,
      payload: JSON.stringify({
        deckId,
        subdeckId: card.subdeckId || 0,
        cardId: card.id,
        durationMilliseconds: Math.max(0, Math.min(durationMs || 0, MAX_REVIEW_DURATION_MS)),
        reviewedAt: reviewedAtIso,
        studyDayStart: studyDay.start,
        studyDayEndExclusive: studyDay.end,
        timezone: studyDay.timezone,
        ease: answer,
      }),
    },
  ];

  const { data, error } = await supabase.functions.invoke('bulk_sync', {
    body: { operations: ops },
  });
  throwIfError(error, 'Could not save this review');
  const results = data?.results || [];
  assertReviewSyncResults(results);
  return results;
}

function deckRecordId(deck) {
  return deck.firebaseId || deck.id;
}

export async function saveDeckFolders(deck, decks) {
  const recordId = deckRecordId(deck);
  await invokeBulkSync(
    [bulkOp(1, 'deck', 'update', recordId, {
      id: recordId,
      firebaseId: recordId,
      decks,
    })],
    'Could not save folders',
  );
  return cacheDeck({ ...deck, decks });
}

export async function fetchSubdeckCardCounts(deckId) {
  const counts = {};
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('cards_static')
      .select('subdeck_id')
      .eq('deck_version_id', deckId)
      .is('deleted_at', null)
      .range(from, from + pageSize - 1);
    throwIfError(error, 'Could not load folders');
    const rows = data || [];
    for (const row of rows) {
      const id = Number(row.subdeck_id) || 0;
      counts[id] = (counts[id] || 0) + 1;
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return counts;
}

export async function saveDeckSettings(deck, settings) {
  const extra = applyDeckSettings(deck.extraConfig, {
    ...settings,
    expandPreset: settings.expandPreset !== false,
    updateNewCardsPerDay: settings.updateNewCardsPerDay !== false,
  });
  const recordId = deckRecordId(deck);
  const payload = {
    firebaseId: recordId,
    extra_config: extra,
  };
  if (settings.topic) payload.topic = settings.topic;
  if (typeof settings.name === 'string' && settings.name.trim()) {
    payload.name = settings.name.trim();
  }
  await invokeBulkSync([bulkOp(1, 'deck', 'update', recordId, payload)], 'Could not save settings');
  return extra;
}

export async function createDeck({ name, topic }) {
  const payload = emptyDeckCreatePayload({ name, topic });
  const results = await invokeBulkSync(
    [bulkOp(1, 'deck', 'create', payload.id, payload)],
    'Could not create this deck',
  );
  const deckId = results[0]?.data?.deckId;
  if (!deckId) throw new Error('Could not create this deck');
  let deck;
  try {
    deck = await fetchDeck(String(deckId));
  } catch {
    deck = cacheDeck({
      id: String(deckId),
      firebaseId: payload.id,
      name: payload.name,
      topic: getDeckTopicByPostgresId(payload.topic),
      cardCount: 0,
      extraConfig: {},
      decks: payload.decks,
      sharedDeckId: '',
      createdAt: payload.createdAt,
      lastUsedAt: payload.createdAt,
      creatorId: getCurrentUser()?.supabaseUid || '',
      contentMode: 'postgres',
      canStudy: true,
      canEdit: true,
      config: parseDeckConfig({}),
    });
  }
  return prependCachedDeck({
    ...deck,
    cardCount: deck.cardCount || 0,
    statsAvailable: true,
    newRemainingToday: 0,
    reviewDueToday: 0,
    cardsForToday: 0,
  });
}

const SPREADSHEET_CARD_BATCH = 80;

export async function importSpreadsheetCards(deck, cards, {
  subdeckId,
  startPosition = 0,
} = {}) {
  const folderId = subdeckId ?? rootFolderId(parseDeckFolders(deck.decks, deck.name)) ?? 0;
  const created = [];
  for (let offset = 0; offset < cards.length; offset += SPREADSHEET_CARD_BATCH) {
    const batch = cards.slice(offset, offset + SPREADSHEET_CARD_BATCH);
    const operations = batch.map((card, index) => {
      const cardId = crypto.randomUUID();
      const noteId = crypto.randomUUID();
      const { fields, noteModelId } = spreadsheetCardFields(card);
      const position = startPosition + offset + index;
      created.push({
        id: cardId,
        question: fields[0],
        answer: fields[1],
        noteFields: fields,
        position,
        hasImage: false,
        hasAudio: false,
        templateIndex: 0,
        subdeckId: folderId,
        noteId,
        noteGuid: noteId,
        noteModelId,
        tags: card.tags || ['from-spreadsheet'],
        updatedAt: new Date().toISOString(),
        dueDate: null,
        reviewCount: 0,
        state: 'NEW',
      });
      return bulkOp(index + 1, 'card', 'create', cardId, {
        deckId: deck.id,
        cardId,
        noteId,
        noteGuid: noteId,
        fields,
        question: fields[0],
        answer: fields[1],
        subdeckId: folderId,
        tags: card.tags || ['from-spreadsheet'],
        noteModelId,
        templateIndex: 0,
        position,
        hasImage: false,
        hasAudio: false,
        updatedAt: new Date().toISOString(),
      });
    });
    await invokeBulkSync(operations, 'Could not import these cards');
  }
  return created;
}

export class MagicImportError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'MagicImportError';
    this.code = details.code || '';
    this.deckId = details.deckId || '';
    this.jobId = details.jobId || '';
  }
}

async function postMagicImport(name, body) {
  const token = await getAccessToken();
  if (!token) throw new MagicImportError('Sign in to import cards');
  const response = await fetch(edgeFunctionUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    throw new MagicImportError(parsed?.error || text || 'Could not start this import', {
      code: parsed?.code,
      deckId: parsed?.deckId,
      jobId: parsed?.jobId,
    });
  }
  return parsed || {};
}

async function uploadMagicSource(userId, file) {
  const jobId = crypto.randomUUID();
  const storagePath = magicImportObjectPath(userId, jobId, file.name);
  const { error } = await supabase.storage.from(MAGIC_IMPORT_BUCKET).upload(storagePath, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new MagicImportError(error.message || 'Could not upload this file', { code: 'upload_failed' });
  return { jobId, storagePath };
}

async function deckFromImport(started, { name, topic, existingDeckId }) {
  if (existingDeckId) return null;
  try {
    const deck = await fetchDeck(started.deckId);
    return prependCachedDeck(deck);
  } catch {
    return prependCachedDeck({
      id: started.deckId,
      name: name || 'New deck',
      topic: getDeckTopicByPostgresId(topic || 'other'),
      cardCount: Number(started.insertedCards) || 0,
      statsAvailable: true,
      newRemainingToday: 0,
      reviewDueToday: 0,
      cardsForToday: 0,
      contentMode: 'postgres',
      canStudy: true,
      canEdit: true,
    });
  }
}

export async function fetchMagicImportJob(jobId) {
  const { data, error } = await supabase.rpc('get_magic_import_job', { p_job_id: jobId });
  throwIfError(error, 'Could not check this import');
  const row = Array.isArray(data) ? data[0] : data;
  return mapImportJob(row);
}

export async function startMagicImport({
  source,
  deckId = '',
  name = '',
  topic = 'other',
  text = '',
  file = null,
} = {}) {
  const edge = edgeForSource(source);
  if (!edge) throw new MagicImportError('This import is not available', { code: 'source_kind' });
  const preferredLanguage = getLocale() || 'en';
  const body = {
    name: String(name || '').trim(),
    topic,
    preferredLanguage,
  };
  if (deckId) body.deckVersionId = deckId;

  if (source === 'aiPrompt') {
    const code = validatePrompt(text);
    if (code) throw new MagicImportError('Could not start this import', { code });
    body.prompt = String(text).trim();
  } else if (source === 'paste') {
    const code = validateNotes(text);
    if (code) throw new MagicImportError('Could not start this import', { code });
    body.sourceKind = 'paste';
    body.text = String(text).trim();
  } else if (source === 'youtube') {
    const code = validateYouTubeUrl(text);
    if (code) throw new MagicImportError('Could not start this import', { code });
    body.sourceKind = 'youtube';
    body.url = String(text).trim();
  } else {
    if (!file) throw new MagicImportError('Choose a file first', { code: 'file_required' });
    if (!fileMatchesSource(source, file.name)) {
      throw new MagicImportError('That file type is not supported for this import', { code: 'file_type' });
    }
    if (fileTooLarge(source, file.size)) {
      throw new MagicImportError('That file is too large', { code: 'file_too_large' });
    }
    const userId = getCurrentUser()?.supabaseUid;
    if (!userId) throw new MagicImportError('Sign in to import cards');
    const uploaded = await uploadMagicSource(userId, file);
    body.jobId = uploaded.jobId;
    body.storagePath = uploaded.storagePath;
    if (source !== 'anki') body.sourceKind = source;
  }

  let started;
  try {
    started = await postMagicImport(edge, body);
  } catch (error) {
    if (error instanceof MagicImportError && error.deckId && !deckId) {
      await deckFromImport({ deckId: error.deckId }, { name, topic, existingDeckId: '' });
    }
    throw error;
  }
  const deck = await deckFromImport(started, { name, topic, existingDeckId: deckId });
  return {
    deckId: started.deckId,
    jobId: started.jobId || '',
    firebaseId: started.firebaseId || '',
    status: started.status || 'queued',
    insertedCards: Number(started.insertedCards) || 0,
    warnings: started.warnings || [],
    deck,
  };
}

export async function createDeckFromSpreadsheet({ name, topic, text, cards }) {
  assertSpreadsheetLimits(text, cards);
  const deck = await createDeck({ name, topic });
  try {
    await importSpreadsheetCards(deck, cards);
  } catch (error) {
    error.deckId = deck.id;
    throw error;
  }
  let saved;
  try {
    saved = await fetchDeck(deck.id);
  } catch {
    saved = { ...deck, cardCount: cards.length };
  }
  return prependCachedDeck({
    ...saved,
    cardCount: saved.cardCount || cards.length,
    statsAvailable: true,
    newRemainingToday: saved.cardCount || cards.length,
    reviewDueToday: 0,
    cardsForToday: saved.cardCount || cards.length,
  });
}

export async function createDeckCard(deck, {
  front,
  back,
  frontHtml,
  backHtml,
  position = null,
  subdeckId = 0,
  files = [],
} = {}) {
  const cardId = crypto.randomUUID();
  const noteId = crypto.randomUUID();
  const fields = sanitizeEditorFields(frontHtml ?? front, backHtml ?? back);
  const saved = await saveOwnedCard(deck, {
    cardId,
    noteId,
    noteGuid: noteId,
    fields,
    subdeckId,
    position,
  });
  await uploadPendingCardFiles(deck, cardId, files);
  return {
    id: cardId,
    question: saved.fields[0],
    answer: saved.fields[1],
    noteFields: saved.fields,
    position: position || 0,
    hasImage: saved.hasImage,
    hasAudio: fieldsHaveAudio(saved.fields),
    templateIndex: 0,
    subdeckId: subdeckId || 0,
    noteId,
    noteGuid: noteId,
    noteModelId: saved.noteModelId,
    tags: [],
    updatedAt: new Date().toISOString(),
    dueDate: null,
    reviewCount: 0,
    state: 'NEW',
  };
}

export async function updateDeckCard(deck, card, { front, back, frontHtml, backHtml, subdeckId, files = [] } = {}) {
  const [nextFront, nextBack] = sanitizeEditorFields(frontHtml ?? front, backHtml ?? back);
  const fields = replaceFrontBackFields(card, nextFront, nextBack);
  const saved = await saveOwnedCard(deck, {
    cardId: card.id,
    noteId: card.noteId || card.id,
    noteGuid: card.noteGuid || card.noteId || card.id,
    fields,
    subdeckId: subdeckId ?? card.subdeckId ?? 0,
    position: card.position || 0,
    hasAudio: fieldsHaveAudio(fields),
    tags: card.tags || [],
    templateIndex: card.templateIndex || 0,
  });
  await uploadPendingCardFiles(deck, card.id, files);
  return {
    ...card,
    question: saved.fields[0],
    answer: saved.fields[1],
    noteFields: saved.fields,
    hasImage: saved.hasImage,
    hasAudio: fieldsHaveAudio(saved.fields),
    noteModelId: saved.noteModelId,
    subdeckId: subdeckId ?? card.subdeckId ?? 0,
    updatedAt: new Date().toISOString(),
  };
}

function sanitizeEditorFields(front, back) {
  try {
    return [
      sanitizeCardHtml(editorHtmlToStored(front)),
      sanitizeCardHtml(editorHtmlToStored(back)),
    ];
  } catch (error) {
    if (error instanceof CardHtmlTooLargeError) throw error;
    throw error;
  }
}

async function saveOwnedCard(deck, payload) {
  const fields = payload.fields;
  const saved = await invokeEdgeFunction('save_owned_card', {
    deckVersionId: deck.id,
    cardId: payload.cardId,
    noteId: payload.noteId,
    noteGuid: payload.noteGuid,
    fields,
    subdeckId: payload.subdeckId || 0,
    position: payload.position,
    hasAudio: Boolean(payload.hasAudio) || fieldsHaveAudio(fields),
    tags: payload.tags || [],
    templateIndex: payload.templateIndex || 0,
    updatedAt: new Date().toISOString(),
  }, 'Could not save this card');
  return {
    fields: Array.isArray(saved?.fields) ? saved.fields : fields,
    hasImage: Boolean(saved?.hasImage ?? fieldsHaveImage(fields)),
    noteModelId: saved?.noteModelId || noteModelIdForWebFields(fields),
  };
}

async function uploadPendingCardFiles(deck, cardId, files) {
  for (const file of files || []) {
    if (!file?.blob) continue;
    await uploadDeckMediaFile(deck, cardId, file);
  }
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function uploadDeckMediaFile(deck, cardId, { blob, contentType, fileName }) {
  const data = await blobToBase64(blob);
  return invokeEdgeFunction('upload_deck_media', {
    deckVersionId: deck.id,
    cardId,
    data,
    contentType,
    fileName,
  }, 'Could not upload this file');
}

async function invokeEdgeFunction(name, body, fallback) {
  const token = await getAccessToken();
  if (!token) throw new Error(fallback);
  const response = await fetch(edgeFunctionUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    throw new Error(parsed?.error || text || fallback);
  }
  return parsed;
}

export async function fetchFreeStudyQuota(studyDay = ankiDayString()) {
  return invokeEdgeFunction('free_study_quota', { studyDay, delta: 0 }, 'Could not load today’s study limit');
}

export function incrementFreeStudyQuota(studyDay = ankiDayString(), delta = 1) {
  void invokeEdgeFunction('free_study_quota', { studyDay, delta }, 'Could not update today’s study limit')
    .catch(() => {});
}

async function invokeQuizFunction(name, body, fallback) {
  return invokeEdgeFunction(name, body, fallback);
}

export async function generateQuizQuestions({
  flashcards,
  difficulty,
  multi,
  trueFalse,
  count,
}) {
  return invokeQuizFunction('generate_quiz_questions', {
    flashcards,
    difficulty,
    is_multi_option_answer: Boolean(multi),
    is_true_false_answer: Boolean(trueFalse),
    requested_questions_count: count,
  }, 'Could not create the quiz');
}

export async function generateExtraQuizQuestions({ quizId, flashcards }) {
  return invokeQuizFunction('generate_extra_quiz_questions', {
    quiz_id: quizId,
    flashcards,
  }, 'Could not load more questions');
}

export function formatDuration(ms) {
  const totalMinutes = Math.round((ms || 0) / 60000);
  if (totalMinutes < 1) return '0 min';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
}

function isSupabaseAvatarPath(path) {
  const parts = String(path || '').split('/');
  return parts.length >= 3 && parts[0] === 'users' && isUuid(parts[1]);
}

function publicAssetUrl(path) {
  return `${supabaseUrl}/storage/v1/object/public/public-assets/${String(path)
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

async function resolveAvatarUrl({ imageStoragePath, firebaseId, avatarNumber }) {
  const fallback = getAvatarImageName(avatarNumber || 0);
  if (!imageStoragePath) return fallback;
  if (isSupabaseAvatarPath(imageStoragePath)) {
    return publicAssetUrl(imageStoragePath);
  }
  try {
    return await getDownloadURL(storageRef(storage, imageStoragePath));
  } catch {
    if (firebaseId) {
      try {
        return await getDownloadURL(storageRef(storage, `users/${firebaseId}/avatar.png`));
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

function emptyProfile(sessionUser) {
  return {
    ...mapDisplayProfileRow({}, { sessionUser }),
    avatarUrl: getAvatarImageName(0),
  };
}

async function withAvatar(profile) {
  return {
    ...profile,
    avatarUrl: await resolveAvatarUrl(profile),
  };
}

function getUserProfileUrl() {
  return edgeFunctionUrl('get_user_profile');
}

async function fetchSupabaseDisplayProfile(sessionUser, token) {
  const response = await fetch(getUserProfileUrl(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return mapDisplayProfileRow(payload.profile || {}, {
    sessionUser,
    email: payload.email,
    firebaseId: payload.firebaseId,
    supabaseUserId: payload.userId,
  });
}

async function fetchFirebaseDisplayProfile(sessionUser, firebaseId) {
  if (!firebaseId) return null;
  const snap = await getDoc(doc(db, 'users', firebaseId));
  if (!snap.exists()) return null;
  return mapDisplayProfileRow(snap.data() || {}, {
    sessionUser,
    firebaseId,
  });
}

function cardMutationPayload(deck, card, extras = {}) {
  const fields = cardSyncFields(card);
  return {
    deckId: deck.id,
    cardId: card.id,
    fields,
    noteId: card.noteId || card.id,
    noteGuid: card.noteGuid || card.noteId || card.id,
    question: card.question || fields[0] || '',
    answer: card.answer || fields[1] || '',
    subdeckId: Number(extras.subdeckId ?? card.subdeckId) || 0,
    tags: card.tags || [],
    noteModelId: String(card.noteModelId || '0'),
    templateIndex: card.templateIndex || 0,
    position: card.position || 0,
    hasImage: Boolean(card.hasImage),
    hasAudio: Boolean(card.hasAudio),
    updatedAt: new Date().toISOString(),
    ...extras.payload,
  };
}

export async function deleteOwnedDeck(deck) {
  const id = String(deck?.id || '');
  if (!id) throw new Error('Could not delete this deck');
  await invokeBulkSync([
    bulkOp(1, 'deck', 'delete', id, {}),
  ], 'Could not delete this deck');
  removeCachedDeck(id);
}

export async function resetDeckProgress(deck) {
  const id = String(deck?.id || '');
  if (!id) throw new Error('Could not reset progress');
  await invokeBulkSync([
    bulkOp(1, 'progressReset', 'create', id, {
      deckId: id,
      resetAt: new Date().toISOString(),
    }),
  ], 'Could not reset progress');
}

export async function deleteCurrentAccount() {
  const token = await getAccessToken();
  if (!token) throw new Error('Could not delete this account');
  try {
    await deleteFirebaseUser();
  } catch (error) {
    if (error?.code === 'auth/requires-recent-login') {
      const retry = new Error('Sign in again, then delete your account.');
      retry.code = 'requires-recent-login';
      throw retry;
    }
    throw error;
  }
  const response = await fetch(edgeFunctionUrl('delete_current_user'), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    throw new Error(parsed?.error || text || 'Could not delete this account');
  }
  try {
    await logout();
  } catch {
    // Firebase/Supabase sessions may already be gone.
  }
  clearDeckCache();
}

export async function requestTextToSpeech(text, language) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Enter text for AI to read.');
  if (trimmed.length > TTS_MAX_CHARS) throw new Error('Text must be under 300 characters.');
  const token = await getAccessToken();
  if (!token) throw new Error('Could not generate audio');
  const response = await fetch(edgeFunctionUrl('text_to_speech'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ text: trimmed, language }),
  });
  if (!response.ok) {
    const body = await response.text();
    let parsed = null;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch {
      parsed = null;
    }
    throw new Error(parsed?.error || body || 'Could not generate audio');
  }
  return response.blob();
}

function listedDuplicate(card, ids, saved) {
  return {
    id: ids.cardId,
    question: saved.fields[0] || '',
    answer: saved.fields[1] || '',
    noteFields: saved.fields,
    position: card.position || 0,
    hasImage: saved.hasImage,
    hasAudio: fieldsHaveAudio(saved.fields),
    templateIndex: card.templateIndex || 0,
    subdeckId: card.subdeckId || 0,
    noteId: ids.noteId,
    noteGuid: ids.noteId,
    noteModelId: saved.noteModelId,
    tags: card.tags || [],
    updatedAt: new Date().toISOString(),
    dueDate: null,
    reviewCount: 0,
    state: 'NEW',
  };
}

async function duplicateDeckCard(deck, card, fields) {
  const cardId = crypto.randomUUID();
  const noteId = crypto.randomUUID();
  const saved = await saveOwnedCard(deck, {
    cardId,
    noteId,
    noteGuid: noteId,
    fields,
    subdeckId: card.subdeckId || 0,
    position: null,
    hasAudio: fieldsHaveAudio(fields),
    tags: card.tags || [],
    templateIndex: card.templateIndex || 0,
  });
  try {
    await copyCardMedia(deck, deck, card, cardId);
  } catch {
    // The copy already exists; media can be recopied from the app.
  }
  return listedDuplicate(card, { cardId, noteId }, saved);
}

export async function copyDeckCard(deck, card) {
  return duplicateDeckCard(deck, card, copiedCardFields(card));
}

export async function reverseDeckCard(deck, card) {
  const fields = reversedCardFields(card);
  if (!fields) throw new Error('Could not reverse this card');
  return duplicateDeckCard(deck, card, fields);
}

async function invokeBulkSyncChunked(operations, fallback) {
  const size = 40;
  for (let offset = 0; offset < operations.length; offset += size) {
    const chunk = operations.slice(offset, offset + size).map((operation, index) => ({
      ...operation,
      id: index + 1,
    }));
    await invokeBulkSync(chunk, fallback);
  }
}

export async function deleteDeckCard(deck, card) {
  await deleteDeckCards(deck, [card]);
}

export async function deleteDeckCards(deck, cards) {
  const updatedAt = new Date().toISOString();
  await invokeBulkSyncChunked(cards.map((card, index) => bulkOp(index + 1, 'card', 'delete', card.id, {
    deckId: deck.id,
    cardId: card.id,
    updatedAt,
  })), 'Could not delete these cards');
}

export async function moveCardToSubdeck(deck, card, subdeckId) {
  await moveCardsToSubdeck(deck, [card], subdeckId);
}

export async function moveCardsToSubdeck(deck, cards, subdeckId) {
  await invokeBulkSyncChunked(cards.map((card, index) => bulkOp(index + 1, 'card', 'update', card.id, {
    ...cardMutationPayload(deck, card, { subdeckId, payload: { mutationScope: 'card' } }),
  })), 'Could not move these cards');
}

async function copyCardMedia(sourceDeck, targetDeck, sourceCard, targetCardId) {
  const filenames = extractMediaFilenames(sourceCard);
  if (!filenames.length) return;
  const { error } = await supabase.rpc('copy_owned_card_media', {
    p_source_deck_id: sourceDeck.id,
    p_target_deck_id: targetDeck.id,
    p_source_card_id: sourceCard.id,
    p_target_card_id: targetCardId,
    p_file_names: filenames,
  });
  throwIfError(error, 'Could not copy card media');
}

export async function moveCardToAnotherDeck(sourceDeck, card, targetDeck, targetSubdeckId) {
  const newCardId = crypto.randomUUID();
  const newNoteId = crypto.randomUUID();
  const payload = cardMutationPayload(sourceDeck, card, { subdeckId: targetSubdeckId });
  await invokeBulkSync([
    bulkOp(1, 'card', 'create', newCardId, {
      ...payload,
      deckId: targetDeck.id,
      cardId: newCardId,
      noteId: newNoteId,
      noteGuid: newNoteId,
      position: null,
    }),
    bulkOp(2, 'card', 'delete', card.id, {
      deckId: sourceDeck.id,
      cardId: card.id,
      updatedAt: payload.updatedAt,
    }),
  ], 'Could not move this card');
  try {
    await copyCardMedia(sourceDeck, targetDeck, card, newCardId);
  } catch {
    // The card itself already moved; media can be recopied from the app.
  }
}

export async function updateUserProfileAnswerFeedback(position) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;
  await invokeBulkSync([
    bulkOp(1, 'userProfile', 'update', userId, { answerFeedbackPosition: position }),
  ], 'Could not save answer toast');
}

export async function updateUserProfileLocale(locale) {
  const code = String(locale || '').trim();
  if (!code) return;
  const token = await getAccessToken();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;
  const { data, error } = await supabase.functions.invoke('bulk_sync', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: {
      operations: [{
        id: 1,
        entity: 'userProfile',
        operation: 'update',
        record_id: userId,
        payload: JSON.stringify({ locale: code }),
      }],
    },
  });
  throwIfError(error, 'Could not save language');
  const failed = (data?.results || []).find((row) => row.status !== 'ok');
  if (failed) {
    throw new Error(failed.error || 'Could not save language');
  }
}

let languageHydratedForUser = null;

export async function hydrateLanguageFromProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId || languageHydratedForUser === userId) return;
  languageHydratedForUser = userId;
  if (getLanguagePreference()) {
    try {
      await updateUserProfileLocale(localeForProfileSync());
    } catch {
      // local preference still applies
    }
    return;
  }
  try {
    const profile = await fetchUserProfile();
    adoptFromProfileIfNeeded(profile.locale);
  } catch {
    // keep browser language
  }
}

export async function fetchUserProfile() {
  const sessionUser = getCurrentUser();
  const token = await getAccessToken();
  let supabaseProfile = null;
  if (token) {
    try {
      supabaseProfile = await fetchSupabaseDisplayProfile(sessionUser, token);
    } catch (error) {
      console.warn('Could not load profile from Supabase', error);
    }
  }

  let firebaseProfile = null;
  const firebaseId = supabaseProfile?.firebaseId || sessionUser?.firebaseUid;
  try {
    firebaseProfile = await fetchFirebaseDisplayProfile(sessionUser, firebaseId);
  } catch (error) {
    if (error?.code !== 'permission-denied') {
      console.warn('Could not load profile from Firebase', error);
    }
  }

  const merged = mergeHighestStats(supabaseProfile, firebaseProfile);
  if (!merged) return emptyProfile(sessionUser);
  return withAvatar(merged);
}
