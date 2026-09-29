<template>
  <div class="pdf-picker">
    <header class="pdf-head">
      <div>
        <h2 class="pdf-title">{{ $t('decks.pdfSelectTitle') }}</h2>
        <p class="pdf-sub">{{ subtitle }}</p>
      </div>
      <button type="button" class="select-all" @click="$emit('toggle-all')">
        {{ allSelected ? $t('decks.pdfClearAll') : $t('decks.pdfSelectAll') }}
      </button>
    </header>
    <div class="pdf-grid">
      <button
        v-for="page in pages"
        :key="page.number"
        type="button"
        class="page-card"
        :class="{ selected: isSelected(page.number) }"
        :aria-pressed="isSelected(page.number) ? 'true' : 'false'"
        :aria-label="$t('decks.pdfPageLabel', { page: page.number })"
        @click="$emit('toggle', page.number)"
      >
        <span class="thumb">
          <img v-if="page.thumbnail" :src="page.thumbnail" alt="">
          <span v-else class="thumb-placeholder"></span>
          <span class="mark" :class="{ on: isSelected(page.number) }" aria-hidden="true">
            <svg v-if="isSelected(page.number)" viewBox="0 0 24 24">
              <path d="M6 12.5l3.2 3.2L18 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </span>
        <span class="page-number">{{ page.number }}</span>
      </button>
    </div>
    <p class="pdf-tip">{{ $t('decks.pdfSelectTip') }}</p>
    <div class="pdf-footer">
      <button type="button" class="continue" :disabled="selectedCount === 0" @click="$emit('continue')">
        {{ continueLabel }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PdfPageSelector',
  props: {
    pages: { type: Array, default: () => [] },
    selected: { type: Array, default: () => [] },
  },
  emits: ['toggle', 'toggle-all', 'continue'],
  computed: {
    selectedCount() {
      return this.selected.length;
    },
    allSelected() {
      return this.pages.length > 0 && this.selectedCount === this.pages.length;
    },
    subtitle() {
      if (!this.selectedCount) return this.$t('decks.pdfSelectNone');
      return this.$t('decks.pdfSelectCount', { selected: this.selectedCount, total: this.pages.length });
    },
    continueLabel() {
      if (this.selectedCount === 0) return this.$t('decks.pdfContinueEmpty');
      if (this.selectedCount === 1) return this.$t('decks.pdfContinueOne');
      return this.$t('decks.pdfContinueMany', { count: this.selectedCount });
    },
  },
  methods: {
    isSelected(number) {
      return this.selected.includes(number);
    },
  },
};
</script>

<style scoped>
.pdf-picker { display: flex; flex-direction: column; min-height: min(68vh, 640px); }
.pdf-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.pdf-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--title);
}
.pdf-sub { margin: 6px 0 0; color: var(--text-secondary); line-height: 1.4; }
.select-all {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 0;
}
.pdf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}
.page-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.thumb {
  position: relative;
  display: block;
  border-radius: 12px;
  overflow: hidden;
  background: var(--inset-bg);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}
.page-card.selected .thumb { box-shadow: 0 0 0 3px var(--blue-button); }
.thumb img, .thumb-placeholder { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: contain; background: var(--inset-bg); }
.mark {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(15, 23, 42, 0.35);
  background: rgba(255, 255, 255, 0.72);
}
.mark.on {
  display: flex;
  align-items: center;
  justify-content: center;
  border-color: #fff;
  background: var(--blue-button);
  color: #fff;
  box-shadow: 0 0 0 2px #fff;
}
.mark svg { width: 16px; height: 16px; display: block; }
.page-number {
  padding: 0 6px;
  font-size: 0.85rem;
  font-weight: 650;
  color: var(--title);
}
.pdf-tip {
  margin: 24px 8px 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.45;
  text-align: center;
}
.pdf-footer {
  position: sticky;
  bottom: 0;
  z-index: 1;
  margin: 12px -24px 0;
  padding: 28px 24px 4px;
  background: linear-gradient(to bottom, transparent, var(--card-bg) 42%);
}
.continue {
  width: 100%;
  border: 0;
  border-radius: 16px;
  padding: 14px 18px;
  background: var(--title);
  color: var(--card-bg);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}
.continue:disabled { opacity: 0.5; cursor: default; }
@media (min-width: 700px) {
  .pdf-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .page-card { transition: none; }
}
</style>
