<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'card-editor-title'"
      @keydown.esc="onCancel"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="sheet">
        <header class="sheet-header">
          <h2 id="card-editor-title">{{ title }}</h2>
          <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onCancel">×</button>
        </header>

        <form class="sheet-body" @submit.prevent="save">
          <p v-if="hasImage" class="note">{{ $t('editor.imageLocked') }}</p>
          <p v-else-if="hasMedia" class="note">{{ $t('editor.mediaNote') }}</p>
          <p v-else-if="hasRich" class="note">{{ $t('editor.richNote') }}</p>

          <template v-if="!hasImage">
            <label class="field">
              <span>{{ $t('editor.front') }}</span>
              <textarea v-model="front" rows="5" :placeholder="$t('editor.frontPlaceholder')"></textarea>
            </label>
            <label class="field">
              <span>{{ $t('editor.back') }}</span>
              <textarea v-model="back" rows="5" :placeholder="$t('editor.backPlaceholder')"></textarea>
            </label>
          </template>

          <p v-if="error" class="error">{{ error }}</p>
          <div class="sheet-actions">
            <button type="button" class="mopiq-btn secondary" :disabled="saving" @click="onCancel">
              {{ $t('common.cancel') }}
            </button>
            <button v-if="!hasImage" type="submit" class="mopiq-btn" :disabled="saving">
              {{ saving ? $t('common.loading') : $t('common.save') }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { createDeckCard, updateDeckCard } from '../api/mopiq';
import { cardContainsImage, cardEditorFields, cardHasRichMarkup } from '../study/cardFields';

export default {
  name: 'CardEditor',
  props: {
    open: { type: Boolean, default: false },
    deck: { type: Object, default: null },
    card: { type: Object, default: null },
    nextPosition: { type: Number, default: 0 },
  },
  emits: ['dismiss', 'saved'],
  data() {
    return {
      front: '',
      back: '',
      saving: false,
      error: '',
    };
  },
  computed: {
    title() {
      return this.card ? this.$t('editor.editTitle') : this.$t('editor.addTitle');
    },
    hasImage() {
      return cardContainsImage(this.card);
    },
    hasMedia() {
      return Boolean(this.card?.hasAudio);
    },
    hasRich() {
      return Boolean(this.card) && cardHasRichMarkup(this.card);
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) this.hydrate();
      },
    },
    card() {
      if (this.open) this.hydrate();
    },
  },
  methods: {
    hydrate() {
      if (this.card) {
        const fields = cardEditorFields(this.card);
        this.front = fields.front;
        this.back = fields.back;
      } else {
        this.front = '';
        this.back = '';
      }
      this.error = '';
    },
    onCancel() {
      if (this.saving) return;
      this.$emit('dismiss');
    },
    async save() {
      if (!this.deck || this.saving) return;
      if (this.hasImage) {
        this.error = this.$t('editor.imageLocked');
        return;
      }
      if (!this.front.trim() && !this.back.trim()) {
        this.error = this.$t('editor.empty');
        return;
      }
      this.saving = true;
      this.error = '';
      try {
        const payload = { front: this.front, back: this.back };
        const saved = this.card
          ? await updateDeckCard(this.deck, this.card, payload)
          : await createDeckCard(this.deck, { ...payload, position: this.nextPosition });
        this.$emit('saved', { card: saved, created: !this.card });
      } catch (error) {
        console.error(error);
        this.error = error.message || this.$t('editor.saveError');
      } finally {
        this.saving = false;
      }
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
.sheet-body { padding: 16px 22px 22px; }
.note {
  background: var(--inset-bg);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.9rem;
  margin: 0 0 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
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
  min-height: 96px;
}
.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
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
.error { color: var(--error); }
</style>
