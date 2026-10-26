export const CARD_BROWSE_FIRST_PAGE = 20;
export const CARD_BROWSE_PAGE_SIZE = 60;
export const CARD_BROWSE_SORTS = ['lastModified', 'byPosition', 'reviewDate'];
export const CARD_BROWSE_STATUSES = ['new', 'studied'];

export const CARD_BROWSE_ANSWERS = ['AGAIN', 'HARD', 'GOOD', 'EASY'];

export function defaultCardBrowseQuery() {
  return {
    query: '',
    hasImage: false,
    hasAudio: false,
    status: null,
    lastAnswers: [],
    anyFlag: false,
    flagIDs: [],
    subdeckIDs: null,
    sort: 'lastModified',
    ascending: false,
  };
}

export function normalizeCardBrowseQuery(input = {}) {
  const query = String(input.query || '').trim();
  const sort = CARD_BROWSE_SORTS.includes(input.sort) ? input.sort : 'lastModified';
  const status = CARD_BROWSE_STATUSES.includes(input.status) ? input.status : null;
  return {
    query,
    hasImage: Boolean(input.hasImage),
    hasAudio: Boolean(input.hasAudio),
    status,
    lastAnswers: CARD_BROWSE_ANSWERS.filter((answer) => Array.isArray(input.lastAnswers) && input.lastAnswers.includes(answer)),
    anyFlag: Boolean(input.anyFlag),
    flagIDs: [...new Set((Array.isArray(input.flagIDs) ? input.flagIDs : [])
      .filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 80))].sort(),
    subdeckIDs: Array.isArray(input.subdeckIDs)
      ? [...new Set(input.subdeckIDs.filter((id) => typeof id === 'number' && Number.isSafeInteger(id)))].sort((a, b) => a - b)
      : null,
    sort,
    ascending: sort === 'byPosition' ? false : Boolean(input.ascending),
  };
}

export function isDefaultCardBrowseQuery(input) {
  const query = normalizeCardBrowseQuery(input);
  return !query.query
    && !query.hasImage
    && !query.hasAudio
    && query.status == null
    && !query.lastAnswers.length
    && !query.anyFlag
    && !query.flagIDs.length
    && query.subdeckIDs == null
    && query.sort === 'lastModified'
    && !query.ascending;
}

export function hasActiveCardBrowseFilters(input) {
  const query = normalizeCardBrowseQuery(input);
  return query.hasImage
    || query.hasAudio
    || query.status != null
    || query.lastAnswers.length > 0
    || query.anyFlag
    || query.flagIDs.length > 0
    || query.subdeckIDs != null
    || query.sort !== 'lastModified';
}

export function resetCardBrowseFilters(input) {
  return {
    ...defaultCardBrowseQuery(),
    query: String(input?.query || '').trim(),
  };
}

export function cardBrowsePageLimit(offset) {
  return Number(offset) > 0 ? CARD_BROWSE_PAGE_SIZE : CARD_BROWSE_FIRST_PAGE;
}

export function toBrowseDeckCardsParams(deckId, input, offset = 0, limit = CARD_BROWSE_FIRST_PAGE) {
  const query = normalizeCardBrowseQuery(input);
  return {
    p_deck_version_id: deckId,
    p_query: query.query,
    p_has_image: query.hasImage,
    p_has_audio: query.hasAudio,
    p_status: query.status,
    p_last_answers: query.lastAnswers,
    p_any_flag: query.anyFlag,
    p_flag_ids: query.flagIDs,
    p_subdeck_ids: query.subdeckIDs,
    p_sort: query.sort,
    p_ascending: query.ascending,
    p_limit: limit,
    p_offset: offset,
  };
}

// Local sample data only; real browse predicates run in the RPC before pagination.
export function filterPreviewBrowseCards(cards, input) {
  const query = normalizeCardBrowseQuery(input);
  const tokens = query.query.toLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter((card) => {
    const studied = card.state !== 'NEW' || card.reviewCount > 0;
    const text = [card.question, card.answer, ...(card.noteFields || [])].join(' ').toLowerCase();
    const flags = card.flagIDs || [];
    return tokens.every((token) => text.includes(token))
      && (!query.hasImage || card.hasImage)
      && (!query.hasAudio || card.hasAudio)
      && (!query.status || (query.status === 'studied' ? studied : !studied))
      && (!query.lastAnswers.length || (studied && query.lastAnswers.includes(card.lastAnswerGiven)))
      && (!query.flagIDs.length ? !query.anyFlag || flags.length > 0 : query.flagIDs.some((id) => flags.includes(id)))
      && (query.subdeckIDs == null || query.subdeckIDs.includes(card.subdeckId));
  }).sort((a, b) => {
    if (query.sort === 'byPosition') return a.position - b.position || a.id.localeCompare(b.id);
    const studied = (card) => card.state !== 'NEW' || card.reviewCount > 0;
    if (query.sort === 'reviewDate' && studied(a) !== studied(b)) return studied(a) ? -1 : 1;
    const key = query.sort === 'reviewDate' ? 'dueDate' : 'updatedAt';
    const left = a[key] == null ? null : new Date(a[key]).getTime();
    const right = b[key] == null ? null : new Date(b[key]).getTime();
    if (left == null || right == null) return left === right ? a.id.localeCompare(b.id) : left == null ? 1 : -1;
    return (query.ascending ? left - right : right - left) || a.id.localeCompare(b.id);
  });
}
