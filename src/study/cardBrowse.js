export const CARD_BROWSE_FIRST_PAGE = 20;
export const CARD_BROWSE_PAGE_SIZE = 60;
export const CARD_BROWSE_SORTS = ['lastModified', 'byPosition', 'reviewDate'];
export const CARD_BROWSE_STATUSES = ['new', 'learning', 'mastered'];

export function defaultCardBrowseQuery() {
  return {
    query: '',
    hasImage: false,
    hasAudio: false,
    status: null,
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
    && query.sort === 'lastModified'
    && !query.ascending;
}

export function hasActiveCardBrowseFilters(input) {
  const query = normalizeCardBrowseQuery(input);
  return query.hasImage
    || query.hasAudio
    || query.status != null
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
    p_sort: query.sort,
    p_ascending: query.ascending,
    p_limit: limit,
    p_offset: offset,
  };
}
