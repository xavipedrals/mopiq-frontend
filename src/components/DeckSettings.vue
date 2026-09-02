<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deck-settings-title"
      @keydown.esc="onCancel"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section class="sheet">
        <header class="sheet-header">
          <h2 id="deck-settings-title">{{ $t('settings.title') }}</h2>
          <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onCancel">×</button>
        </header>

        <form class="sheet-body" @submit.prevent="save">
          <h3>{{ $t('settings.algorithm') }}</h3>
          <div class="preset-list" role="radiogroup" :aria-label="$t('settings.algorithm')">
            <label
              v-for="preset in presets"
              :key="preset.id"
              class="preset"
              :class="{ on: Number(presetId) === preset.id }"
            >
              <input v-model.number="presetId" type="radio" name="preset" :value="preset.id">
              <span>
                <strong>{{ $t(`settings.${preset.key}`) }}</strong>
                <small>{{ $t(`settings.${preset.key}Body`) }}</small>
              </span>
            </label>
          </div>

          <label class="field">
            <span>{{ $t('settings.newCards') }}</span>
            <input v-model.number="newCardsPerDay" type="number" min="1" max="9999" required>
          </label>

          <label class="switch-row">
            <span>{{ $t('settings.shuffle') }}</span>
            <input v-model="shuffle" type="checkbox">
          </label>
          <label class="switch-row">
            <span>{{ $t('settings.checkpoints') }}</span>
            <input v-model="showCheckpoints" type="checkbox">
          </label>
          <label class="switch-row">
            <span>{{ $t('settings.autoplay') }}</span>
            <input v-model="autoplayAudio" type="checkbox">
          </label>

          <h3>{{ $t('settings.deckSection') }}</h3>
          <label class="field">
            <span>{{ $t('settings.topic') }}</span>
            <select v-model="topicId">
              <option v-for="topic in topics" :key="topic.imageName" :value="topic.imageName">
                {{ $topic(topic) }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>{{ $t('settings.rename') }}</span>
            <input v-model="name" type="text" maxlength="120" :placeholder="$t('settings.namePlaceholder')" required>
          </label>

          <p v-if="error" class="error">{{ error }}</p>
          <div class="sheet-actions">
            <button type="button" class="mopiq-btn secondary" :disabled="saving" @click="onCancel">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="mopiq-btn" :disabled="saving">
              {{ saving ? $t('common.loading') : $t('common.save') }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { saveDeckSettings } from '../api/mopiq';
import { parseDeckConfig } from '../study/deckConfig';
import { DECK_PRESETS, readDeckSettings } from '../study/deckSettings';
import { getAllDeckTopics, getDeckTopicByPostgresId } from '../utils';

export default {
  name: 'DeckSettings',
  props: {
    open: { type: Boolean, default: false },
    deck: { type: Object, default: null },
  },
  emits: ['dismiss', 'saved'],
  data() {
    return {
      presets: DECK_PRESETS,
      topics: getAllDeckTopics(),
      presetId: 0,
      newCardsPerDay: 20,
      shuffle: false,
      showCheckpoints: true,
      autoplayAudio: false,
      topicId: 'other',
      name: '',
      saving: false,
      error: '',
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
      const deck = this.deck;
      if (!deck) return;
      const settings = readDeckSettings(deck.extraConfig);
      this.presetId = settings.presetId;
      this.newCardsPerDay = settings.newCardsPerDay;
      this.shuffle = !settings.displayNewCardsInOrder;
      this.showCheckpoints = settings.showCheckpoints;
      this.autoplayAudio = settings.autoplayAudio;
      this.topicId = deck.topic?.imageName || 'other';
      this.name = deck.name || '';
      this.error = '';
    },
    onCancel() {
      if (this.saving) return;
      this.$emit('dismiss');
    },
    async save() {
      if (!this.deck || this.saving) return;
      const name = this.name.trim();
      if (!name) {
        this.error = this.$t('settings.nameRequired');
        return;
      }
      const newCardsPerDay = Math.min(9999, Math.max(1, Number(this.newCardsPerDay) || 20));
      this.saving = true;
      this.error = '';
      try {
        const extraConfig = await saveDeckSettings(this.deck, {
          presetId: Number(this.presetId) || 0,
          newCardsPerDay,
          displayNewCardsInOrder: !this.shuffle,
          showCheckpoints: this.showCheckpoints,
          autoplayAudio: this.autoplayAudio,
          topic: this.topicId,
          name,
        });
        this.$emit('saved', {
          extraConfig,
          config: parseDeckConfig(extraConfig),
          name,
          topic: getDeckTopicByPostgresId(this.topicId),
        });
      } catch (error) {
        this.error = error.message || this.$t('settings.saveError');
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
.preset-list { display: grid; gap: 8px; }
.preset {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 14px;
  background: var(--inset-bg);
  cursor: pointer;
}
.preset.on {
  outline: 2px solid var(--blue-button);
}
.preset input { margin-top: 4px; }
.preset strong {
  display: block;
  color: var(--title);
  font-size: 0.95rem;
}
.preset small {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.35;
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
.field input, .field select {
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
.error { color: var(--error); margin-top: 8px; }
</style>
