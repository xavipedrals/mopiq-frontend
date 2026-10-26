<template>
  <Teleport to="body">
    <div v-if="open" v-dialog-focus class="filter-dialog browse-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="card-browse-title" @keydown.esc.stop.prevent="onCancel">
      <button type="button" class="filter-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="filter-sheet">
        <header class="filter-nav"><span></span><h2 id="card-browse-title">{{ $t('deck.filterSort') }}</h2><button type="button" class="filter-nav-action" @click="onCancel">{{ $t('customStudy.done') }}</button></header>
        <div class="filter-scroll">
          <FilterFolderField v-if="folders.length" :folders="folders" :model-value="folderId" :deck-name="deckName" @update:model-value="$emit('folder-change', $event)"/>
          <CardFilterSections :model-value="currentQuery()" :flags="flags" :flags-loading="flagsLoading" :flags-error="flagsError" @update:model-value="applyFilters" @retry-flags="loadFlags"/>
          <fieldset class="filter-section">
            <legend>{{ $t('deck.sort') }}</legend>
            <div class="filter-group">
              <label class="filter-row filter-picker-row"><span>{{ $t('deck.sortBy') }}</span><select v-model="sort" :aria-label="$t('deck.sortBy')" @change="onSortChange"><option value="lastModified">{{ $t('deck.sortLastModified') }}</option><option value="byPosition">{{ $t('deck.sortByPosition') }}</option><option value="reviewDate">{{ $t('deck.sortReviewDate') }}</option></select></label>
              <div v-if="sort !== 'byPosition'" class="filter-row filter-status-row">
                <div class="filter-segments" role="radiogroup" :aria-label="$t('deck.sort')"><label v-for="item in orders" :key="item.value" class="filter-segment"><input v-model="order" type="radio" :name="`${id}-order`" :value="item.value" @change="emitChange"><span>{{ $t(item.label) }}</span></label></div>
              </div>
            </div>
          </fieldset>
          <div class="filter-group"><button type="button" class="filter-row filter-reset" @click="reset">{{ $t('filterUI.clearFilters') }}</button></div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { useId } from 'vue';
import { dialogFocus } from '../dialogFocus';
import { getCurrentUser } from '../auth/session';
import { defaultCardBrowseQuery, normalizeCardBrowseQuery } from '../study/cardBrowse';
import { fetchPersonalFlags } from '../api/personalFlags';
import { visiblePersonalFlags } from '../study/personalFlags';
import CardFilterSections from './CardFilterSections.vue';
import FilterFolderField from './FilterFolderField.vue';
import './cardFilterSheet.css';

export default {
  name: 'CardBrowseFilters',
  directives: { dialogFocus },
  components: { CardFilterSections, FilterFolderField },
  setup() { return { id: useId() }; },
  props: {
    folders: { type: Array, default: () => [] },
    folderId: { type: [String, Number], default: null },
    deckName: { type: String, default: '' },
    preview: { type: Boolean, default: false },
    open: { type: Boolean, default: false },
    query: { type: Object, default: () => defaultCardBrowseQuery() },
  },
  emits: ['dismiss', 'update', 'folder-change'],
  data() {
    return {
      orders: [{ value: 'newest', label: 'deck.newestFirst' }, { value: 'oldest', label: 'deck.oldestFirst' }],
      lastAnswers: [],
      anyFlag: false,
      flagIDs: [],
      flags: [],
      flagsLoading: false,
      flagsError: false,
      flagsRequest: 0,
      hasImage: false,
      hasAudio: false,
      status: '',
      sort: 'lastModified',
      order: 'newest',
    };
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) {
          this.hydrate();
          this.loadFlags();
        } else {
          this.flagsRequest += 1;
        }
      },
    },
  },
  beforeUnmount() { this.flagsRequest++; },
  methods: {
    applyFilters(query) {
      this.hasImage = query.hasImage; this.hasAudio = query.hasAudio; this.status = query.status || '';
      this.lastAnswers = query.lastAnswers; this.anyFlag = query.anyFlag; this.flagIDs = query.flagIDs;
      this.emitChange();
    },
    async loadFlags() {
      const request = ++this.flagsRequest;
      const owner = getCurrentUser()?.supabaseUid;
      this.flags = [];
      this.flagsLoading = true;
      this.flagsError = false;
      try {
        const flags = this.preview ? visiblePersonalFlags([]) : await fetchPersonalFlags();
        if (request === this.flagsRequest && owner === getCurrentUser()?.supabaseUid) this.flags = flags;
      } catch {
        if (request === this.flagsRequest && owner === getCurrentUser()?.supabaseUid) this.flagsError = true;
      } finally {
        if (request === this.flagsRequest && owner === getCurrentUser()?.supabaseUid) this.flagsLoading = false;
      }
    },
    hydrate() {
      const query = normalizeCardBrowseQuery(this.query);
      this.hasImage = query.hasImage;
      this.hasAudio = query.hasAudio;
      this.status = query.status || '';
      this.lastAnswers = [...query.lastAnswers];
      this.anyFlag = query.anyFlag;
      this.flagIDs = [...query.flagIDs];
      this.sort = query.sort;
      this.order = query.ascending ? 'oldest' : 'newest';
    },
    currentQuery() {
      return normalizeCardBrowseQuery({
        query: this.query?.query,
        hasImage: this.hasImage,
        hasAudio: this.hasAudio,
        status: this.status,
        lastAnswers: this.lastAnswers,
        anyFlag: this.anyFlag,
        flagIDs: this.flagIDs,
        sort: this.sort,
        ascending: this.sort !== 'byPosition' && this.order === 'oldest',
      });
    },
    toggle(key) {
      this[key] = !this[key];
      this.emitChange();
    },
    emitChange() {
      this.$emit('update', this.currentQuery());
    },
    onSortChange() {
      if (this.sort === 'byPosition') this.order = 'newest';
      this.emitChange();
    },
    reset() {
      const next = normalizeCardBrowseQuery({
        ...defaultCardBrowseQuery(),
        query: this.query?.query,
      });
      this.hasImage = next.hasImage;
      this.hasAudio = next.hasAudio;
      this.status = '';
      this.lastAnswers = [];
      this.anyFlag = false;
      this.flagIDs = [];
      this.sort = next.sort;
      this.order = 'newest';
      this.$emit('update', next);
      this.onCancel();
    },
    onCancel() {
      this.$emit('dismiss');
    },
  },
};
</script>
