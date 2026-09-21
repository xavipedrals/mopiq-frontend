<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="creator-root"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="'card-editor-title'"
      @keydown.esc="onCancel"
    >
      <header class="nav">
          <button type="button" class="nav-text" :disabled="saving" @click="onCancel">
            {{ $t('common.cancel') }}
          </button>
          <h2 id="card-editor-title">{{ title }}</h2>
          <div class="nav-trailing">
            <button
              v-if="!lockReason"
              type="button"
              class="nav-icon"
              :class="{ on: extraOpen }"
              :aria-label="$t('editor.more')"
              :aria-pressed="extraOpen"
              @click="extraOpen = !extraOpen"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.7"/>
                <circle cx="8" cy="12" r="1.15" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.15" fill="currentColor"/>
                <circle cx="16" cy="12" r="1.15" fill="currentColor"/>
              </svg>
            </button>
            <button
              v-if="!lockReason"
              type="button"
              class="nav-text save"
              :disabled="saving"
              @click="save"
            >
              {{ saving ? $t('common.loading') : $t('common.save') }}
            </button>
          </div>
      </header>

      <div class="creator-shell">
        <div class="extra" :class="{ open: extraOpen && !lockReason }">
          <div class="extra-inner">
            <div class="extra-row">
              <svg class="extra-glyph" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 8h11M7 8l3-3M7 8l3 3M17 16H6M17 16l-3-3M17 16l-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="extra-label">{{ $t('editor.reverse') }}</span>
              <button type="button" class="info-btn" :aria-label="$t('editor.reverseInfoTitle')" @click="reverseInfoOpen = true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.7"/>
                  <path d="M12 11.2V16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <circle cx="12" cy="8.2" r="1" fill="currentColor"/>
                </svg>
              </button>
              <button
                type="button"
                class="ios-switch"
                :class="{ on: reverseCards }"
                role="switch"
                :aria-checked="reverseCards"
                :disabled="Boolean(card) || hasCloze"
                @click="reverseCards = !reverseCards"
              >
                <i></i>
              </button>
            </div>
            <div class="extra-rule"></div>
            <div class="extra-row">
              <svg class="extra-glyph" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 8.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-7.2L9 6.2A2 2 0 0 0 7.6 5.7H6A2 2 0 0 0 4 7.7v.8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
              </svg>
              <span class="extra-label">{{ $t('editor.folder') }}</span>
              <label class="folder-pick">
                <select v-model="selectedSubdeckId">
                  <option v-for="folder in folders" :key="folder.id" :value="folder.id">
                    {{ folder.fullPath.replace(/::/g, ' / ') }}
                  </option>
                </select>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.7"/>
                  <path d="M8.4 10.6L12 14.2l3.6-3.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </label>
            </div>
          </div>
        </div>

        <div class="creator-scroll">
          <p v-if="lockReason === 'occlusion'" class="note">{{ $t('editor.lockedOcclusion') }}</p>
          <p v-else-if="lockReason === 'audio'" class="note">{{ $t('editor.lockedAudio') }}</p>

          <template v-if="!lockReason">
            <div class="side-label">{{ $t('editor.front') }}</div>
            <div
              class="editor-frame"
              :class="{ active: activeSide === 'front', empty: frontEmpty }"
              :data-placeholder="$t('editor.placeholder')"
              @focusin="activeSide = 'front'"
            >
              <editor-content v-if="frontEditor" :editor="frontEditor" />
            </div>

            <div class="side-label back">{{ $t('editor.back') }}</div>
            <div
              class="editor-frame"
              :class="{ active: activeSide === 'back', empty: backEmpty }"
              :data-placeholder="$t('editor.placeholder')"
              @focusin="activeSide = 'back'"
            >
              <editor-content v-if="backEditor" :editor="backEditor" />
            </div>

            <button type="button" class="add-many" :disabled="saving" @click="openImport">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4.5l.7 2.1H15l-1.8 1.3.7 2.1L12 8.7l-1.9 1.3.7-2.1L9 6.6h2.3zM18 11l.5 1.5H20l-1.3.9.5 1.5-1.4-.9-1.4.9.5-1.5-1.3-.9h1.5zM6.5 13l.45 1.35H8.4l-1.15.85.45 1.35-1.2-.8-1.2.8.45-1.35-1.15-.85h1.45z" fill="currentColor"/>
              </svg>
              {{ $t('editor.addMultiple') }}
            </button>
          </template>

          <p v-if="error" class="error">{{ error }}</p>
        </div>

        <div v-if="!lockReason" class="toolbar-dock">
          <div class="toolbar" role="toolbar" :aria-label="$t('editor.formatting')">
            <div class="tb-scroll">
              <div class="tb-group">
                <button type="button" class="tb" :title="$t('editor.image')" @click="pickImage">
                  <svg viewBox="0 0 24 24"><rect x="3.5" y="6" width="17" height="13" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="8.6" cy="10.4" r="1.35" fill="currentColor"/><path d="M7 16.5l4-3.4 2.6 2.2 2.2-1.8 4.2 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <div class="tb-wrap">
                  <button type="button" class="tb" :title="$t('editor.heading')" :aria-expanded="headingOpen" @click="headingOpen = !headingOpen">
                    <svg viewBox="0 0 24 24"><path d="M6 17V7M6 12h7M13 17V7M17.5 17V9.5M17.5 17h2.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                  </button>
                  <div v-if="headingOpen" class="tb-menu" @click.stop>
                    <button type="button" @click="setHeading(1)">{{ $t('editor.headingTitle') }}</button>
                    <button type="button" @click="setHeading(2)">{{ $t('editor.headingSubtitle') }}</button>
                    <button type="button" @click="setParagraph()">{{ $t('editor.headingText') }}</button>
                  </div>
                </div>
              </div>
              <span class="tb-sep"></span>
              <div class="tb-group">
                <button type="button" class="tb" :class="{ on: isActive('bold') }" :title="$t('editor.bold')" @click="run('toggleBold')">
                  <svg viewBox="0 0 24 24"><path d="M7 5.5h6.2a3.4 3.4 0 0 1 0 6.8H7zm0 6.8h7.1A3.5 3.5 0 0 1 14.1 19H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive('italic') }" :title="$t('editor.italic')" @click="run('toggleItalic')">
                  <svg viewBox="0 0 24 24"><path d="M10 5.5h8M6 18.5h8M14.5 5.5L9.5 18.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive('underline') }" :title="$t('editor.underline')" @click="run('toggleUnderline')">
                  <svg viewBox="0 0 24 24"><path d="M7 5.5v7.2a5 5 0 0 0 10 0V5.5M6 19h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive('strike') }" :title="$t('editor.strike')" @click="run('toggleStrike')">
                  <svg viewBox="0 0 24 24"><path d="M6 12h12M9.2 8.2C9.6 6.6 11 5.6 13 5.6c2.1 0 3.5 1.1 3.5 2.8 0 1.2-.6 2-2.4 2.6M8.4 13.4c.4 2.2 2 3.3 4.4 3.3 2.5 0 4.2-1.2 4.2-3.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive('cloze') }" :title="$t('editor.cloze')" @click="toggleCloze">
                  <svg viewBox="0 0 24 24"><path d="M9 7.5c-2.8 0-4.5 1.9-4.5 4.5S6.2 16.5 9 16.5M15 7.5c2.8 0 4.5 1.9 4.5 4.5s-1.7 4.5-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
              </div>
              <span class="tb-sep"></span>
              <div class="tb-group">
                <button type="button" class="tb" :class="{ on: isActive({ textAlign: 'left' }) }" :title="$t('editor.alignLeft')" @click="setAlign('left')">
                  <svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h10M5 17h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive({ textAlign: 'center' }) }" :title="$t('editor.alignCenter')" @click="setAlign('center')">
                  <svg viewBox="0 0 24 24"><path d="M5 7h14M7 12h10M5 17h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive({ textAlign: 'right' }) }" :title="$t('editor.alignRight')" @click="setAlign('right')">
                  <svg viewBox="0 0 24 24"><path d="M5 7h14M9 12h10M5 17h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
              </div>
              <span class="tb-sep"></span>
              <div class="tb-group">
                <label class="tb color" :title="$t('editor.textColor')">
                  <svg viewBox="0 0 24 24"><path d="M6 18.5h12M8.2 15.2L12 6.5l3.8 8.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.3 12.6h5.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
                  <i :style="{ background: textColor }"></i>
                  <input type="color" :value="textColor" @input="setColor($event.target.value)">
                </label>
                <label class="tb color" :title="$t('editor.highlight')">
                  <svg viewBox="0 0 24 24"><path d="M7 15.5l8.2-8.2a2 2 0 0 1 2.8 2.8L9.8 18.3H7zM5.5 19.2h13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>
                  <i :style="{ background: highlightColor }"></i>
                  <input type="color" :value="highlightColor" @input="setHighlight($event.target.value)">
                </label>
              </div>
              <span class="tb-sep"></span>
              <div class="tb-group">
                <button type="button" class="tb" :class="{ on: isActive('bulletList') }" :title="$t('editor.bullets')" @click="run('toggleBulletList')">
                  <svg viewBox="0 0 24 24"><circle cx="6.2" cy="7" r="1.15" fill="currentColor"/><circle cx="6.2" cy="12" r="1.15" fill="currentColor"/><circle cx="6.2" cy="17" r="1.15" fill="currentColor"/><path d="M10 7h8.5M10 12h8.5M10 17h8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive('orderedList') }" :title="$t('editor.numbers')" @click="run('toggleOrderedList')">
                  <svg viewBox="0 0 24 24"><path d="M10 7h8.5M10 12h8.5M10 17h8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5.2 5.6v3.6M4.5 9.2h1.6M4.4 13.1h2.1L4.5 16.4h2.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              <span class="tb-sep"></span>
              <div class="tb-group">
                <button type="button" class="tb" :class="{ on: isActive('link') }" :title="$t('editor.link')" @click="addLink">
                  <svg viewBox="0 0 24 24"><path d="M10 13.5l4-4M8.8 11.2l-1.6 1.6a3.2 3.2 0 0 0 4.5 4.5l1.7-1.7M15.2 12.8l1.6-1.6a3.2 3.2 0 0 0-4.5-4.5l-1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive('superscript') }" :title="$t('editor.superscript')" @click="run('toggleSuperscript')">
                  <svg viewBox="0 0 24 24"><path d="M5 17.5L10.4 7h.4L16.2 17.5M6.7 14.2h8.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.2 6.2h2.6l-2.6 3.2h2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="tb" :class="{ on: isActive('subscript') }" :title="$t('editor.subscript')" @click="run('toggleSubscript')">
                  <svg viewBox="0 0 24 24"><path d="M5 15.5L10.4 5h.4L16.2 15.5M6.7 12.2h8.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.2 16.4h2.6l-2.6 3.2h2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              <span class="tb-sep"></span>
              <div class="tb-group">
                <button type="button" class="tb" :title="$t('editor.undo')" @click="run('undo')">
                  <svg viewBox="0 0 24 24"><path d="M8 8.5H6.2A3.2 3.2 0 0 0 3 11.7v0A3.2 3.2 0 0 0 6.2 15H16a5 5 0 0 0 0-10H9.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8 4.8L5.2 8.5 8 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="tb" :title="$t('editor.redo')" @click="run('redo')">
                  <svg viewBox="0 0 24 24"><path d="M16 8.5h1.8A3.2 3.2 0 0 1 21 11.7v0A3.2 3.2 0 0 1 17.8 15H8a5 5 0 0 1 0-10h6.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16 4.8L18.8 8.5 16 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              <span class="tb-sep"></span>
              <button type="button" class="tb" :title="$t('editor.hideKeyboard')" @click="hideKeyboard">
                <svg viewBox="0 0 24 24"><rect x="3.5" y="6.2" width="17" height="10.4" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 9.2h.1M10 9.2h.1M13 9.2h.1M16 9.2h.1M7 12h10M9.4 18.4L12 16.2l2.6 2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
            <input
              ref="imageInput"
              class="file"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              @change="onPickImage"
            >
          </div>
        </div>
      </div>

      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </div>

    <div v-if="open && reverseInfoOpen" class="overlay" @keydown.esc.stop="reverseInfoOpen = false">
      <button type="button" class="overlay-backdrop" :aria-label="$t('common.close')" @click="reverseInfoOpen = false"></button>
      <section class="sheet reverse-sheet" role="dialog" aria-modal="true" :aria-labelledby="'reverse-info-title'">
        <header class="sheet-nav">
          <button type="button" class="close-circle" :aria-label="$t('common.close')" @click="reverseInfoOpen = false">×</button>
          <h3 id="reverse-info-title">{{ $t('editor.reverse') }}</h3>
          <span class="sheet-spacer"></span>
        </header>
        <div class="reverse-body">
          <div class="previews">
            <div class="preview-card">
              <div class="preview-top">Apple<div class="emoji">🍎</div></div>
              <div class="preview-rule"></div>
              <div class="preview-bottom">Manzana<div class="play"></div></div>
            </div>
            <span class="plus">+</span>
            <div class="preview-card">
              <div class="preview-top">Manzana<div class="play"></div></div>
              <div class="preview-rule"></div>
              <div class="preview-bottom">Apple<div class="emoji">🍎</div></div>
            </div>
          </div>
          <p>{{ $t('editor.reverseInfo') }}</p>
        </div>
      </section>
    </div>

    <div v-if="open && importOpen" class="overlay" @keydown.esc.stop="closeImport">
      <button type="button" class="overlay-backdrop" :aria-label="$t('common.close')" @click="closeImport"></button>
      <section class="sheet import-sheet" role="dialog" aria-modal="true" :aria-labelledby="'import-title'">
        <header class="sheet-nav">
          <button type="button" class="nav-text" :disabled="importing" @click="closeImport">{{ $t('common.cancel') }}</button>
          <h3 id="import-title">{{ $t('editor.addMultiple') }}</h3>
          <span class="sheet-spacer"></span>
        </header>
        <form class="import-body" @submit.prevent="importCards">
          <p>{{ $t('decks.addSpreadsheetBody') }}</p>
          <input
            ref="importFile"
            class="file"
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            :disabled="importing"
            @change="onImportFile"
          >
          <button type="button" class="dropzone" :disabled="importing" @click="$refs.importFile?.click()">
            <span>{{ $t('decks.spreadsheetUpload') }}</span>
            <small>{{ $t('decks.spreadsheetUploadHint') }}</small>
          </button>
          <p class="or">{{ $t('decks.spreadsheetOr') }}</p>
          <textarea
            v-model="pasteText"
            rows="7"
            :placeholder="$t('decks.spreadsheetPlaceholder')"
            :disabled="importing"
          ></textarea>
          <div v-if="detectedCards.length" class="preview-count">
            {{ $t('decks.spreadsheetPreviewCount', { count: detectedCards.length }) }}
          </div>
          <p v-if="importError" class="error">{{ importError }}</p>
          <button type="submit" class="mopiq-btn" :disabled="importing || detectedCards.length === 0">
            {{ importing ? $t('common.loading') : $t('decks.spreadsheetImport', { count: detectedCards.length }) }}
          </button>
        </form>
      </section>
    </div>
  </Teleport>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-3';
import {
  createDeckCard,
  fetchMediaMap,
  importSpreadsheetCards,
  updateDeckCard,
} from '../api/mopiq';
import { cardEditorHtmlFields, cardWebEditLock } from '../study/cardFields';
import { cardEditorExtensions } from '../study/cardEditorSchema';
import {
  editorImageDisplaySize,
  prepareCardImage,
  rewriteSrcForEditor,
  rewriteSrcForStorage,
} from '../study/cardMedia';
import { parseDeckFolders, rootFolderId } from '../study/deckFolders';
import {
  assertSpreadsheetLimits,
  autoDetectSpreadsheet,
  decodeSpreadsheetBytes,
  MAX_SPREADSHEET_BYTES,
  MAX_SPREADSHEET_CHARS,
} from '../study/spreadsheetImport';
import {
  CardHtmlTooLargeError,
  containsClozeMarkup,
  editorHtmlToStored,
  htmlLooksEmpty,
  sanitizeCardHtml,
} from '../study/sanitizeCardHtml';

export default {
  name: 'CardEditor',
  components: { EditorContent },
  props: {
    open: { type: Boolean, default: false },
    deck: { type: Object, default: null },
    card: { type: Object, default: null },
    nextPosition: { type: Number, default: 0 },
  },
  emits: ['dismiss', 'saved'],
  data() {
    return {
      frontEditor: null,
      backEditor: null,
      activeSide: 'front',
      toolbarTick: 0,
      saving: false,
      error: '',
      toast: '',
      toastTimer: 0,
      reverseCards: false,
      extraOpen: false,
      headingOpen: false,
      reverseInfoOpen: false,
      importOpen: false,
      importing: false,
      importError: '',
      pasteText: '',
      detectedCards: [],
      selectedSubdeckId: 0,
      pendingImages: [],
      mediaMap: {},
      textColor: '#1E293D',
      highlightColor: '#fde047',
      hydrateId: 0,
    };
  },
  computed: {
    title() {
      return this.card ? this.$t('editor.editTitle') : this.$t('editor.addTitle');
    },
    lockReason() {
      return cardWebEditLock(this.card);
    },
    folders() {
      return parseDeckFolders(this.deck?.decks, this.deck?.name || '');
    },
    hasCloze() {
      void this.toolbarTick;
      return containsClozeMarkup(this.frontEditor?.getHTML?.() || '');
    },
    frontEmpty() {
      void this.toolbarTick;
      return htmlLooksEmpty(this.frontEditor?.getHTML?.() || '');
    },
    backEmpty() {
      void this.toolbarTick;
      return htmlLooksEmpty(this.backEditor?.getHTML?.() || '');
    },
    activeEditor() {
      void this.toolbarTick;
      return this.activeSide === 'back' ? this.backEditor : this.frontEditor;
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        document.documentElement.classList.toggle('card-editor-open', isOpen);
        if (isOpen) this.hydrate();
        else this.teardown();
      },
    },
    card() {
      if (this.open) this.hydrate();
    },
    pasteText() {
      const text = this.pasteText.trim();
      this.detectedCards = text ? autoDetectSpreadsheet(text).cards : [];
    },
    hasCloze(value) {
      if (value) this.reverseCards = false;
    },
  },
  mounted() {
    document.addEventListener('click', this.closeMenus);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeMenus);
    this.teardown();
    document.documentElement.classList.remove('card-editor-open');
  },
  methods: {
    closeMenus(event) {
      if (!event.target.closest?.('.tb-wrap')) this.headingOpen = false;
    },
    isActive(name) {
      void this.toolbarTick;
      return Boolean(this.activeEditor?.isActive(name));
    },
    run(command) {
      this.headingOpen = false;
      this.activeEditor?.chain().focus()[command]().run();
    },
    setAlign(align) {
      this.headingOpen = false;
      this.activeEditor?.chain().focus().setTextAlign(align).run();
    },
    setHeading(level) {
      this.headingOpen = false;
      this.activeEditor?.chain().focus().toggleHeading({ level }).run();
    },
    setParagraph() {
      this.headingOpen = false;
      this.activeEditor?.chain().focus().setParagraph().run();
    },
    setColor(value) {
      this.textColor = value;
      this.activeEditor?.chain().focus().setColor(value).run();
    },
    setHighlight(value) {
      this.highlightColor = value;
      this.activeEditor?.chain().focus().toggleHighlight({ color: value }).run();
    },
    hideKeyboard() {
      this.activeEditor?.commands.blur();
    },
    addLink() {
      const previous = this.activeEditor?.getAttributes('link').href || 'https://';
      const url = window.prompt(this.$t('editor.linkPrompt'), previous);
      if (url === null) return;
      const trimmed = url.trim();
      if (!trimmed) {
        this.activeEditor?.chain().focus().unsetLink().run();
        return;
      }
      this.activeEditor?.chain().focus().setLink({ href: trimmed }).run();
    },
    toggleCloze() {
      if (this.activeSide !== 'front') {
        this.error = this.$t('editor.clozeFrontOnly');
        return;
      }
      this.frontEditor?.chain().focus().toggleCloze().run();
    },
    pickImage() {
      this.$refs.imageInput?.click();
    },
    async onPickImage(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      this.error = '';
      try {
        const prepared = await prepareCardImage(file);
        const blobUrl = URL.createObjectURL(prepared.blob);
        this.pendingImages.push({ ...prepared, blobUrl });
        this.activeEditor?.chain().focus().setImage({
          src: blobUrl,
          ...editorImageDisplaySize(prepared.width, prepared.height),
        }).run();
      } catch (error) {
        this.error = error.code === 'too-big'
          ? this.$t('editor.imageTooBig')
          : this.$t('editor.imageError');
      }
    },
    editorOptions(content) {
      return {
        extensions: cardEditorExtensions(),
        content: content || '<p></p>',
        editorProps: {
          attributes: { class: 'card-prose', spellcheck: 'true' },
        },
        onSelectionUpdate: () => { this.toolbarTick += 1; },
        onTransaction: () => { this.toolbarTick += 1; },
      };
    },
    async hydrate() {
      const requestId = this.hydrateId + 1;
      this.hydrateId = requestId;
      this.error = '';
      this.toast = '';
      this.reverseCards = false;
      this.extraOpen = false;
      this.headingOpen = false;
      this.reverseInfoOpen = false;
      this.importOpen = false;
      this.activeSide = 'front';
      this.revokePending();
      this.selectedSubdeckId = this.card?.subdeckId || rootFolderId(this.folders) || 0;
      this.mediaMap = {};
      if (this.deck?.id) {
        try { this.mediaMap = await fetchMediaMap(this.deck.id); } catch { this.mediaMap = {}; }
      }
      if (requestId !== this.hydrateId || !this.open) return;
      const fields = this.card
        ? cardEditorHtmlFields(this.card)
        : { front: '', back: '' };
      const front = rewriteSrcForEditor(fields.front, this.mediaMap);
      const back = rewriteSrcForEditor(fields.back, this.mediaMap);
      this.ensureEditors(front, back);
    },
    ensureEditors(front, back) {
      if (this.frontEditor) {
        this.frontEditor.commands.setContent(front || '<p></p>', false);
        this.backEditor.commands.setContent(back || '<p></p>', false);
        return;
      }
      this.frontEditor = new Editor(this.editorOptions(front));
      this.backEditor = new Editor(this.editorOptions(back));
    },
    storedFields() {
      const front = sanitizeCardHtml(editorHtmlToStored(
        rewriteSrcForStorage(this.frontEditor?.getHTML() || '', this.mediaMap, this.pendingImages),
      ));
      const back = sanitizeCardHtml(editorHtmlToStored(
        rewriteSrcForStorage(this.backEditor?.getHTML() || '', this.mediaMap, this.pendingImages),
      ));
      return { front, back };
    },
    showToast(text) {
      this.toast = text;
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => { this.toast = ''; }, 1600);
    },
    onCancel() {
      if (this.saving || this.importing) return;
      this.$emit('dismiss');
    },
    async save() {
      if (!this.deck || this.saving || this.lockReason) return;
      this.error = '';
      let front;
      let back;
      try {
        ({ front, back } = this.storedFields());
      } catch (error) {
        this.error = error instanceof CardHtmlTooLargeError
          ? this.$t('editor.tooLong')
          : (error.message || this.$t('editor.saveError'));
        return;
      }
      if (containsClozeMarkup(back)) {
        this.error = this.$t('editor.clozeFrontOnly');
        return;
      }
      const cloze = containsClozeMarkup(front);
      if (htmlLooksEmpty(front) && htmlLooksEmpty(back)) {
        this.error = this.$t('editor.empty');
        return;
      }
      if (htmlLooksEmpty(front)) {
        this.error = this.$t('editor.frontRequired');
        return;
      }
      if (!cloze && htmlLooksEmpty(back)) {
        this.error = this.$t('editor.backRequired');
        return;
      }
      this.saving = true;
      try {
        const files = this.pendingImages.map(({ blob, contentType, fileName }) => ({ blob, contentType, fileName }));
        const payload = {
          frontHtml: front,
          backHtml: back,
          subdeckId: Number(this.selectedSubdeckId) || 0,
          files,
        };
        const saved = this.card
          ? await updateDeckCard(this.deck, this.card, payload)
          : await createDeckCard(this.deck, { ...payload, position: this.nextPosition });
        let extra = null;
        if (!this.card && this.reverseCards && !cloze) {
          extra = await createDeckCard(this.deck, {
            frontHtml: back,
            backHtml: front,
            position: (this.nextPosition || 0) + 1,
            subdeckId: payload.subdeckId,
            files,
          });
        }
        this.$emit('saved', {
          card: saved,
          extra,
          created: !this.card,
          keepOpen: !this.card,
        });
        if (!this.card) {
          this.revokePending();
          this.frontEditor?.commands.setContent('<p></p>', false);
          this.backEditor?.commands.setContent('<p></p>', false);
          this.reverseCards = false;
          this.showToast(this.$t('editor.added'));
          this.$nextTick(() => this.frontEditor?.commands.focus('end'));
        }
      } catch (error) {
        console.error(error);
        this.error = error.message || this.$t('editor.saveError');
      } finally {
        this.saving = false;
      }
    },
    openImport() {
      this.importError = '';
      this.pasteText = '';
      this.detectedCards = [];
      this.importOpen = true;
    },
    closeImport() {
      if (this.importing) return;
      this.importOpen = false;
    },
    async onImportFile(event) {
      const file = event.target?.files?.[0];
      event.target.value = '';
      if (!file) return;
      if (file.size > MAX_SPREADSHEET_BYTES) {
        this.importError = this.$t('decks.spreadsheetTooLarge');
        return;
      }
      try {
        const text = decodeSpreadsheetBytes(await file.arrayBuffer());
        if (text.length > MAX_SPREADSHEET_CHARS) {
          this.importError = this.$t('decks.spreadsheetTooLarge');
          return;
        }
        this.pasteText = text;
        this.importError = '';
      } catch {
        this.importError = this.$t('decks.spreadsheetReadError');
      }
    },
    async importCards() {
      if (this.importing || !this.deck) return;
      const text = this.pasteText.trim();
      if (!text) {
        this.importError = this.$t('decks.spreadsheetEmpty');
        return;
      }
      const cards = this.detectedCards.length
        ? this.detectedCards
        : autoDetectSpreadsheet(text).cards;
      if (!cards.length) {
        this.importError = this.$t('decks.spreadsheetNoCards');
        return;
      }
      this.importing = true;
      this.importError = '';
      try {
        assertSpreadsheetLimits(text, cards);
        const imported = await importSpreadsheetCards(this.deck, cards, {
          subdeckId: Number(this.selectedSubdeckId) || 0,
          startPosition: this.nextPosition || 0,
        });
        this.importOpen = false;
        this.$emit('saved', { imported, created: true, keepOpen: true });
        this.showToast(imported.length === 1
          ? this.$t('editor.added')
          : this.$t('editor.addedMany', { count: imported.length }));
      } catch (error) {
        const code = error.code;
        if (code === 'no_spreadsheet_cards') this.importError = this.$t('decks.spreadsheetNoCards');
        else if (code === 'spreadsheet_too_large') this.importError = this.$t('decks.spreadsheetTooLarge');
        else if (code === 'spreadsheet_too_many') this.importError = this.$t('decks.spreadsheetTooMany');
        else this.importError = error.message || this.$t('editor.saveError');
      } finally {
        this.importing = false;
      }
    },
    revokePending() {
      for (const item of this.pendingImages) {
        if (item.blobUrl) URL.revokeObjectURL(item.blobUrl);
      }
      this.pendingImages = [];
    },
    teardown() {
      window.clearTimeout(this.toastTimer);
      this.revokePending();
      this.frontEditor?.destroy();
      this.backEditor?.destroy();
      this.frontEditor = null;
      this.backEditor = null;
      this.extraOpen = false;
      this.headingOpen = false;
      this.reverseInfoOpen = false;
      this.importOpen = false;
      this.toast = '';
    },
  },
};
</script>

<style scoped>
.creator-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  color: var(--title);
}
.creator-shell {
  flex: 1 1 auto;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.nav {
  display: grid;
  grid-template-columns: minmax(72px, 1fr) auto minmax(72px, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: calc(4px + env(safe-area-inset-top)) 8px 4px 4px;
}
.nav h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  text-align: center;
  color: var(--title);
}
.nav-text {
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-size: 17px;
  padding: 8px 12px;
  cursor: pointer;
  text-align: left;
}
.nav-text.save {
  font-weight: 650;
  text-align: right;
}
.nav-trailing {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 2px;
}
.nav-icon {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: var(--blue-button);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.nav-icon.on { background: color-mix(in srgb, var(--blue-button) 14%, transparent); }
.nav-icon svg { width: 26px; height: 26px; }

.extra {
  height: 0;
  opacity: 0;
  overflow: hidden;
  transition: height 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;
}
.extra.open {
  height: 110px;
  opacity: 1;
}
.extra-inner { padding: 8px 16px 0; }
.extra-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}
.extra-glyph, .info-btn svg { width: 22px; height: 22px; color: var(--title); flex: 0 0 auto; }
.extra-label { flex: 1 1 auto; font-size: 15px; color: var(--title); }
.info-btn {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  padding: 0;
  cursor: pointer;
}
.extra-rule {
  height: 1px;
  background: var(--empty-bar);
  margin: 8px 0;
  transform: scaleY(0.5);
}
.folder-pick {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--blue-button);
  max-width: 55%;
}
.folder-pick select {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-size: 15px;
  text-align: right;
  max-width: 100%;
  cursor: pointer;
}
.folder-pick svg { width: 22px; height: 22px; flex: 0 0 auto; }

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

.creator-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 0 20px 108px;
  text-align: left;
}
.side-label {
  font-size: 14px;
  font-weight: 900;
  color: #475569;
  padding: 12px 0;
  user-select: none;
}
.side-label.back { margin-top: 24px; }
.note {
  background: var(--inset-bg);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.9rem;
  margin: 16px 0 0;
}
.editor-frame {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid #E2E8F0;
  background: #f1f5f9;
  color: var(--title);
  border-radius: 24px;
  min-height: 200px;
  height: auto;
  overflow: visible;
  padding: 16px;
  font-weight: 400;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}
.editor-frame.active {
  border-width: 1.5px;
  border-color: var(--blue-button);
}
.editor-frame.empty::before {
  content: attr(data-placeholder);
  color: #94A3B8;
  pointer-events: none;
  position: absolute;
  top: 16px;
  left: 16px;
  font-size: 15pt;
}
.editor-frame > :deep(*) {
  min-height: 168px;
  height: auto;
  overflow: visible;
}
.editor-frame :deep(.card-prose) {
  outline: none;
  min-height: 168px;
  height: auto;
  overflow: visible;
  font-size: 15pt;
  line-height: 1.5;
}
.editor-frame :deep(.card-prose p) { margin: 0; }
.editor-frame :deep(.card-prose h1),
.editor-frame :deep(.card-prose h2),
.editor-frame :deep(.card-prose h3) {
  margin: 0;
  line-height: 1.2;
}
.editor-frame :deep(.card-prose img) {
  display: block;
  max-width: min(100%, 420px);
  max-height: 280px;
  height: auto;
  object-fit: contain;
}
.editor-frame :deep(.anki-cloze) {
  background: rgba(10, 122, 255, 0.16);
  border-bottom: 2.5px solid #0A7AFF;
  border-radius: 3px;
  padding: 0 1px;
}

.add-many {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 16px auto 0;
  padding: 10px 26px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--card-bg) 55%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) inset, 0 8px 24px rgba(15, 23, 42, 0.08);
  color: var(--title);
  font: inherit;
  font-size: 17px;
  cursor: pointer;
}
.add-many svg { width: 19px; height: 19px; transform: rotate(90deg); }
.creator-scroll { display: flex; flex-direction: column; }
.add-many { align-self: center; }

.toolbar-dock {
  position: sticky;
  bottom: 0;
  padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, var(--card-bg) 40%, transparent);
}
.toolbar {
  height: 56px;
  border-radius: 22px;
  background: color-mix(in srgb, var(--card-bg) 62%, transparent);
  backdrop-filter: saturate(180%) blur(22px);
  -webkit-backdrop-filter: saturate(180%) blur(22px);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}
.tb-scroll {
  display: flex;
  align-items: center;
  height: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 6px;
}
.tb-scroll::-webkit-scrollbar { display: none; }
.tb-group { display: flex; align-items: center; }
.tb-sep {
  width: 1px;
  height: 30px;
  background: var(--empty-bar);
  margin: 0 3px;
  flex: 0 0 auto;
}
.tb, .tb-wrap .tb {
  width: 48px;
  height: 44px;
  border: 0;
  background: transparent;
  color: var(--title);
  border-radius: 10px;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  flex: 0 0 auto;
}
.tb svg { width: 22px; height: 22px; }
.tb.on { color: var(--blue-button); }
.tb.color { position: relative; }
.tb.color i {
  position: absolute;
  bottom: 7px;
  width: 16px;
  height: 3px;
  border-radius: 2px;
}
.tb.color input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.tb-wrap { position: relative; }
.tb-menu {
  position: absolute;
  right: 0;
  bottom: 48px;
  min-width: 148px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
  padding: 6px;
  z-index: 2;
}
.tb-menu button {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--title);
  font: inherit;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.tb-menu button:hover { background: var(--inset-bg); }
.file { display: none; }

.toast {
  position: fixed;
  left: 50%;
  top: 38%;
  transform: translate(-50%, -50%);
  background: rgba(30, 41, 59, 0.86);
  color: #fff;
  padding: 12px 22px;
  border-radius: 14px;
  font-weight: 600;
  z-index: 90;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 85;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.overlay-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
}
.sheet {
  position: relative;
  width: min(640px, 100%);
  max-height: min(88vh, 760px);
  overflow: auto;
  background: var(--page-bg);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.2);
}
.sheet-nav {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  padding: 10px 12px 0;
}
.sheet-nav h3 {
  margin: 0;
  text-align: center;
  font-size: 17px;
  font-weight: 650;
}
.close-circle {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 15px;
  background: var(--empty-bar);
  color: var(--text);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}
.sheet-spacer { width: 30px; }
.reverse-body { padding: 8px 24px 28px; }
.previews {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 10px 0 18px;
}
.preview-card {
  width: 148px;
  border-radius: 22px;
  background: var(--card-bg);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  text-align: center;
}
.preview-top, .preview-bottom { padding: 16px 10px; font-size: 15px; }
.preview-rule { height: 1px; background: var(--empty-bar); margin: 0 12px; }
.emoji { font-size: 30px; margin-top: 8px; }
.play {
  width: 34px;
  height: 34px;
  margin: 10px auto 0;
  border-radius: 17px;
  background: var(--blue-button);
}
.plus { font-size: 28px; font-weight: 700; color: var(--blue-button); }
.reverse-body p {
  margin: 0;
  font-size: 16px;
  line-height: 1.55;
  color: var(--text);
}
.import-body {
  padding: 8px 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.import-body textarea, .dropzone {
  border: 1px solid var(--empty-bar);
  border-radius: 14px;
  background: var(--card-bg);
  color: var(--title);
  font: inherit;
}
.import-body textarea { padding: 12px; min-height: 140px; }
.dropzone {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px;
  cursor: pointer;
}
.dropzone small { color: var(--text-secondary); }
.or { text-align: center; color: var(--text-secondary); margin: 0; }
.preview-count { font-weight: 650; }
.mopiq-btn {
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
  font-weight: 600 !important;
  padding: 10px 20px !important;
  border-radius: 12px;
  cursor: pointer;
}
.error { color: var(--error); }

html[data-theme="dark"] .creator-root { background: #1E293B; }
html[data-theme="dark"] .side-label { color: #94A3B8; }
html[data-theme="dark"] .editor-frame {
  background: #334455;
  border-color: #475569;
}
html[data-theme="dark"] .editor-frame.active { border-color: #67E8F9; }
html[data-theme="dark"] .editor-frame :deep(.anki-cloze) {
  background: rgba(103, 232, 249, 0.18);
  border-bottom-color: #67E8F9;
}
html[data-theme="dark"] .ios-switch { background: #475569; }
</style>
