<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="sheet-root"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @keydown.esc="onEscape"
    >
      <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="closeCreate"></button>
      <section class="sheet" :class="sheetClass">
        <header class="sheet-header">
          <button
            type="button"
            class="sheet-nav"
            :aria-label="isRootPage ? $t('common.close') : $t('common.back')"
            :disabled="saving"
            @click="onNav"
          >
            <svg v-if="isRootPage" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </header>

        <div class="sheet-page">
          <div v-if="page === 'options'" class="options">
            <h2 id="add-deck-title" class="page-title tight">{{ $t('decks.chooseTitle') }}</h2>
            <button type="button" class="option create" @click="go('setName')">
              <span class="copy">
                <strong>{{ $t('decks.createOptionTitle') }}</strong>
                <small>{{ $t('decks.createOptionBody') }}</small>
              </span>
              <img src="/add-deck/create-deck-big.png" alt="">
            </button>
            <button type="button" class="option magic" @click="go('magic')">
              <span class="copy">
                <strong>{{ $t('decks.magicOptionTitle') }}</strong>
                <small>{{ $t('decks.magicOptionBody') }}</small>
                <span class="pills">
                  <span v-for="pill in magicPills" :key="pill.id" class="pill" :style="pill.style">{{ pill.label }}</span>
                  <span class="and-more">{{ $t('decks.magicAndMore') }}</span>
                </span>
              </span>
              <img src="/add-deck/magician-hat.png" alt="">
            </button>
          </div>

          <form v-else-if="page === 'setName'" class="step" @submit.prevent="submitName">
            <h2 id="add-deck-name-title" class="page-title">{{ $t('decks.setNameTitle') }}</h2>
            <p class="page-body">{{ $t('decks.setNameBody') }}</p>
            <label class="field">
              <span class="sr-only">{{ $t('settings.namePlaceholder') }}</span>
              <input
                ref="nameInput"
                v-model="name"
                type="text"
                maxlength="120"
                :placeholder="$t('settings.namePlaceholder')"
                :disabled="saving"
              >
            </label>
            <p v-if="formError" class="form-error">{{ formError }}</p>
            <button type="submit" class="primary-btn" :disabled="saving">
              {{ $t('decks.continue') }}
            </button>
          </form>

          <form v-else-if="page === 'pickTopic'" class="step topic-step" @submit.prevent="submitTopic">
            <h2 id="add-deck-topic-title" class="page-title">{{ $t('decks.selectTagTitle') }}</h2>
            <p class="page-body">{{ $t('decks.selectTagBody') }}</p>
            <div class="topic-picker">
              <DeckTopicsPicker
                v-model="topicId"
                :disabled="saving"
                labelled-by="add-deck-topic-title"
              />
            </div>
            <p v-if="formError" class="form-error">{{ formError }}</p>
            <button type="submit" class="primary-btn" :disabled="saving">
              {{ saving ? $t('common.loading') : $t('common.save') }}
            </button>
          </form>

          <div v-else-if="page === 'magic'" class="magic-list">
            <h2 id="add-deck-magic-title" class="page-title">{{ $t('decks.magicOptionTitle') }}</h2>
            <button
              v-for="option in magicOptions"
              :key="option.id"
              type="button"
              class="magic-row"
              @click="selectMagic(option)"
            >
              <span class="magic-icon" :style="{ background: option.bg, color: option.fg }">
                <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ sparkle: option.id === 'aiPrompt' }">
                  <path
                    :d="option.icon"
                    :fill="option.filled ? 'currentColor' : 'none'"
                    :stroke="option.filled ? 'none' : 'currentColor'"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <span class="magic-label">{{ $t(option.titleKey) }}</span>
              <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>

          <form v-else-if="page === 'spreadsheet'" class="step" @submit.prevent="continueSpreadsheet">
            <h2 id="add-deck-sheets-title" class="page-title left">{{ $t('decks.spreadsheetTitle') }}</h2>
            <p class="page-body left">{{ $t('decks.addSpreadsheetBody') }}</p>
            <input
              ref="fileInput"
              class="file-input"
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              :disabled="saving"
              @change="onSpreadsheetFile"
            >
            <button type="button" class="dropzone" :disabled="saving" @click="pickSpreadsheet">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" fill="none" stroke="currentColor" stroke-width="1.8"/>
                <path d="M14 3v6h6" fill="none" stroke="currentColor" stroke-width="1.8"/>
                <path d="M12 11v6M9 14h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              <span class="drop-title">{{ $t('decks.spreadsheetUpload') }}</span>
              <span class="drop-hint">{{ $t('decks.spreadsheetUploadHint') }}</span>
            </button>
            <p class="or">{{ $t('decks.spreadsheetOr') }}</p>
            <label class="field">
              <span class="sr-only">{{ $t('decks.spreadsheetPlaceholder') }}</span>
              <textarea
                ref="pasteInput"
                v-model="pasteText"
                rows="7"
                :placeholder="$t('decks.spreadsheetPlaceholder')"
                :disabled="saving"
              ></textarea>
            </label>
            <div v-if="detectedCards.length" class="preview">
              <div class="preview-count">{{ $t('decks.spreadsheetPreviewCount', { count: detectedCards.length }) }}</div>
              <ul>
                <li v-for="(card, index) in previewCards" :key="index">
                  <span class="q">{{ card.question }}</span>
                  <span class="sep">→</span>
                  <span class="a">{{ card.answer }}</span>
                </li>
              </ul>
            </div>
            <p v-if="formError" class="form-error">{{ formError }}</p>
            <button type="submit" class="primary-btn" :disabled="saving || !detectedCards.length">
              {{ $t('decks.continue') }}
            </button>
          </form>

          <div v-else-if="page === 'magicImport'" class="step">
            <MagicImportPanel
              :source="magicSource"
              @busy="saving = $event"
              @queued="onMagicQueued"
              @done="onMagicDone"
            />
          </div>

          <div v-else-if="page === 'appOnly'" class="app-only">
            <h2 id="add-deck-app-title" class="page-title">{{ $t('decks.appOnlyTitle') }}</h2>
            <p class="page-body">{{ $t('decks.appOnlyBody', { name: $t(appOnlyNameKey) }) }}</p>
            <a class="primary-btn store" :href="storeUrl" target="_blank" rel="noopener">{{ $t('common.downloadApp') }}</a>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { createDeck, createDeckFromSpreadsheet } from '../api/mopiq';
import { MAX_DECK_NAME_LENGTH } from '../api/emptyDeck';
import { APP_STORE_URL } from '../constants';
import DeckTopicsPicker from './DeckTopicsPicker.vue';
import MagicImportPanel from './MagicImportPanel.vue';
import { MAGIC_SOURCES, magicImportRoute } from '../study/magicImport';
import {
  autoDetectSpreadsheet,
  decodeSpreadsheetBytes,
  deckNameFromFilename,
  MAX_SPREADSHEET_BYTES,
  MAX_SPREADSHEET_CHARS,
} from '../study/spreadsheetImport';

const MAGIC_COLORS = [
  { bg: '#BBF7D0', fg: '#16a34a' },
  { bg: '#a7f3d0', fg: '#059669' },
  { bg: '#99f6e4', fg: '#0d9488' },
  { bg: '#a5f3fc', fg: '#0891b2' },
  { bg: '#bae6fd', fg: '#0284c7' },
  { bg: '#bfdbfe', fg: '#2563eb' },
  { bg: '#c7d2fe', fg: '#4f46e5' },
  { bg: '#ddd6fe', fg: '#7c3aed' },
];

export default {
  name: 'CreateDeckSheet',
  components: { DeckTopicsPicker, MagicImportPanel },
  props: {
    open: { type: Boolean, default: false },
  },
  emits: ['dismiss', 'created', 'queued'],
  data() {
    return {
      saving: false,
      pages: ['options'],
      topicPurpose: 'create',
      name: '',
      topicId: 'other',
      pasteText: '',
      detectedCards: [],
      detectTimer: 0,
      formError: '',
      appOnlyNameKey: 'decks.magicAiPrompt',
      magicSource: 'aiPrompt',
      storeUrl: APP_STORE_URL,
    };
  },
  computed: {
    page() {
      return this.pages[this.pages.length - 1] || 'options';
    },
    isRootPage() {
      return this.page === 'options';
    },
    titleId() {
      return {
        options: 'add-deck-title',
        setName: 'add-deck-name-title',
        pickTopic: 'add-deck-topic-title',
        magic: 'add-deck-magic-title',
        spreadsheet: 'add-deck-sheets-title',
        magicImport: 'add-deck-import-title',
        appOnly: 'add-deck-app-title',
      }[this.page] || 'add-deck-title';
    },
    sheetClass() {
      return {
        options: 'sheet-options',
        magic: 'sheet-magic',
        spreadsheet: 'sheet-wide',
        magicImport: 'sheet-wide',
        pickTopic: 'sheet-topics',
        appOnly: 'sheet-app',
      }[this.page] || 'sheet-step';
    },
    magicOptions() {
      return MAGIC_SOURCES.map((option, index) => ({
        ...option,
        ...MAGIC_COLORS[index % MAGIC_COLORS.length],
      }));
    },
    magicPills() {
      return [
        { id: 'pdf', label: this.$t('decks.magicPdf'), style: { background: '#FECACA', color: '#DC2626' } },
        { id: 'audio', label: this.$t('decks.pillAudio'), style: { background: '#FED7AA', color: '#EA580C' } },
        { id: 'text', label: this.$t('decks.pillText'), style: { background: '#FEF08A', color: '#CA8A04' } },
        { id: 'anki', label: this.$t('decks.pillAnki'), style: { background: '#D9F99D', color: '#65A30D' } },
        { id: 'youtube', label: this.$t('decks.pillYoutube'), style: { background: '#BAE6FD', color: '#0284C7' } },
      ];
    },
    previewCards() {
      return this.detectedCards.slice(0, 5);
    },
  },
  watch: {
    open(isOpen) {
      if (!isOpen) return;
      this.resetCreateForm();
    },
    page(page) {
      this.formError = '';
      this.$nextTick(() => {
        if (page === 'setName') this.$refs.nameInput?.focus();
        if (page === 'spreadsheet') this.$refs.pasteInput?.focus();
      });
    },
    pasteText() {
      clearTimeout(this.detectTimer);
      this.detectTimer = setTimeout(() => this.detectPaste(), 150);
    },
  },
  beforeUnmount() {
    clearTimeout(this.detectTimer);
  },
  methods: {
    resetCreateForm() {
      this.pages = ['options'];
      this.topicPurpose = 'create';
      this.name = '';
      this.topicId = 'other';
      this.pasteText = '';
      this.detectedCards = [];
      this.formError = '';
      this.saving = false;
      this.appOnlyNameKey = 'decks.magicAiPrompt';
    },
    go(page) {
      if (this.saving) return;
      this.pages = [...this.pages, page];
    },
    onNav() {
      if (this.saving) return;
      if (this.isRootPage) this.closeCreate();
      else this.pages = this.pages.slice(0, -1);
    },
    onEscape() {
      this.onNav();
    },
    closeCreate() {
      if (this.saving) return;
      this.$emit('dismiss');
    },
    submitName() {
      const name = this.name.trim().slice(0, MAX_DECK_NAME_LENGTH);
      if (!name) {
        this.formError = this.$t('settings.nameRequired');
        return;
      }
      this.name = name;
      this.topicPurpose = 'create';
      this.go('pickTopic');
    },
    selectMagic(option) {
      const route = magicImportRoute(option.id);
      if (route === 'spreadsheet') {
        this.go('spreadsheet');
        return;
      }
      if (route !== 'job') return;
      this.magicSource = option.id;
      this.go('magicImport');
    },
    onMagicQueued(deck) {
      this.$emit('queued', deck);
    },
    onMagicDone(deck) {
      this.$emit('created', deck);
    },
    pickSpreadsheet() {
      this.$refs.fileInput?.click();
    },
    detectPaste() {
      const text = this.pasteText.trim();
      this.detectedCards = text ? autoDetectSpreadsheet(text).cards : [];
    },
    async onSpreadsheetFile(event) {
      const file = event.target?.files?.[0];
      event.target.value = '';
      if (!file) return;
      if (file.size > MAX_SPREADSHEET_BYTES) {
        this.formError = this.$t('decks.spreadsheetTooLarge');
        return;
      }
      try {
        const buffer = await file.arrayBuffer();
        const text = decodeSpreadsheetBytes(buffer);
        if (text.length > MAX_SPREADSHEET_CHARS) {
          this.formError = this.$t('decks.spreadsheetTooLarge');
          return;
        }
        this.pasteText = text;
        this.formError = '';
        if (!this.name.trim()) this.name = deckNameFromFilename(file.name);
        this.$nextTick(() => this.detectPaste());
      } catch {
        this.formError = this.$t('decks.spreadsheetReadError');
      }
    },
    continueSpreadsheet() {
      const text = this.pasteText.trim();
      if (!text) {
        this.formError = this.$t('decks.spreadsheetEmpty');
        return;
      }
      this.detectPaste();
      if (!this.detectedCards.length) {
        this.formError = this.$t('decks.spreadsheetNoCards');
        return;
      }
      this.topicPurpose = 'spreadsheet';
      this.go('pickTopic');
    },
    async submitTopic() {
      if (this.topicPurpose === 'spreadsheet') {
        await this.createFromSpreadsheet();
        return;
      }
      await this.createEmpty();
    },
    async createEmpty() {
      const name = this.name.trim().slice(0, MAX_DECK_NAME_LENGTH);
      if (!name) {
        this.formError = this.$t('settings.nameRequired');
        return;
      }
      this.saving = true;
      try {
        const deck = await createDeck({ name, topic: this.topicId });
        this.$emit('created', deck);
      } catch (error) {
        this.formError = error.code === 'deck_name_required'
          ? this.$t('settings.nameRequired')
          : (error.message || this.$t('decks.createError'));
      } finally {
        this.saving = false;
      }
    },
    async createFromSpreadsheet() {
      const text = this.pasteText.trim();
      if (!text) {
        this.formError = this.$t('decks.spreadsheetEmpty');
        return;
      }
      const cards = this.detectedCards.length
        ? this.detectedCards
        : autoDetectSpreadsheet(text).cards;
      if (!cards.length) {
        this.formError = this.$t('decks.spreadsheetNoCards');
        return;
      }
      const name = (this.name.trim() || this.$t('decks.defaultImportedName')).slice(0, MAX_DECK_NAME_LENGTH);
      this.saving = true;
      try {
        const deck = await createDeckFromSpreadsheet({
          name,
          topic: this.topicId,
          text,
          cards,
        });
        this.$emit('created', deck);
      } catch (error) {
        const code = error.code;
        if (code === 'no_spreadsheet_cards') this.formError = this.$t('decks.spreadsheetNoCards');
        else if (code === 'spreadsheet_too_large') this.formError = this.$t('decks.spreadsheetTooLarge');
        else if (code === 'spreadsheet_too_many') this.formError = this.$t('decks.spreadsheetTooMany');
        else this.formError = error.message || this.$t('decks.createError');
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
  align-items: flex-end;
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
  width: min(480px, 100%);
  max-height: min(92vh, 880px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card-bg);
  border-radius: 30px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: left;
}
.sheet-wide { width: min(560px, 100%); }
.sheet-magic, .sheet-topics { width: min(520px, 100%); }
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 14px 20px 0;
  flex: 0 0 auto;
}
.sheet-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: var(--inset-bg);
  color: var(--title);
  cursor: pointer;
}
.sheet-nav svg { width: 18px; height: 18px; }
.sheet-nav:disabled { opacity: 0.4; cursor: default; }
.sheet-page {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 8px 0 24px;
}
.page-title {
  margin: 0 auto 12px;
  max-width: 22rem;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  color: var(--title);
}
.page-title.tight { max-width: 14rem; margin-bottom: 28px; }
.page-title.left, .page-body.left { text-align: left; max-width: none; }
.page-body {
  margin: 0 auto 28px;
  max-width: 26rem;
  text-align: center;
  color: var(--text-secondary);
  line-height: 1.45;
  font-size: 1rem;
}
.options, .step, .magic-list, .app-only {
  padding: 4px 24px 8px;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.option {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 148px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 30px;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.option.create {
  background: #F2FDE0;
  border-color: #C7EA8F;
}
.option.magic {
  background: #F0FDFA;
  border-color: #5EEAD4;
}
.copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 28px 24px;
  padding-right: 8px;
}
.copy strong {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}
.option.create .copy strong { color: #2B4005; }
.option.magic .copy strong { color: #134E4A; }
.copy small {
  font-size: 0.875rem;
  line-height: 1.45;
}
.option.create .copy small { color: #507712; }
.option.magic .copy small { color: #0D9488; }
.option img {
  width: 132px;
  height: 148px;
  object-fit: contain;
  object-position: bottom right;
  flex: 0 0 auto;
  align-self: flex-end;
  pointer-events: none;
  border-bottom-right-radius: 28px;
}
.pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.2;
}
.and-more {
  font-size: 0.75rem;
  font-weight: 500;
  color: #0D9488;
}
.field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  margin: 0 0 24px;
  color: var(--title);
  font-weight: 600;
}
.field input, .field textarea {
  border: 1px solid var(--empty-bar);
  background: var(--inset-bg);
  color: var(--title);
  border-radius: 16px;
  padding: 14px 16px;
  font: inherit;
  font-weight: 500;
}
.field textarea {
  min-height: 160px;
  resize: vertical;
  line-height: 1.45;
}
.primary-btn {
  width: 100%;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: var(--blue-button);
  color: var(--button-text);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  box-sizing: border-box;
  cursor: pointer;
}
.primary-btn:hover { background: var(--blue-button-hover); }
.primary-btn:disabled { opacity: 0.45; cursor: default; }
.topic-picker { margin: 0 0 20px; }
.magic-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.magic-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid var(--card-list-border, var(--empty-bar));
  border-radius: 20px;
  background: var(--inset-bg);
  color: var(--title);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.magic-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.magic-icon svg {
  width: 20px;
  height: 20px;
}
.magic-icon svg.sparkle { transform: rotate(90deg); }
.magic-label {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 1rem;
}
.chevron {
  width: 14px;
  height: 14px;
  color: var(--text-secondary);
  flex: 0 0 auto;
  margin-right: 6px;
}
.file-input { display: none; }
.dropzone {
  width: 100%;
  border: 1.5px dashed var(--empty-bar);
  background: transparent;
  border-radius: 20px;
  padding: 28px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  color: var(--blue-button);
  font: inherit;
  font-weight: 650;
}
.dropzone svg {
  width: 28px;
  height: 28px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.dropzone:disabled { opacity: 0.45; cursor: default; }
.drop-hint { color: var(--text-secondary); font-size: 0.85rem; font-weight: 500; }
.or {
  text-align: center;
  color: var(--text-secondary);
  margin: 16px 0 !important;
  font-weight: 600;
}
.preview {
  margin: 4px 0 16px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--secondary-btn-bg);
}
.preview-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--title);
  margin-bottom: 6px;
}
.preview ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}
.preview li {
  display: flex;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text);
  min-width: 0;
}
.preview .q, .preview .a {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.preview .q { font-weight: 650; color: var(--title); flex: 1 1 46%; }
.preview .a { flex: 1 1 46%; }
.preview .sep { color: var(--text-secondary); flex: 0 0 auto; }
.app-only { padding-bottom: 12px; }
.store { margin-top: 8px; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.form-error { color: var(--error); margin: 0 0 16px; text-align: center; }
html[data-theme="dark"] .option.create {
  background: #1A2E05;
  border-color: #3F6212;
}
html[data-theme="dark"] .option.magic {
  background: #042F2E;
  border-color: #0F766E;
}
html[data-theme="dark"] .option.create .copy strong { color: #ECFCCB; }
html[data-theme="dark"] .option.magic .copy strong { color: #CCFBF1; }
html[data-theme="dark"] .option.create .copy small { color: #BEF264; }
html[data-theme="dark"] .option.magic .copy small,
html[data-theme="dark"] .and-more { color: #5EEAD4; }
@media (min-width: 560px) {
  .sheet-root { align-items: center; }
}
</style>
