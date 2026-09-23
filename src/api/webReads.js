import { parseDeckConfig } from '../study/deckConfig.js';
import { sharedDeckIdFromExtra } from '../study/deckFolders.js';
import { deckGradeFromCounts } from '../study/deckStats.js';
import { getDeckTopicByPostgresId } from '../utils.js';

export const STUDY_BUNDLE_PAGE_SIZE = 1000;
export const MEDIA_URL_PAGE_SIZE = 200;

export function effectiveContentMode(row) {
  const mode2 = (row?.content_mode_2 || '').trim();
  if (mode2) return mode2;
  const mode = (row?.content_mode || '').trim();
  if (!mode || mode === 'file') return 'legacy_firebase_file';
  return mode;
}

export function isPostgresDeck(mode) {
  return mode === 'postgres' || mode === 'postgres_content' || mode === 'postgresContent';
}

function deckCapabilities(mode, creatorId, supabaseUid) {
  const canStudy = isPostgresDeck(mode);
  return {
    canStudy,
    canEdit: canStudy && (!creatorId || creatorId === supabaseUid),
  };
}

export function mapUserDeckRow(row, supabaseUid = '') {
  const mode = effectiveContentMode(row);
  const extraConfig = row.extra_config || row.extraConfig || {};
  return {
    id: row.id,
    firebaseId: row.firebase_id || row.firebaseId || '',
    name: row.name || 'Untitled deck',
    topic: getDeckTopicByPostgresId(row.topic),
    cardCount: row.card_count ?? row.cardCount ?? 0,
    extraConfig,
    decks: row.decks || {},
    sharedDeckId: sharedDeckIdFromExtra(extraConfig),
    createdAt: row.created_at || row.createdAt || null,
    lastUsedAt: row.last_used_at || row.lastUsedAt || null,
    creatorId: row.creator_id || row.creatorId || '',
    contentMode: mode,
    config: parseDeckConfig(extraConfig),
    ...deckCapabilities(mode, row.creator_id || row.creatorId, supabaseUid),
  };
}

export function mapDeckListRow(row, supabaseUid = '') {
  const deck = mapUserDeckRow({
    ...row,
    id: row.deck_id || row.id,
  }, supabaseUid);
  return {
    ...deck,
    statsAvailable: Boolean(row.stats_available ?? row.statsAvailable),
    newRemainingToday: Number(row.new_remaining_today ?? row.newRemainingToday) || 0,
    reviewDueToday: Number(row.review_due_today ?? row.reviewDueToday) || 0,
    cardsForToday: Number(row.cards_for_today ?? row.cardsForToday) || 0,
  };
}

export function mapBrowseCard(row) {
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
    updatedAt: row.updated_at || null,
    dueDate: Object.prototype.hasOwnProperty.call(row, 'due_date') ? row.due_date || null : null,
    reviewCount: Number(row.review_count) || 0,
    state: row.state || 'NEW',
  };
}

export function mapStudyBundleRow(row) {
  const card = mapBrowseCard(row);
  if (row.ease_factor == null && row.state == null && row.review_count == null) {
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
    state: row.state || 'NEW',
    easeFactor: row.ease_factor || 2500,
    intervalSecs: row.interval_secs || 0,
    reviewCount: Number(row.review_count) || 0,
    lapseCount: row.lapse_count || 0,
    intervalSecsBeforeLapse: row.interval_secs_before_lapse,
    dueDate: row.due_date || null,
    lastReviewedAt: row.last_reviewed || null,
    firstReviewedAt: row.first_reviewed_at || null,
    lastAnswerGiven: row.last_answer_given || null,
    suspended: Boolean(row.suspended),
  };
}

export function mapHistogramRow(row) {
  const counts = {
    AGAIN: Number(row?.again_count) || 0,
    HARD: Number(row?.hard_count) || 0,
    GOOD: Number(row?.good_count) || 0,
    EASY: Number(row?.easy_count) || 0,
  };
  const total = Number(row?.total) || (counts.AGAIN + counts.HARD + counts.GOOD + counts.EASY);
  return {
    counts,
    total,
    grade: deckGradeFromCounts(counts, total),
  };
}

export function emptyHistogram() {
  return mapHistogramRow({});
}

export function mapProgressCountsRow(row) {
  return {
    seen: Number(row?.seen) || 0,
    studiedToday: Number(row?.studied_today ?? row?.studiedToday) || 0,
  };
}

export function nextStudyBundleCursor(page) {
  if (!page?.length) return null;
  const last = page[page.length - 1];
  if (!last?.id) return null;
  return {
    position: Number(last.position) || 0,
    id: last.id,
  };
}
