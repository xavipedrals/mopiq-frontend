<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-browse-title"
      @keydown.esc="onCancel"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="sheet">
        <header class="sheet-header">
          <h2 id="card-browse-title">{{ $t('deck.filterSort') }}</h2>
          <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onCancel">×</button>
        </header>

        <div class="sheet-body">
          <h3>{{ $t('deck.filters') }}</h3>
          <div class="switch-row">
            <span>{{ $t('deck.containsImage') }}</span>
            <button
              type="button"
              class="ios-switch"
              :class="{ on: hasImage }"
              role="switch"
              :aria-checked="hasImage"
              :aria-label="$t('deck.containsImage')"
              @click="toggle('hasImage')"
            >
              <i></i>
            </button>
          </div>
          <div class="switch-row">
            <span>{{ $t('deck.containsAudio') }}</span>
            <button
              type="button"
              class="ios-switch"
              :class="{ on: hasAudio }"
              role="switch"
              :aria-checked="hasAudio"
              :aria-label="$t('deck.containsAudio')"
              @click="toggle('hasAudio')"
            >
              <i></i>
            </button>
          </div>
          <label class="field">
            <span>{{ $t('deck.cardStatus') }}</span>
            <select v-model="status" @change="emitChange">
              <option value="">{{ $t('deck.statusAll') }}</option>
              <option value="new">{{ $t('deck.statusNew') }}</option>
              <option value="learning">{{ $t('deck.statusLearning') }}</option>
              <option value="mastered">{{ $t('deck.statusMastered') }}</option>
            </select>
          </label>

          <h3>{{ $t('deck.sort') }}</h3>
          <label class="field">
            <span>{{ $t('deck.sortBy') }}</span>
            <select v-model="sort" @change="onSortChange">
              <option value="lastModified">{{ $t('deck.sortLastModified') }}</option>
              <option value="byPosition">{{ $t('deck.sortByPosition') }}</option>
              <option value="reviewDate">{{ $t('deck.sortReviewDate') }}</option>
            </select>
          </label>
          <label v-if="sort !== 'byPosition'" class="field">
            <span>{{ $t('deck.sort') }}</span>
            <select v-model="order" @change="emitChange">
              <option value="newest">{{ $t('deck.newestFirst') }}</option>
              <option value="oldest">{{ $t('deck.oldestFirst') }}</option>
            </select>
          </label>

          <div class="sheet-actions">
            <button type="button" class="mopiq-btn secondary" @click="reset">
              {{ $t('deck.resetAll') }}
            </button>
            <button type="button" class="mopiq-btn" @click="onCancel">
              {{ $t('common.ok') }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { defaultCardBrowseQuery, normalizeCardBrowseQuery } from '../study/cardBrowse';

export default {
  name: 'CardBrowseFilters',
  props: {
    open: { type: Boolean, default: false },
    query: { type: Object, default: () => defaultCardBrowseQuery() },
  },
  emits: ['dismiss', 'update'],
  data() {
    return {
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
        if (isOpen) this.hydrate();
      },
    },
  },
  methods: {
    hydrate() {
      const query = normalizeCardBrowseQuery(this.query);
      this.hasImage = query.hasImage;
      this.hasAudio = query.hasAudio;
      this.status = query.status || '';
      this.sort = query.sort;
      this.order = query.ascending ? 'oldest' : 'newest';
    },
    currentQuery() {
      return normalizeCardBrowseQuery({
        query: this.query?.query,
        hasImage: this.hasImage,
        hasAudio: this.hasAudio,
        status: this.status,
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
      this.sort = next.sort;
      this.order = 'newest';
      this.$emit('update', next);
    },
    onCancel() {
      this.$emit('dismiss');
    },
  },
};
</script>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.sheet-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: rgba(15, 23, 42, 0.5);
  cursor: pointer;
}
.sheet {
  position: relative;
  width: min(560px, 100%);
  max-height: min(92vh, 860px);
  overflow: auto;
  background: var(--card-bg);
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: left;
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px 0;
}
.sheet-header h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 750;
  color: var(--title);
}
.sheet-close {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.8rem;
  line-height: 1;
  cursor: pointer;
}
.sheet-body {
  padding: 16px 22px 22px;
}
h3 {
  margin: 18px 0 10px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.field, .switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 0;
  color: var(--title);
}
.field { flex-direction: column; align-items: stretch; }
.field span, .switch-row span { font-weight: 600; }
.ios-switch {
  width: 51px;
  height: 31px;
  border: 0;
  border-radius: 16px;
  background: #e5e7eb;
  position: relative;
  padding: 0;
  cursor: pointer;
  flex: 0 0 auto;
}
.ios-switch.on { background: #34c759; }
.ios-switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;
}
.ios-switch.on i { transform: translateX(20px); }
.field select {
  margin-top: 6px;
  border: 1px solid var(--empty-bar);
  background: var(--card-bg);
  color: var(--title);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
}
.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
.mopiq-btn {
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
  font-weight: 600 !important;
  padding: 10px 20px !important;
}
.mopiq-btn.secondary {
  background: var(--secondary-btn-bg) !important;
  color: var(--secondary-btn-text) !important;
}
html[data-theme="dark"] .ios-switch { background: #475569; }
</style>
