<template>
  <form class="magic-form" @submit.prevent="submit">
    <div v-if="pdfBusy" class="pdf-wait" aria-live="polite" aria-busy="true">
      <span class="pdf-spin" aria-hidden="true"></span>
      <p>{{ pdfPhase === 'uploading' ? $t('decks.pdfUploading') : $t('decks.pdfOpening') }}</p>
    </div>
    <template v-else-if="pdfPhase === 'pages'">
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <PdfPageSelector
        :pages="pdfPages"
        :selected="pdfPageSelection"
        @toggle="togglePdfPage"
        @toggle-all="toggleAllPdfPages"
        @continue="submitPdf"
      />
    </template>
    <div v-else-if="showJobProgress" class="import-wait" aria-live="polite" :aria-busy="formError ? 'false' : 'true'">
      <span v-if="!formError" class="pdf-spin" aria-hidden="true"></span>
      <p id="add-deck-import-title" class="wait-title">{{ $t('decks.magicProgressTitle') }}</p>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <p v-else-if="hasProgress">{{ $t('decks.magicProgressBody', { progress }) }}</p>
      <p v-else>{{ $t('decks.magicProgressQueued') }}</p>
    </div>
    <template v-else>
    <h2 id="add-deck-import-title" class="page-title left">{{ $t(titleKey) }}</h2>
    <p v-if="bodyKey" class="page-body left">{{ $t(bodyKey) }}</p>

    <template v-if="asksForDeckDetails">
      <label class="field">
        <span>{{ $t('decks.magicNameLabel') }}</span>
        <input v-model="name" type="text" maxlength="120" :disabled="busy" :placeholder="$t('decks.magicNameOptional')">
      </label>
      <p class="topic-label">{{ $t('settings.topic') }}</p>
      <DeckTopicsPicker v-model="topicId" :disabled="busy" />
    </template>

    <label v-if="source === 'aiPrompt'" class="field">
      <span class="sr-only">{{ $t('decks.magicPromptPlaceholder') }}</span>
      <textarea
        v-model="text"
        rows="6"
        maxlength="2000"
        :disabled="busy"
        :placeholder="$t('decks.magicPromptPlaceholder')"
      ></textarea>
    </label>
    <label v-else-if="source === 'paste'" class="field notes-field">
      <textarea
        v-model="text"
        rows="8"
        :disabled="busy"
        :aria-label="$t('decks.magicPaste')"
        :placeholder="$t('decks.magicPaste')"
      ></textarea>
    </label>
    <label v-else-if="source === 'youtube'" class="field">
      <input
        v-model="text"
        type="url"
        inputmode="url"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        :disabled="busy"
        :aria-label="$t('decks.youtubeLinkTitle')"
        :placeholder="$t('decks.magicYoutubePlaceholder')"
      >
    </label>
    <div
      v-else-if="source === 'photo'"
      class="file-drop"
      :class="{ targeted: dragOver, busy: busy || polling }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onPhotoDrop"
    >
      <input
        ref="fileInput"
        class="file-input"
        type="file"
        multiple
        :accept="accept"
        :disabled="busy"
        @change="onPhotos"
      >
      <svg class="file-glyph" viewBox="0 0 24 24" aria-hidden="true">
        <path v-for="(d, index) in fileGlyph" :key="index" :d="d" />
      </svg>
      <p class="drag-title">{{ photos.length ? $t('decks.photoCount', { count: photos.length }) : $t('decks.magicDragHint') }}</p>
      <p class="drop-hint">{{ $t(hintKey) }}</p>
      <ul v-if="photos.length" class="photo-strip">
        <li v-for="(photo, index) in photos" :key="photo.url">
          <img :src="photo.url" alt="">
          <button type="button" class="photo-remove" :disabled="busy" :aria-label="$t('common.clear')" @click="removePhoto(index)">×</button>
        </li>
      </ul>
      <button type="button" class="select-files" :disabled="busy" @click="pickFile">
        {{ $t('decks.magicSelectFiles') }}
      </button>
      <p v-if="photoReading" class="drop-hint">{{ $t('decks.photoReading') }}</p>
    </div>
    <div
      v-else
      class="file-drop"
      :class="{ targeted: dragOver, busy: busy || polling }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        class="file-input"
        type="file"
        :accept="accept"
        :disabled="busy || polling"
        @change="onFile"
      >
      <svg class="file-glyph" viewBox="0 0 24 24" aria-hidden="true">
        <path v-for="(d, index) in fileGlyph" :key="index" :d="d" />
      </svg>
      <p class="drag-title">{{ file ? file.name : $t('decks.magicDragHint') }}</p>
      <p class="drop-hint">{{ $t(hintKey) }}</p>
      <button type="button" class="select-files" :disabled="busy || polling" @click="pickFile">
        {{ $t('decks.magicSelectFiles') }}
      </button>
    </div>

    <p v-if="formError" class="form-error">{{ formError }}</p>
    <button v-if="showContinue && !polling" type="submit" class="primary-btn" :disabled="busy || linkEmpty || photosEmpty">
      {{ busy ? $t('decks.magicWorking') : $t('decks.continue') }}
    </button>
    </template>
  </form>
</template>

<script>
import { fetchDeck, fetchMagicImportJob, startMagicImport } from '../api/mopiq';
import DeckTopicsPicker from './DeckTopicsPicker.vue';
import PdfPageSelector from './PdfPageSelector.vue';
import { getLocale } from '../i18n';
import { extractNotePhotoText, MAX_NOTE_PHOTOS } from '../study/notePhotoOcr';
import { loadPdfPreviews } from '../study/pdfDocument';
import {
  sortedPdfPages,
  validatePdfPageSelection,
} from '../study/pdfPages';
import {
  acceptForSource,
  backgroundsPromptDeck,
  fileMatchesSource,
  fileTooLarge,
  importJobView,
  isFileDropSource,
  MAGIC_SOURCES,
  POLL_INTERVAL_MS,
  usesPdfPagePicker,
  validateNotes,
  validatePrompt,
  validateYouTubeUrl,
} from '../study/magicImport';

const FILE_GLYPH = [
  'M14 3v4a1 1 0 0 0 1 1h4',
  'M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z',
];

const UPLOAD_TITLES = {
  pdf: 'decks.magicUploadPdf',
  powerpoint: 'decks.magicUploadPowerpoint',
  word: 'decks.magicUploadWord',
  photo: 'decks.magicUploadPhoto',
  audioFile: 'decks.magicUploadAudio',
  anki: 'decks.magicUploadAnki',
};

const ERROR_KEYS = {
  prompt_too_short: 'decks.magicPromptTooShort',
  prompt_too_long: 'decks.magicPromptTooLong',
  notes_too_short: 'decks.magicNotesTooShort',
  notes_too_long: 'decks.magicNotesTooLong',
  youtube_invalid: 'decks.magicYoutubeInvalid',
  file_type: 'decks.magicFileType',
  file_too_large: 'decks.magicFileTooLarge',
  file_required: 'decks.magicChooseFile',
  too_many_jobs: 'decks.magicTooMany',
  deck_busy: 'decks.magicTooMany',
  enqueue_failed: 'decks.magicProgressFailed',
  pages_required: 'decks.pdfContinueEmpty',
  photo_required: 'decks.photoNone',
  photo_too_many: 'decks.photoTooMany',
  pages: 'decks.pdfInvalid',
  pdf_invalid: 'decks.pdfInvalid',
  too_many_pages: 'decks.pdfTooManyPages',
};

export default {
  name: 'MagicImportPanel',
  components: { DeckTopicsPicker, PdfPageSelector },
  props: {
    source: { type: String, required: true },
    deckId: { type: String, default: '' },
  },
  emits: ['busy', 'queued', 'done', 'background', 'layout'],
  data() {
    return {
      name: '',
      topicId: 'other',
      text: '',
      file: null,
      photos: [],
      photoReading: false,
      fileGlyph: FILE_GLYPH,
      dragOver: false,
      dragDepth: 0,
      starting: false,
      busy: false,
      polling: false,
      progress: 0,
      formError: '',
      jobId: '',
      resultDeckId: '',
      timer: 0,
      pdfPhase: '',
      pdfPages: [],
      pdfPageSelection: [],
      pdfRenderToken: 0,
    };
  },
  computed: {
    sourceMeta() {
      return MAGIC_SOURCES.find((item) => item.id === this.source) || MAGIC_SOURCES[0];
    },
    accept() {
      return acceptForSource(this.source);
    },
    isFileSource() {
      return isFileDropSource(this.source);
    },
    asksForDeckDetails() {
      return !this.deckId && !this.isFileSource && this.source !== 'aiPrompt' && this.source !== 'paste' && this.source !== 'youtube';
    },
    linkEmpty() {
      return (this.source === 'paste' || this.source === 'youtube') && !this.text.trim();
    },
    photosEmpty() {
      return this.source === 'photo' && this.photos.length === 0;
    },
    showContinue() {
      return !this.isFileSource || this.source === 'photo';
    },
    titleKey() {
      if (this.source === 'paste') return 'decks.pasteNotesTitle';
      if (this.source === 'youtube') return 'decks.youtubeLinkTitle';
      return UPLOAD_TITLES[this.source] || this.sourceMeta.titleKey;
    },
    bodyKey() {
      if (this.source === 'paste' || this.source === 'youtube') return '';
      if (this.isFileSource) return 'decks.magicDragSubtitle';
      if (this.source === 'aiPrompt') return 'decks.magicPromptBody';
      return 'decks.magicDropBody';
    },
    hintKey() {
      if (this.source === 'powerpoint') return 'decks.magicDropHintSlides';
      if (this.source === 'word') return 'decks.magicDropHintWord';
      if (this.source === 'photo') return 'decks.magicDropHintPhoto';
      if (this.source === 'audioFile') return 'decks.magicDropHintAudio';
      if (this.source === 'anki') return 'decks.magicDropHintAnki';
      return 'decks.magicDropHintPdf';
    },
    pdfBusy() {
      return this.pdfPhase === 'opening' || this.pdfPhase === 'uploading';
    },
    showJobProgress() {
      return this.polling || this.pdfPhase === 'progress';
    },
    hasProgress() {
      return this.progress > 0;
    },
  },
  watch: {
    pdfPhase(phase) {
      const wide = phase === 'opening' || phase === 'pages' || phase === 'uploading';
      this.$emit('layout', wide ? 'pdf-pages' : '');
    },
  },
  beforeUnmount() {
    this.pdfRenderToken += 1;
    this.revokePdfThumbnails();
    this.revokePhotoUrls();
    this.stopPoll();
  },
  methods: {
    setBusy(value) {
      this.busy = value;
      this.$emit('busy', value);
    },
    messageFor(error) {
      const key = ERROR_KEYS[error?.code];
      return key ? this.$t(key) : (error?.message || this.$t('decks.magicProgressFailed'));
    },
    pickFile() {
      this.$refs.fileInput?.click();
    },
    onDragEnter() {
      if (this.busy || this.polling || this.starting || this.pdfBusy) return;
      this.dragDepth += 1;
      this.dragOver = true;
    },
    onDragOver() {
      if (this.busy || this.polling || this.starting || this.pdfBusy) return;
      this.dragOver = true;
    },
    onDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1);
      if (this.dragDepth === 0) this.dragOver = false;
    },
    onDrop(event) {
      this.dragDepth = 0;
      this.dragOver = false;
      if (this.busy || this.polling) return;
      this.acceptFile(event.dataTransfer?.files?.[0]);
    },
    onPhotoDrop(event) {
      this.dragDepth = 0;
      this.dragOver = false;
      if (this.busy) return;
      this.addPhotos(event.dataTransfer?.files);
    },
    onPhotos(event) {
      const files = event.target?.files;
      event.target.value = '';
      this.addPhotos(files);
    },
    addPhotos(fileList) {
      if (this.busy) return;
      const incoming = [...(fileList || [])];
      if (!incoming.length) return;
      const next = this.photos.slice();
      for (const file of incoming) {
        if (!fileMatchesSource('photo', file.name)) {
          this.formError = this.$t('decks.magicFileType');
          continue;
        }
        if (fileTooLarge('photo', file.size)) {
          this.formError = this.$t('decks.magicFileTooLarge');
          continue;
        }
        next.push({ file, url: URL.createObjectURL(file) });
      }
      if (next.length > MAX_NOTE_PHOTOS) {
        for (const photo of next.slice(MAX_NOTE_PHOTOS)) URL.revokeObjectURL(photo.url);
        this.photos = next.slice(0, MAX_NOTE_PHOTOS);
        this.formError = this.$t('decks.photoTooMany');
        return;
      }
      this.photos = next;
      if (incoming.every((file) => fileMatchesSource('photo', file.name))) this.formError = '';
    },
    removePhoto(index) {
      const photo = this.photos[index];
      if (photo?.url) URL.revokeObjectURL(photo.url);
      this.photos = this.photos.filter((_, item) => item !== index);
    },
    revokePhotoUrls() {
      for (const photo of this.photos) {
        if (photo?.url) URL.revokeObjectURL(photo.url);
      }
    },
    onFile(event) {
      const next = event.target?.files?.[0];
      event.target.value = '';
      this.acceptFile(next);
    },
    acceptFile(next) {
      if (!next || this.busy || this.polling || this.starting || this.pdfBusy) return;
      if (!fileMatchesSource(this.source, next.name)) {
        this.formError = this.$t('decks.magicFileType');
        this.file = null;
        return;
      }
      if (fileTooLarge(this.source, next.size)) {
        this.formError = this.$t('decks.magicFileTooLarge');
        this.file = null;
        return;
      }
      this.file = next;
      this.formError = '';
      this.name = next.name.replace(/\.[^.]+$/, '').slice(0, 120);
      if (usesPdfPagePicker(this.source)) {
        this.openSelectedPdf();
        return;
      }
      this.starting = true;
      this.submit();
    },
    revokePdfThumbnails() {
      for (const page of this.pdfPages) {
        if (String(page.thumbnail || '').startsWith('blob:')) URL.revokeObjectURL(page.thumbnail);
      }
    },
    async openSelectedPdf() {
      const token = this.pdfRenderToken + 1;
      this.pdfRenderToken = token;
      this.revokePdfThumbnails();
      this.pdfPages = [];
      this.pdfPageSelection = [];
      this.formError = '';
      this.pdfPhase = 'opening';
      try {
        await loadPdfPreviews(this.file, {
          isCancelled: () => token !== this.pdfRenderToken,
          onOpen: ({ pageCount }) => {
            if (token !== this.pdfRenderToken) return;
            this.pdfPages = Array.from({ length: pageCount }, (_, index) => ({
              number: index + 1,
              thumbnail: '',
            }));
            this.pdfPhase = 'pages';
          },
          onThumbnails: (batch) => {
            if (token !== this.pdfRenderToken) {
              for (const page of batch) {
                if (String(page.thumbnail || '').startsWith('blob:')) URL.revokeObjectURL(page.thumbnail);
              }
              return;
            }
            const next = this.pdfPages.slice();
            for (const page of batch) {
              const index = page.number - 1;
              if (next[index]) next[index] = { ...next[index], thumbnail: page.thumbnail };
            }
            this.pdfPages = next;
          },
        });
        if (token !== this.pdfRenderToken) return;
        if (this.pdfPhase === 'opening') this.pdfPhase = 'pages';
      } catch (error) {
        if (token !== this.pdfRenderToken) return;
        this.revokePdfThumbnails();
        this.pdfPages = [];
        this.pdfPageSelection = [];
        this.file = null;
        this.pdfPhase = '';
        this.formError = this.messageFor(error);
      }
    },
    togglePdfPage(number) {
      if (this.pdfPageSelection.includes(number)) {
        this.pdfPageSelection = this.pdfPageSelection.filter((page) => page !== number);
      } else {
        this.pdfPageSelection = [...this.pdfPageSelection, number];
      }
    },
    toggleAllPdfPages() {
      if (this.pdfPageSelection.length === this.pdfPages.length) {
        this.pdfPageSelection = [];
        return;
      }
      this.pdfPageSelection = this.pdfPages.map((page) => page.number);
    },
    async submitPdf() {
      const code = validatePdfPageSelection(this.pdfPageSelection, this.pdfPages.length);
      if (code) {
        this.formError = this.messageFor({ code });
        return;
      }
      this.formError = '';
      this.pdfPhase = 'uploading';
      await this.submit();
    },
    localError() {
      if (this.source === 'aiPrompt') return validatePrompt(this.text);
      if (this.source === 'paste') return validateNotes(this.text);
      if (this.source === 'youtube') return validateYouTubeUrl(this.text);
      if (!this.file) return 'file_required';
      if (usesPdfPagePicker(this.source)) {
        return validatePdfPageSelection(this.pdfPageSelection, this.pdfPages.length);
      }
      return '';
    },
    async submitPhotos() {
      if (this.busy || this.photos.length === 0) {
        this.formError = this.$t('decks.photoNone');
        return;
      }
      this.formError = '';
      this.photoReading = true;
      this.setBusy(true);
      try {
        const text = await extractNotePhotoText(this.photos.map((photo) => photo.file), {
          locale: getLocale() || 'en',
        });
        if (text.trim().length < 40) {
          this.formError = this.$t('decks.photoNoText');
          return;
        }
        const started = await startMagicImport({
          source: 'paste',
          deckId: this.deckId,
          name: '',
          topic: '',
          text,
        });
        this.resultDeckId = started.deckId;
        this.jobId = started.jobId;
        if (started.deck) this.$emit('queued', started.deck);
        const view = importJobView(started);
        if (view.finished || !started.jobId) {
          const deck = started.deck || await fetchDeck(started.deckId).catch(() => ({ id: started.deckId }));
          this.$emit('done', deck);
          return;
        }
        this.polling = true;
        this.progress = 0;
        this.timer = window.setInterval(() => this.poll(), POLL_INTERVAL_MS);
        this.poll();
      } catch (error) {
        this.formError = this.messageFor(error);
        if (error?.deckId) this.$emit('queued', { id: error.deckId });
      } finally {
        this.photoReading = false;
        this.setBusy(false);
      }
    },
    async submit() {
      if (this.source === 'photo') {
        await this.submitPhotos();
        return;
      }
      if (this.busy || this.polling) return;
      const code = this.localError();
      if (code) {
        this.starting = false;
        this.formError = this.messageFor({ code });
        if (this.pdfPhase === 'uploading') this.pdfPhase = 'pages';
        return;
      }
      this.formError = '';
      this.setBusy(true);
      try {
        const started = await startMagicImport({
          source: this.source,
          deckId: this.deckId,
          name: this.source === 'aiPrompt' ? '' : this.name,
          topic: this.source === 'aiPrompt' ? '' : this.topicId,
          text: this.text,
          file: this.file,
          pages: usesPdfPagePicker(this.source) ? sortedPdfPages(this.pdfPageSelection) : null,
        });
        this.resultDeckId = started.deckId;
        this.jobId = started.jobId;
        if (started.deck) this.$emit('queued', started.deck);
        const view = importJobView(started);
        if (view.finished || !started.jobId) {
          const deck = started.deck || await fetchDeck(started.deckId).catch(() => ({ id: started.deckId }));
          this.$emit('done', deck);
          return;
        }
        if (backgroundsPromptDeck({
          source: this.source,
          deckId: this.deckId,
          jobId: started.jobId,
          status: started.status,
        })) {
          this.$emit('background', {
            jobId: started.jobId,
            deckId: started.deckId,
            status: started.status || 'queued',
          });
          return;
        }
        this.polling = true;
        this.progress = 0;
        this.timer = window.setInterval(() => this.poll(), POLL_INTERVAL_MS);
        this.poll();
      } catch (error) {
        this.formError = this.messageFor(error);
        if (error?.deckId) this.$emit('queued', { id: error.deckId });
      } finally {
        this.starting = false;
        this.setBusy(false);
        if (this.pdfPhase === 'uploading') {
          this.pdfPhase = this.formError ? 'pages' : 'progress';
        }
      }
    },
    stopPoll() {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = 0;
      this.polling = false;
    },
    async poll() {
      if (!this.jobId) return;
      try {
        const job = await fetchMagicImportJob(this.jobId);
        const view = importJobView(job);
        this.progress = view.progress;
        if (!view.finished && !view.failed) return;
        this.stopPoll();
        if (view.failed) {
          this.formError = job?.errorMessage || this.$t('decks.magicProgressFailed');
          return;
        }
        const deck = await fetchDeck(this.resultDeckId).catch(() => ({ id: this.resultDeckId }));
        this.$emit('done', deck);
      } catch (error) {
        this.stopPoll();
        this.formError = error.message || this.$t('decks.magicProgressFailed');
      }
    },
  },
};
</script>

<style scoped>
.magic-form { display: flex; flex-direction: column; gap: 14px; }
.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--title);
}
.page-title.left, .page-body.left { text-align: left; }
.page-body { margin: 0; color: var(--text-secondary); line-height: 1.45; }
.field, .record { display: flex; flex-direction: column; gap: 8px; }
.notes-field textarea { min-height: 250px; }
.field span, .topic-label { color: var(--text-secondary); font-size: 0.92rem; }
.topic-label { margin: 4px 0 0; }
input, textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--card-list-border, var(--empty-bar));
  border-radius: 16px;
  background: var(--inset-bg);
  color: var(--title);
  font: inherit;
  padding: 12px 14px;
}
textarea { resize: vertical; }
.file-input { display: none; }
.dropzone {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 18px;
  border: 1px dashed var(--card-list-border, var(--empty-bar));
  border-radius: 18px;
  background: var(--inset-bg);
  color: var(--title);
  font: inherit;
  cursor: pointer;
}
.file-drop {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 24px;
  border-radius: 24px;
  background: var(--card-bg);
  text-align: center;
  border: 1.5px dashed var(--empty-bar);
  transition: background 0.15s ease, border-color 0.15s ease;
}
.file-drop.targeted {
  background: color-mix(in srgb, var(--blue-button) 8%, transparent);
  border-color: var(--blue-button);
  border-width: 2px;
}
.file-drop.busy { opacity: 0.7; }
.file-glyph {
  width: 48px;
  height: 48px;
  margin-bottom: 6px;
  fill: none;
  stroke: var(--text-secondary);
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.file-drop.targeted .file-glyph { stroke: var(--blue-button); }
.drag-title {
  margin: 0;
  color: var(--title);
  font-size: 1rem;
  font-weight: 650;
  overflow-wrap: anywhere;
}
.drop-hint { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }
.select-files {
  margin-top: 10px;
  border: 1px solid var(--empty-bar);
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--title);
  font: inherit;
  font-weight: 650;
  padding: 12px 28px;
  cursor: pointer;
}
.select-files:disabled { opacity: 0.55; cursor: default; }
.form-error { color: var(--error); margin: 0; }
.primary-btn {
  border: 0;
  border-radius: 16px;
  padding: 14px 18px;
  background: var(--title);
  color: var(--card-bg);
  font: inherit;
  font-weight: 650;
  cursor: pointer;
}
.primary-btn:disabled, .dropzone:disabled { opacity: 0.55; cursor: default; }
.import-wait {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px 40px;
  text-align: center;
  color: var(--text-secondary);
}
.import-wait p { margin: 0; }
.wait-title {
  color: var(--title);
  font-size: 1.15rem;
  font-weight: 700;
}
.pdf-wait {
  min-height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--text-secondary);
}
.pdf-wait p { margin: 0; }
.pdf-spin {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--blue-button) 25%, transparent);
  border-top-color: var(--blue-button);
  animation: pdf-spin 0.8s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .pdf-spin { animation: none; }
}
@keyframes pdf-spin { to { transform: rotate(360deg); } }
.photo-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  max-width: 100%;
}
.photo-strip li {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--inset-bg);
}
.photo-strip img { width: 100%; height: 100%; object-fit: cover; }
.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.72);
  color: white;
  font: inherit;
  line-height: 1;
  cursor: pointer;
}
.photo-remove:disabled { opacity: 0.45; cursor: default; }
</style>
