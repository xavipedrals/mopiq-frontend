<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="study-report-title"
      @keydown.esc="onCancel"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="sheet">
        <header class="sheet-header">
          <h2 id="study-report-title">{{ $t('study.reportTitle') }}</h2>
          <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onCancel">×</button>
        </header>
        <form class="sheet-body" @submit.prevent="submit">
          <h3>{{ $t('study.reportReason') }}</h3>
          <button
            v-for="reason in reasons"
            :key="reason.id"
            type="button"
            class="reason"
            :class="{ on: selected === reason.id }"
            @click="selected = reason.id"
          >
            <span>{{ $t(`study.reason${capitalize(reason.key)}`) }}</span>
            <span v-if="selected === reason.id" class="check">✓</span>
          </button>
          <label class="field">
            <span>{{ $t('study.reportDetails') }}</span>
            <textarea
              v-model="details"
              rows="4"
              maxlength="2000"
              :placeholder="$t('study.reportPlaceholder')"
            ></textarea>
          </label>
          <p v-if="error" class="error">{{ error }}</p>
          <div class="sheet-actions">
            <button type="button" class="mopiq-btn secondary" :disabled="busy" @click="onCancel">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="mopiq-btn" :disabled="busy || selected == null || !details.trim()">
              {{ busy ? $t('common.loading') : $t('study.reportSubmit') }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { REPORT_REASONS } from '../api/reportCard';

export default {
  name: 'StudyReportSheet',
  props: {
    open: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  emits: ['dismiss', 'submit'],
  data() {
    return {
      reasons: REPORT_REASONS,
      selected: null,
      details: '',
    };
  },
  watch: {
    open(isOpen) {
      if (isOpen) {
        this.selected = null;
        this.details = '';
      }
    },
  },
  methods: {
    onCancel() {
      if (this.busy) return;
      this.$emit('dismiss');
    },
    submit() {
      if (this.selected == null || !this.details.trim() || this.busy) return;
      this.$emit('submit', { reason: this.selected, details: this.details.trim() });
    },
    capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1);
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
.sheet-body { padding: 12px 22px 22px; }
h3 {
  margin: 8px 0 10px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.reason {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 6px;
  padding: 12px 14px !important;
  border: 0 !important;
  border-radius: 14px !important;
  background: var(--inset-bg) !important;
  color: var(--title) !important;
  font: inherit !important;
  font-weight: 550 !important;
  cursor: pointer;
}
.reason.on { outline: 2px solid var(--blue-button); }
.check { color: var(--blue-button); font-weight: 800; }
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
  color: var(--title);
  font-weight: 600;
}
.field textarea {
  border: 1px solid var(--empty-bar);
  background: var(--card-bg);
  color: var(--title);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  resize: vertical;
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
.error { color: var(--error); margin-top: 8px; }
</style>
