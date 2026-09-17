<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown.esc="onCancel"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="sheet">
        <header class="sheet-header">
          <h2 :id="titleId">{{ title }}</h2>
          <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onCancel">×</button>
        </header>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
        <p v-if="emptyText && !items.length" class="empty">{{ emptyText }}</p>
        <div v-else class="list">
          <button
            v-for="item in items"
            :key="item.id"
            type="button"
            class="row"
            :class="{ on: String(item.id) === String(selectedId) }"
            :style="{ paddingLeft: `${18 + (item.depth || 0) * 16}px` }"
            @click="$emit('select', item)"
          >
            <img v-if="item.icon" class="icon" :src="item.icon" alt="">
            <span class="copy">
              <strong>{{ item.title }}</strong>
              <small v-if="item.detail">{{ item.detail }}</small>
            </span>
          </button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="sheet-actions">
          <button type="button" class="mopiq-btn secondary" :disabled="busy" @click="onCancel">
            {{ $t('common.cancel') }}
          </button>
          <button
            v-if="confirmLabel"
            type="button"
            class="mopiq-btn"
            :disabled="busy || selectedId == null"
            @click="$emit('confirm')"
          >
            {{ busy ? $t('common.loading') : confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'StudyPickerSheet',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    emptyText: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    selectedId: { type: [String, Number], default: null },
    confirmLabel: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  emits: ['dismiss', 'select', 'confirm'],
  computed: {
    titleId() {
      return `study-picker-${this.title.replace(/\s+/g, '-').toLowerCase() || 'sheet'}`;
    },
  },
  methods: {
    onCancel() {
      if (this.busy) return;
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
  width: min(520px, 100%);
  max-height: min(92vh, 760px);
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
  font-size: 1.25rem;
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
.subtitle, .empty {
  margin: 10px 22px 0;
  color: var(--text);
  font-size: 0.95rem;
}
.list { padding: 12px 8px 0; }
.row {
  display: flex !important;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 18px !important;
  border: 0 !important;
  border-radius: 12px !important;
  background: transparent !important;
  color: var(--title) !important;
  text-align: left;
  cursor: pointer;
}
.row.on { background: color-mix(in srgb, var(--blue-button) 10%, transparent) !important; }
.row:hover { background: var(--inset-bg) !important; }
.icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: contain;
  background: var(--inset-bg);
}
.copy { min-width: 0; }
.copy strong {
  display: block;
  font-size: 1rem;
  font-weight: 650;
}
.copy small {
  display: block;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 22px 22px;
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
.error { color: var(--error); margin: 8px 22px 0; }
</style>
