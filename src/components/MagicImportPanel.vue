<template>
  <form class="magic-form" @submit.prevent="submit">
    <h2 id="add-deck-import-title" class="page-title left">{{ $t(sourceMeta.titleKey) }}</h2>
    <p class="page-body left">{{ $t(bodyKey) }}</p>

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
    <label v-else-if="source === 'paste'" class="field">
      <span class="sr-only">{{ $t('decks.magicNotesPlaceholder') }}</span>
      <textarea
        v-model="text"
        rows="8"
        :disabled="busy"
        :placeholder="$t('decks.magicNotesPlaceholder')"
      ></textarea>
    </label>
    <label v-else-if="source === 'youtube'" class="field">
      <span class="sr-only">{{ $t('decks.magicYoutubePlaceholder') }}</span>
      <input
        v-model="text"
        type="url"
        :disabled="busy"
        :placeholder="$t('decks.magicYoutubePlaceholder')"
      >
    </label>
    <div v-else-if="source === 'record'" class="record">
      <button type="button" class="dropzone" :disabled="busy" @click="toggleRecord">
        <span class="drop-title">{{ recording ? $t('decks.magicRecordStop') : $t('decks.magicRecordStart') }}</span>
        <span v-if="audioFile" class="drop-hint">{{ $t('decks.magicRecordReady') }}</span>
      </button>
    </div>
    <div v-else>
      <input
        ref="fileInput"
        class="file-input"
        type="file"
        :accept="accept"
        :disabled="busy"
        @change="onFile"
      >
      <button type="button" class="dropzone" :disabled="busy" @click="$refs.fileInput?.click()">
        <span class="drop-title">{{ $t('decks.magicChooseFile') }}</span>
        <span class="drop-hint">{{ file ? file.name : $t(hintKey) }}</span>
      </button>
    </div>

    <div v-if="polling" class="progress" aria-live="polite">
      <div class="bar"><div class="bar-fill" :style="{ width: `${progress}%` }"></div></div>
      <p>{{ progress ? $t('decks.magicProgressBody', { progress }) : $t('decks.magicProgressQueued') }}</p>
    </div>
    <p v-if="formError" class="form-error">{{ formError }}</p>
    <button v-if="!polling" type="submit" class="primary-btn" :disabled="busy">
      {{ busy ? $t('decks.magicWorking') : $t('decks.continue') }}
    </button>
  </form>
</template>

<script>
import { fetchDeck, fetchMagicImportJob, startMagicImport } from '../api/mopiq';
import DeckTopicsPicker from './DeckTopicsPicker.vue';
import {
  acceptForSource,
  fileMatchesSource,
  fileTooLarge,
  importJobView,
  MAGIC_SOURCES,
  POLL_INTERVAL_MS,
  validateNotes,
  validatePrompt,
  validateYouTubeUrl,
} from '../study/magicImport';

const ERROR_KEYS = {
  prompt_too_short: 'decks.magicPromptTooShort',
  prompt_too_long: 'decks.magicPromptTooLong',
  notes_too_short: 'decks.magicNotesTooShort',
  notes_too_long: 'decks.magicNotesTooLong',
  youtube_invalid: 'decks.magicYoutubeInvalid',
  file_type: 'decks.magicFileType',
  file_too_large: 'decks.magicFileTooLarge',
  file_required: 'decks.magicChooseFile',
  recording_required: 'decks.magicRecordStart',
  too_many_jobs: 'decks.magicTooMany',
  deck_busy: 'decks.magicTooMany',
  enqueue_failed: 'decks.magicProgressFailed',
};

export default {
  name: 'MagicImportPanel',
  components: { DeckTopicsPicker },
  props: {
    source: { type: String, required: true },
    deckId: { type: String, default: '' },
  },
  emits: ['busy', 'queued', 'done'],
  data() {
    return {
      name: '',
      topicId: 'other',
      text: '',
      file: null,
      audioFile: null,
      recording: false,
      recorder: null,
      busy: false,
      polling: false,
      progress: 0,
      formError: '',
      jobId: '',
      resultDeckId: '',
      timer: 0,
    };
  },
  computed: {
    sourceMeta() {
      return MAGIC_SOURCES.find((item) => item.id === this.source) || MAGIC_SOURCES[0];
    },
    accept() {
      return acceptForSource(this.source);
    },
    asksForDeckDetails() {
      return !this.deckId && this.source !== 'aiPrompt';
    },
    bodyKey() {
      if (this.source === 'aiPrompt') return 'decks.magicPromptBody';
      if (this.source === 'paste') return 'decks.magicNotesBody';
      if (this.source === 'youtube') return 'decks.magicYoutubeBody';
      if (this.source === 'record') return 'decks.magicRecordBody';
      if (this.source === 'anki') return 'decks.magicAnkiBody';
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
  },
  beforeUnmount() {
    this.stopPoll();
    this.stopRecorder();
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
    onFile(event) {
      const next = event.target?.files?.[0];
      event.target.value = '';
      if (!next) return;
      if (!fileMatchesSource(this.source, next.name)) {
        this.formError = this.$t('decks.magicFileType');
        return;
      }
      if (fileTooLarge(this.source, next.size)) {
        this.formError = this.$t('decks.magicFileTooLarge');
        return;
      }
      this.file = next;
      this.formError = '';
      if (!this.name.trim()) this.name = next.name.replace(/\.[^.]+$/, '').slice(0, 120);
    },
    stopRecorder() {
      const recorder = this.recorder;
      if (recorder && recorder.state === 'recording') recorder.stop();
      this.recorder = null;
      this.recording = false;
    },
    async toggleRecord() {
      if (this.recording) {
        this.recorder?.stop();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = window.MediaRecorder?.isTypeSupported?.('audio/webm') ? 'audio/webm' : '';
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks = [];
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const type = recorder.mimeType || 'audio/webm';
          const ext = type.includes('mp4') ? 'm4a' : 'webm';
          this.audioFile = new File(chunks, `recording.${ext}`, { type });
          this.recording = false;
          this.recorder = null;
        };
        recorder.start();
        this.recorder = recorder;
        this.recording = true;
        this.audioFile = null;
        this.formError = '';
      } catch {
        this.formError = this.$t('decks.magicRecordDenied');
      }
    },
    localError() {
      if (this.source === 'aiPrompt') return validatePrompt(this.text);
      if (this.source === 'paste') return validateNotes(this.text);
      if (this.source === 'youtube') return validateYouTubeUrl(this.text);
      if (this.source === 'record') return this.audioFile ? '' : 'recording_required';
      return this.file ? '' : 'file_required';
    },
    async submit() {
      if (this.busy || this.polling) return;
      const code = this.localError();
      if (code) {
        this.formError = this.messageFor({ code });
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
          file: this.source === 'record' ? this.audioFile : this.file,
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
        this.setBusy(false);
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
.drop-hint { color: var(--text-secondary); font-size: 0.9rem; }
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
.progress p { margin: 8px 0 0; color: var(--text-secondary); }
.bar {
  height: 8px;
  border-radius: 99px;
  background: var(--inset-bg);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: #0d9488;
  width: 0;
}
</style>
