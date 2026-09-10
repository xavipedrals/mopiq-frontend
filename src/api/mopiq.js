import { supabase, supabaseAnonKey, supabaseUrl } from '../supabaseInit';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebaseInit';
import { getAccessToken, getCurrentUser } from '../auth/session';
import { CARD_PAGE_SIZE, FETCH_PAGE_SIZE, MAX_REVIEW_DURATION_MS, PAGE_SIZE } from '../constants';
import { ankiDayEndExclusive, ankiDayStart, ankiDayString, studyDayWireFields, toIso } from '../study/ankiDay';
import { parseDeckConfig } from '../study/deckConfig';
import { mapDisplayProfileRow, mergeHighestStats } from '../profile/mapProfile';
import { getAvatarImageName, getDeckTopicByPostgresId } from '../utils';
import { edgeFunctionUrl } from './functionsUrl';
import { cacheDeck, cacheDeckList } from './deckCache';
import {
  adoptFromProfileIfNeeded,
  getLanguagePreference,
  localeForProfileSync,
} from '../i18n';
import { applyDeckSettings } from '../study/deckSettings';
import { editorTextToHtml, replaceFrontBackFields } from '../study/cardFields';
import { todayStatsFromCounts } from '../study/deckStats';

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

async function upsertOwnedCard(deck, {
  cardId,
  noteId,
  noteGuid,
  fields,
  frontHtml,
  backHtml,
  subdeckId = 0,
  position = null,
  hasImage = false,
  hasAudio = false,
  tags = [],
  noteModelId = '0',
  templateIndex = 0,
}) {
  const { error } = await supabase.rpc('upsert_card_static_for_caller', {
    p_deck_version_id: deck.id,
    p_card_id: cardId,
    p_fields: fields,
    p_subdeck_id: subdeckId,
    question: frontHtml,
    answer: backHtml,
    has_image: hasImage,
    has_audio: hasAudio,
    updated_at: new Date().toISOString(),
    p_tags: tags,
    p_position: position,
    note_model_id: String(noteModelId || '0'),
    template_index: templateIndex,
    p_note_id: noteId,
    p_note_guid: noteGuid,
  });
  throwIfError(error, 'Could not save this card');
}

export function effectiveContentMode(row) {
  const mode2 = (row.content_mode_2 || '').trim();
  if (mode2) return mode2;
  const mode = (row.content_mode || '').trim();
  if (!mode || mode === 'file') return 'legacy_firebase_file';
  return mode;
}

export function isPostgresDeck(mode) {
  return mode === 'postgres' || mode === 'postgres_content' || mode === 'postgresContent';
}

async function fetchAllPages(loadPage) {
  const all = [];
  let offset = 0;
  let page = await loadPage(offset, FETCH_PAGE_SIZE);
  while (page.length > 0) {
    all.push(...page);
    if (page.length < FETCH_PAGE_SIZE) break;
    offset += page.length;
    page = await loadPage(offset, FETCH_PAGE_SIZE);
  }
  return all;
}

export async function fetchDeckList() {
  const dayStart = toIso(ankiDayStart());
  const dayEnd = toIso(ankiDayEndExclusive());
  const statsRows = [];
  let offset = 0;
  let page;
  do {
    const { data, error } = await supabase.rpc('get_user_deck_list_stats', {
      p_limit: PAGE_SIZE,
      p_study_day_start: dayStart,
      p_study_day_end_exclusive: dayEnd,
      p_offset: offset,
    });
    throwIfError(error, 'Could not load your decks');
    page = data || [];
    statsRows.push(...page);
    offset += page.length;
  } while (page.length >= PAGE_SIZE);

  const ids = statsRows.map((row) => row.deck_id).filter(Boolean);
  const metaById = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { data, error } = await supabase
      .from('deck_versions')
      .select('id, name, topic, card_count, extra_config, created_at, content_mode, content_mode_2, last_used_at')
      .in('id', chunk);
    throwIfError(error, 'Could not load deck names');
    for (const row of data || []) {
      metaById[row.id] = row;
    }
  }

  return cacheDeckList(statsRows.map((row) => {
    const meta = metaById[row.deck_id] || {};
    const mode = effectiveContentMode({
      content_mode: row.content_mode || meta.content_mode,
      content_mode_2: meta.content_mode_2,
    });
    const topic = getDeckTopicByPostgresId(meta.topic);
    return {
      id: row.deck_id,
      firebaseId: row.firebase_id,
      name: meta.name || 'Untitled deck',
      topic,
      cardCount: meta.card_count ?? row.card_count ?? 0,
      lastUsedAt: row.last_used_at || meta.last_used_at,
      createdAt: meta.created_at,
      extraConfig: meta.extra_config || {},
      contentMode: mode,
      canStudy: isPostgresDeck(mode),
      statsAvailable: Boolean(row.stats_available),
      newRemainingToday: Number(row.new_remaining_today) || 0,
      reviewDueToday: Number(row.review_due_today) || 0,
      cardsForToday: Number(row.cards_for_today) || 0,
    };
  }));
}

export async function fetchDeck(deckId) {
  const { data, error } = await supabase
    .from('deck_versions')
    .select('id, name, topic, card_count, extra_config, created_at, content_mode, content_mode_2, last_used_at, firebase_id, creator_id')
    .eq('id', deckId)
    .maybeSingle();
  throwIfError(error, 'Could not load this deck');
  if (!data) throw new Error('Deck not found');
  const mode = effectiveContentMode(data);
  return cacheDeck({
    id: data.id,
    name: data.name || 'Untitled deck',
    topic: getDeckTopicByPostgresId(data.topic),
    cardCount: data.card_count || 0,
    extraConfig: data.extra_config || {},
    createdAt: data.created_at,
    lastUsedAt: data.last_used_at,
    firebaseId: data.firebase_id || '',
    creatorId: data.creator_id || '',
    contentMode: mode,
    canStudy: isPostgresDeck(mode),
    canEdit: isPostgresDeck(mode) && (
      !data.creator_id || data.creator_id === getCurrentUser()?.supabaseUid
    ),
    config: parseDeckConfig(data.extra_config),
  });
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
  const counts = { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 };
  let from = 0;
  let page;
  do {
    const { data, error } = await supabase
      .from('review_logs')
      .select('ease')
      .eq('deck_id', deckId)
      .range(from, from + FETCH_PAGE_SIZE - 1);
    throwIfError(error, 'Could not load answer stats');
    page = data || [];
    for (const row of page) {
      const ease = String(row.ease || 'GOOD').toUpperCase();
      if (counts[ease] != null) counts[ease] += 1;
    }
    from += page.length;
  } while (page.length >= FETCH_PAGE_SIZE && from <= 20000);
  const total = counts.AGAIN + counts.HARD + counts.GOOD + counts.EASY;
  const grade = total === 0
    ? 0
    : Math.round(((counts.EASY * 1 + counts.GOOD * 0.66 + counts.HARD * 0.33) / total) * 100);
  return { counts, total, grade };
}

async function countCardStates(deckId, fallback, applyFilters) {
  let query = supabase
    .from('user_card_states')
    .select('card_id', { count: 'exact', head: true })
    .eq('deck_version_id', deckId);
  if (applyFilters) query = applyFilters(query);
  const { count, error } = await query;
  throwIfError(error, fallback);
  return count || 0;
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

function rpcMissing(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === 'PGRST202' || code === '42883' || /get_user_deck_today_stats/i.test(message);
}

/**
 * Same remaining-new / live-due math as get_user_deck_list_stats, via a
 * per-deck RPC that is not cohort-gated. Falls back to client counts only
 * when that RPC has not been deployed yet.
 */
export async function fetchDeckTodayStats(deck) {
  const deckId = deck?.id;
  if (!deckId) return { id: deckId, ...todayStatsFromCounts() };
  const { data, error } = await supabase.rpc('get_user_deck_today_stats', {
    p_deck_id: deckId,
    p_study_day_start: toIso(ankiDayStart()),
    p_study_day_end_exclusive: toIso(ankiDayEndExclusive()),
  });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return mapTodayStatsRow(deckId, row);
  }
  if (!rpcMissing(error)) throwIfError(error, 'Could not load today’s stats');
  return fetchDeckTodayStatsFromCardStates(deck);
}

async function fetchDeckTodayStatsFromCardStates(deck) {
  const deckId = deck.id;
  const config = deck.config || parseDeckConfig(deck.extraConfig);
  const dayStart = toIso(ankiDayStart());
  const dayEnd = toIso(ankiDayEndExclusive());
  const fallback = 'Could not load today’s stats';
  const [progressCount, newStudiedToday, rawDueCount] = await Promise.all([
    countCardStates(deckId, fallback),
    countCardStates(deckId, fallback, (query) => query
      .not('first_reviewed_at', 'is', null)
      .gte('first_reviewed_at', dayStart)
      .lt('first_reviewed_at', dayEnd)),
    countCardStates(deckId, fallback, (query) => query
      .in('state', ['LEARNING', 'RELEARNING', 'REVIEW'])
      .eq('suspended', false)
      .lt('due_date', dayEnd)),
  ]);
  return {
    id: deckId,
    ...todayStatsFromCounts({
      cardCount: deck.cardCount || 0,
      progressCount,
      newStudiedToday,
      rawDueCount,
      newCardsPerDay: config.newCardsPerDay,
      maxReviewsPerDay: config.maxReviewsPerDay,
    }),
  };
}

/** Cards touched during the current Anki day, for the dashboard ring. */
export async function fetchStudiedTodayCount(deckId) {
  const { count, error } = await supabase
    .from('user_card_states')
    .select('card_id', { count: 'exact', head: true })
    .eq('deck_version_id', deckId)
    .gte('last_reviewed', toIso(ankiDayStart()))
    .lt('last_reviewed', toIso(ankiDayEndExclusive()));
  throwIfError(error, 'Could not load today’s progress');
  return count || 0;
}

export async function fetchSeenCount(deckId) {
  const { count, error } = await supabase
    .from('user_card_states')
    .select('card_id', { count: 'exact', head: true })
    .eq('deck_version_id', deckId)
    .gt('review_count', 0);
  throwIfError(error, 'Could not load study progress');
  return count || 0;
}

export async function fetchCardsPage(deckId, offset = 0, limit = CARD_PAGE_SIZE) {
  const { data, error, count } = await supabase
    .from('cards_static')
    .select('id, question, answer, note_fields, position, has_image, has_audio, template_index, subdeck_id, note_id, note_guid, note_model_id, note_tags', { count: 'exact' })
    .eq('deck_version_id', deckId)
    .is('deleted_at', null)
    .order('position', { ascending: true })
    .range(offset, offset + limit - 1);
  throwIfError(error, 'Could not load cards');
  return {
    cards: (data || []).map(mapStaticCard),
    total: count || 0,
  };
}

export async function fetchAllStudyCards(deckId) {
  const [staticCards, states] = await Promise.all([
    fetchAllPages(async (offset, limit) => {
      const { data, error } = await supabase
        .from('cards_static')
        .select('id, question, answer, note_fields, position, has_image, has_audio, template_index, subdeck_id, deleted_at')
        .eq('deck_version_id', deckId)
        .is('deleted_at', null)
        .order('position', { ascending: true })
        .range(offset, offset + limit - 1);
      throwIfError(error, 'Could not load cards');
      return data || [];
    }),
    fetchAllPages(async (offset, limit) => {
      const { data, error } = await supabase
        .from('user_card_states')
        .select('card_id, ease_factor, interval_secs, review_count, lapse_count, interval_secs_before_lapse, due_date, last_reviewed, last_answer_given, state, suspended, first_reviewed_at, updated_at')
        .eq('deck_version_id', deckId)
        .range(offset, offset + limit - 1);
      throwIfError(error, 'Could not load study progress');
      return data || [];
    }),
  ]);

  const stateById = {};
  for (const row of states) stateById[row.card_id] = row;

  return staticCards
    .filter((row) => !row.deleted_at)
    .map((row) => mergeCardAndState(mapStaticCard(row), stateById[row.id]));
}

function mapStaticCard(row) {
  return {
    id: row.id,
    question: row.question || '',
    answer: row.answer || '',
    noteFields: Array.isArray(row.note_fields) ? row.note_fields : [],
    position: row.position || 0,
    hasImage: Boolean(row.has_image),
    hasAudio: Boolean(row.has_audio),
    templateIndex: row.template_index || 0,
    subdeckId: row.subdeck_id || 0,
    noteId: row.note_id || row.id,
    noteGuid: row.note_guid || row.note_id || row.id,
    noteModelId: row.note_model_id || '0',
    tags: Array.isArray(row.note_tags) ? row.note_tags : (row.tags || []),
  };
}

function mergeCardAndState(card, state) {
  if (!state) {
    return {
      ...card,
      state: 'NEW',
      easeFactor: 2500,
      intervalSecs: 0,
      reviewCount: 0,
      lapseCount: 0,
      intervalSecsBeforeLapse: null,
      dueDate: null,
      lastReviewedAt: null,
      firstReviewedAt: null,
      lastAnswerGiven: null,
      suspended: false,
    };
  }
  return {
    ...card,
    state: state.state || 'NEW',
    easeFactor: state.ease_factor || 2500,
    intervalSecs: state.interval_secs || 0,
    reviewCount: state.review_count || 0,
    lapseCount: state.lapse_count || 0,
    intervalSecsBeforeLapse: state.interval_secs_before_lapse,
    dueDate: state.due_date,
    lastReviewedAt: state.last_reviewed,
    firstReviewedAt: state.first_reviewed_at,
    lastAnswerGiven: state.last_answer_given,
    suspended: Boolean(state.suspended),
  };
}

export async function fetchMediaMap(deckId) {
  const { data, error } = await supabase
    .from('deck_version_media')
    .select('file_name, storage_path')
    .eq('deck_version_id', deckId)
    .is('deleted_at', null);
  throwIfError(error, 'Could not load media');
  const map = {};
  await Promise.all((data || []).map(async (row) => {
    if (!row.storage_path || !row.file_name) return;
    const { data: signed, error: signedError } = await supabase.storage
      .from('deck-media')
      .createSignedUrl(row.storage_path, 3600);
    if (!signedError && signed?.signedUrl) {
      map[row.file_name] = signed.signedUrl;
    }
  }));
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
  const failed = results.find((row) => row.status !== 'ok');
  if (failed) {
    throw new Error(failed.error || 'Could not save this review');
  }
  return results;
}

function deckRecordId(deck) {
  return deck.firebaseId || deck.id;
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

export async function createDeckCard(deck, { front, back, position = null }) {
  const cardId = crypto.randomUUID();
  const noteId = crypto.randomUUID();
  const frontHtml = editorTextToHtml(front);
  const backHtml = editorTextToHtml(back);
  const fields = [frontHtml, backHtml];
  await upsertOwnedCard(deck, {
    cardId,
    noteId,
    noteGuid: noteId,
    fields,
    frontHtml,
    backHtml,
    position,
  });
  return {
    id: cardId,
    question: frontHtml,
    answer: backHtml,
    noteFields: fields,
    position: position || 0,
    hasImage: false,
    hasAudio: false,
    templateIndex: 0,
    subdeckId: 0,
    noteId,
    noteGuid: noteId,
    noteModelId: '0',
    tags: [],
  };
}

export async function updateDeckCard(deck, card, { front, back }) {
  const frontHtml = editorTextToHtml(front);
  const backHtml = editorTextToHtml(back);
  const fields = replaceFrontBackFields(card, frontHtml, backHtml);
  await upsertOwnedCard(deck, {
    cardId: card.id,
    noteId: card.noteId || card.id,
    noteGuid: card.noteGuid || card.noteId || card.id,
    fields,
    frontHtml,
    backHtml,
    subdeckId: card.subdeckId || 0,
    position: card.position || 0,
    hasImage: Boolean(card.hasImage),
    hasAudio: Boolean(card.hasAudio),
    tags: card.tags || [],
    noteModelId: card.noteModelId || '0',
    templateIndex: card.templateIndex || 0,
  });
  return {
    ...card,
    question: frontHtml,
    answer: backHtml,
    noteFields: fields,
  };
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
