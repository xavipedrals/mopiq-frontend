<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deck-settings-title"
      @keydown.esc="onEscape"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="onCancel"></button>
      <section ref="sheet" class="sheet" :class="{ picking: topicPickerOpen }">
        <header class="sheet-header" :inert="topicPickerOpen">
          <h2 id="deck-settings-title">{{ $t('settings.title') }}</h2>
          <button type="button" class="sheet-close" :aria-label="$t('common.close')" @click="onCancel">×</button>
        </header>

        <form class="sheet-body" :inert="topicPickerOpen" @submit.prevent="save">
          <h3>{{ $t('settings.algorithm') }}</h3>
          <div class="preset-list" role="radiogroup" :aria-label="$t('settings.algorithm')">
            <label
              v-for="preset in presets"
              :key="preset.id"
              class="preset"
              :class="{ on: Number(presetId) === preset.id }"
            >
              <input v-model.number="presetId" class="sr-only" type="radio" name="preset" :value="preset.id">
              <span class="preset-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path v-for="(d, i) in settingIcon(preset.key)" :key="i" :d="d" />
                </svg>
              </span>
              <span>
                <strong>{{ $t(`settings.${preset.key}`) }}</strong>
                <small>{{ $t(`settings.${preset.key}Body`) }}</small>
              </span>
            </label>
          </div>

          <label class="field">
            <span class="field-label">
              <svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path v-for="(d, i) in settingIcon('newCards')" :key="i" :d="d" />
              </svg>
              {{ $t('settings.newCards') }}
            </span>
            <input v-model.number="newCardsPerDay" type="number" min="1" max="9999" required>
          </label>

          <div class="switch-row">
            <svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="(d, i) in settingIcon('shuffle')" :key="i" :d="d" />
            </svg>
            <span>{{ $t('settings.shuffle') }}</span>
            <button
              type="button"
              class="ios-switch"
              :class="{ on: shuffle }"
              role="switch"
              :aria-checked="shuffle"
              :aria-label="$t('settings.shuffle')"
              :disabled="saving"
              @click="shuffle = !shuffle"
            >
              <i></i>
            </button>
          </div>
          <div class="switch-row">
            <svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="(d, i) in settingIcon('checkpoints')" :key="i" :d="d" />
            </svg>
            <span>{{ $t('settings.checkpoints') }}</span>
            <button
              type="button"
              class="ios-switch"
              :class="{ on: showCheckpoints }"
              role="switch"
              :aria-checked="showCheckpoints"
              :aria-label="$t('settings.checkpoints')"
              :disabled="saving"
              @click="showCheckpoints = !showCheckpoints"
            >
              <i></i>
            </button>
          </div>
          <div class="switch-row">
            <svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="(d, i) in settingIcon('autoplay')" :key="i" :d="d" />
            </svg>
            <span>{{ $t('settings.autoplay') }}</span>
            <button
              type="button"
              class="ios-switch"
              :class="{ on: autoplayAudio }"
              role="switch"
              :aria-checked="autoplayAudio"
              :aria-label="$t('settings.autoplay')"
              :disabled="saving"
              @click="autoplayAudio = !autoplayAudio"
            >
              <i></i>
            </button>
          </div>

          <h3>{{ $t('settings.deckSection') }}</h3>
          <div class="field">
            <span id="deck-settings-topic-label" class="field-label">
              <svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path v-for="(d, i) in settingIcon('topic')" :key="i" :d="d" />
              </svg>
              {{ $t('settings.topic') }}
            </span>
            <button
              ref="topicTrigger"
              type="button"
              class="topic-trigger"
              aria-labelledby="deck-settings-topic-label deck-settings-topic-value"
              aria-haspopup="listbox"
              :aria-expanded="topicPickerOpen"
              :disabled="saving"
              @click="openTopicPicker"
            >
              <span class="topic-dot" :style="topicDotStyle(selectedTopic)">
                <span class="topic-glyph" aria-hidden="true" />
              </span>
              <span id="deck-settings-topic-value" class="topic-name" :style="{ color: selectedTopic.color }">
                {{ $topic(selectedTopic) }}
              </span>
              <svg class="topic-chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          <label class="field">
            <span class="field-label">
              <svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path v-for="(d, i) in settingIcon('rename')" :key="i" :d="d" />
              </svg>
              {{ $t('settings.rename') }}
            </span>
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

        <div class="danger-block" :inert="topicPickerOpen || Boolean(confirmKind)">
          <button type="button" class="danger-link" :disabled="saving || acting" @click="confirmKind = 'reset'">
            <svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="(d, i) in settingIcon('reset')" :key="i" :d="d" />
            </svg>
            {{ $t('settings.resetProgress') }}
          </button>
          <button type="button" class="danger-link" :disabled="saving || acting" @click="confirmKind = 'delete'">
            <svg class="setting-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="(d, i) in settingIcon('delete')" :key="i" :d="d" />
            </svg>
            {{ $t('settings.deleteDeck') }}
          </button>
        </div>

        <div v-if="topicPickerOpen" class="picker-layer">
          <header class="picker-header">
            <button
              type="button"
              class="sheet-close picker-back"
              :aria-label="$t('common.back')"
              @click="closeTopicPicker"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <h3 id="deck-settings-topic-picker-title">{{ $t('decks.selectTagTitle') }}</h3>
          </header>
          <div class="picker-list">
            <DeckTopicsPicker
              :model-value="topicId"
              labelled-by="deck-settings-topic-picker-title"
              auto-focus
              @update:model-value="onTopicPicked"
            />
          </div>
        </div>
      </section>
      <StudyConfirmSheet
        :open="Boolean(confirmKind)"
        :title="confirmTitle"
        :message="confirmMessage"
        :confirm-label="confirmLabel"
        :busy="acting"
        :error="confirmError"
        @dismiss="closeConfirm"
        @confirm="runConfirm"
      />
    </div>
  </Teleport>
</template>

<script>
import { deleteOwnedDeck, resetDeckProgress, saveDeckSettings } from '../api/mopiq';
import { parseDeckConfig } from '../study/deckConfig';
import { DECK_PRESETS, readDeckSettings } from '../study/deckSettings';
import { getDeckTopicByPostgresId, sidebarTablerIconUrl } from '../utils';
import DeckTopicsPicker from './DeckTopicsPicker.vue';
import StudyConfirmSheet from './StudyConfirmSheet.vue';

// Tabler Icons v3.46.0 outline (MIT). Stand-ins for the iPad SF / template glyphs.
const SETTING_ICONS = {
  general: [
    'M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8',
    'M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8',
    'M17.5 16a3.5 3.5 0 0 0 0 -7h-.5',
    'M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0',
    'M6.5 16a3.5 3.5 0 0 1 0 -7h.5',
    'M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10',
  ],
  medical: [
    'M6 4h-1a2 2 0 0 0 -2 2v3.5a5.5 5.5 0 0 0 11 0v-3.5a2 2 0 0 0 -2 -2h-1',
    'M8 15a6 6 0 1 0 12 0v-3',
    'M11 3v2',
    'M6 3v2',
    'M18 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  ],
  languages: [
    'M9 6.371c0 4.418 -2.239 6.629 -5 6.629',
    'M4 6.371h7',
    'M5 9c0 2.144 2.252 3.908 6 4',
    'M12 20l4 -9l4 9',
    'M19.1 18h-6.2',
    'M6.694 3l.793 .582',
  ],
  newCards: [
    'M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0',
    'M9 12h6',
    'M12 9v6',
  ],
  shuffle: [
    'M18 4l3 3l-3 3',
    'M18 20l3 -3l-3 -3',
    'M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5',
    'M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3',
  ],
  checkpoints: [
    'M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666',
    'M4.012 16.737a2 2 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1',
    'M11 14l2 2l4 -4',
  ],
  autoplay: [
    'M15 8a5 5 0 0 1 0 8',
    'M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5',
  ],
  topic: [
    'M6.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0',
    'M3 6v5.172a2 2 0 0 0 .586 1.414l7.71 7.71a2.41 2.41 0 0 0 3.408 0l5.592 -5.592a2.41 2.41 0 0 0 0 -3.408l-7.71 -7.71a2 2 0 0 0 -1.414 -.586h-5.172a3 3 0 0 0 -3 3',
  ],
  rename: [
    'M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4',
    'M13.5 6.5l4 4',
  ],
  reset: [
    'M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4',
    'M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4',
  ],
  delete: [
    'M4 7h16',
    'M10 11v6',
    'M14 11v6',
    'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12',
    'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3',
  ],
};

export default {
  name: 'DeckSettings',
  components: { DeckTopicsPicker, StudyConfirmSheet },
  props: {
    open: { type: Boolean, default: false },
    deck: { type: Object, default: null },
  },
  emits: ['dismiss', 'saved', 'deleted', 'reset'],
  data() {
    return {
      presets: DECK_PRESETS,
      presetId: 0,
      newCardsPerDay: 20,
      shuffle: false,
      showCheckpoints: true,
      autoplayAudio: false,
      topicId: 'other',
      name: '',
      saving: false,
      error: '',
      topicPickerOpen: false,
      confirmKind: '',
      acting: false,
      confirmError: '',
    };
  },
  computed: {
    selectedTopic() {
      return getDeckTopicByPostgresId(this.topicId);
    },
    confirmTitle() {
      if (this.confirmKind === 'delete') return this.$t('settings.deleteTitle');
      if (this.confirmKind === 'reset') return this.$t('settings.resetTitle');
      return '';
    },
    confirmMessage() {
      if (this.confirmKind === 'delete') return this.$t('settings.deleteBody');
      if (this.confirmKind === 'reset') return this.$t('settings.resetBody');
      return '';
    },
    confirmLabel() {
      if (this.confirmKind === 'delete') return this.$t('settings.deleteDeck');
      if (this.confirmKind === 'reset') return this.$t('settings.resetProgress');
      return '';
    },
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
      this.topicPickerOpen = false;
      this.confirmKind = '';
      this.confirmError = '';
      this.acting = false;
    },
    settingIcon(name) {
      return SETTING_ICONS[name] || [];
    },
    topicDotStyle(topic) {
      return {
        background: topic.backgroundColor,
        color: topic.color,
        '--topic-tint': topic.color,
        '--tabler-src': `url("${sidebarTablerIconUrl(topic.imageName)}")`,
      };
    },
    openTopicPicker() {
      if (this.saving) return;
      this.topicPickerOpen = true;
      this.$nextTick(() => {
        const sheet = this.$refs.sheet;
        if (sheet) sheet.scrollTop = 0;
        const list = sheet?.querySelector('.picker-list');
        const selected = list?.querySelector('.topic-row.on');
        if (list && selected) {
          list.scrollTop = Math.max(0, selected.offsetTop - 8);
        }
      });
    },
    closeTopicPicker() {
      this.topicPickerOpen = false;
      this.$nextTick(() => this.$refs.topicTrigger?.focus());
    },
    onTopicPicked(topicId) {
      this.topicId = topicId;
      this.closeTopicPicker();
    },
    onEscape() {
      if (this.saving || this.acting) return;
      if (this.confirmKind) {
        this.closeConfirm();
        return;
      }
      if (this.topicPickerOpen) {
        this.closeTopicPicker();
        return;
      }
      this.onCancel();
    },
    onCancel() {
      if (this.saving || this.acting) return;
      this.$emit('dismiss');
    },
    closeConfirm() {
      if (this.acting) return;
      this.confirmKind = '';
      this.confirmError = '';
    },
    async runConfirm() {
      if (!this.deck || this.acting || !this.confirmKind) return;
      this.acting = true;
      this.confirmError = '';
      try {
        if (this.confirmKind === 'delete') {
          await deleteOwnedDeck(this.deck);
          this.confirmKind = '';
          this.$emit('deleted');
        } else {
          await resetDeckProgress(this.deck);
          this.confirmKind = '';
          this.$emit('reset');
        }
      } catch (error) {
        this.confirmError = error.message || (this.confirmKind === 'delete'
          ? this.$t('settings.deleteError')
          : this.$t('settings.resetError'));
      } finally {
        this.acting = false;
      }
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
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: min(92vh, 860px);
  overflow: hidden;
  background: var(--card-bg);
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: left;
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  padding: 20px 22px 0;
  background: var(--card-bg);
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
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
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
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 14px;
  background: var(--inset-bg);
  cursor: pointer;
}
.preset.on {
  outline: 2px solid var(--blue-button);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.preset-icon,
.setting-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  color: var(--title);
}
.preset-icon {
  margin-top: 2px;
}
.preset-icon svg,
.setting-icon {
  display: block;
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
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
.field-label,
.switch-row span {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}
.switch-row span { flex: 1 1 auto; min-width: 0; }
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
.ios-switch:disabled { opacity: 0.45; cursor: not-allowed; }
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
.ios-switch:focus-visible {
  outline: 2px solid var(--blue-button);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .ios-switch i { transition: none; }
}
html[data-theme="dark"] .ios-switch { background: #475569; }
html[data-theme="dark"] .ios-switch.on { background: #34c759; }
.sheet.picking {
  overflow: hidden;
  min-height: min(92vh, 720px);
}
.field input {
  margin-top: 6px;
  border: 1px solid var(--empty-bar);
  background: var(--card-bg);
  color: var(--title);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
}
.topic-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 6px;
  border: 1px solid var(--empty-bar);
  background: var(--card-bg);
  color: var(--title);
  border-radius: 12px;
  padding: 8px 12px;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.topic-trigger:disabled {
  opacity: 0.45;
  cursor: default;
}
.topic-trigger:focus-visible {
  outline: 2px solid var(--blue-button);
  outline-offset: 2px;
}
.topic-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.topic-glyph {
  width: 25px;
  height: 25px;
  display: block;
  background-color: var(--topic-tint, currentColor);
  -webkit-mask-image: var(--tabler-src);
  mask-image: var(--tabler-src);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}
.topic-name {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.topic-chevron {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  color: var(--text-secondary);
}
.picker-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--card-bg);
  border-radius: inherit;
}
.picker-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 16px 14px 8px;
  background: var(--card-bg);
}
.picker-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
  letter-spacing: 0;
  text-transform: none;
  color: var(--title);
}
.picker-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 0;
}
.picker-back svg {
  width: 22px;
  height: 22px;
}
.picker-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 10px 16px;
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
.danger-block {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  flex: 0 0 auto;
  padding: 8px 22px 18px;
  background: var(--card-bg);
  border-top: 1px solid var(--empty-bar);
}
.danger-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: #dc2626;
  font: inherit;
  font-size: 1rem;
  font-weight: 650;
  text-align: left;
  padding: 10px 0;
  cursor: pointer;
}
.danger-link .setting-icon { color: currentColor; }
.danger-link:disabled {
  opacity: 0.45;
  cursor: default;
}
.error { color: var(--error); margin-top: 8px; }
</style>
