<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-confirm-title"
      @keydown.esc="onCancel"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="sheet">
        <h2 id="study-confirm-title">{{ title }}</h2>
        <p>{{ message }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="sheet-actions">
          <button type="button" class="mopiq-btn secondary" :disabled="busy" @click="onCancel">
            {{ $t('common.cancel') }}
          </button>
          <button type="button" class="mopiq-btn" :class="{ danger }" :disabled="busy" @click="$emit('confirm')">
            {{ busy ? $t('common.loading') : confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'StudyConfirmSheet',
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    confirmLabel: { type: String, default: '' },
    danger: { type: Boolean, default: true },
    busy: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  emits: ['dismiss', 'confirm'],
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
  z-index: 90;
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
  width: min(420px, 100%);
  padding: 24px 22px 22px;
  background: var(--card-bg);
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: left;
}
h2 {
  margin: 0 0 10px;
  font-size: 1.25rem;
  font-weight: 750;
  color: var(--title);
}
p {
  margin: 0;
  color: var(--text);
  line-height: 1.45;
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
.mopiq-btn.danger {
  background: #dc2626 !important;
  color: #fff !important;
}
.error { color: var(--error); margin-top: 10px; }
</style>
