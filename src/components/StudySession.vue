<template>
  <div class="shell study-shell">
    <div class="container-xl">
      <div class="top">
        <button
          type="button"
          class="study-close"
          :disabled="leaving"
          :aria-label="leaving ? $t('study.savingSession') : $t('study.closeStudy')"
          @click="leave"
        >
          <span class="study-close-disc"></span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <path d="M9.05 9.05l5.9 5.9M14.95 9.05l-5.9 5.9" fill="none" stroke="var(--close-x)" stroke-width="1.85" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="top-track">
          <div v-if="showCheckpoints" class="last10" :aria-label="$t('study.last10')">
            <div
              v-for="(answer, index) in last10"
              :key="index"
              class="slot"
              :class="[answer && answer.toLowerCase(), { current: index === currentSlot }]"
            >
              <div class="slot-halo"></div>
              <div class="slot-fill"></div>
            </div>
          </div>
          <div v-else class="mix-bar" aria-hidden="true">
            <div class="mix-seg mix-again" :style="{ width: mixPercents.again }"></div>
            <div class="mix-seg mix-hard" :style="{ width: mixPercents.hard }"></div>
            <div class="mix-seg mix-good" :style="{ width: mixPercents.good }"></div>
            <div class="mix-seg mix-easy" :style="{ width: mixPercents.easy }"></div>
          </div>
        </div>
        <span class="top-balance" aria-hidden="true"></span>
      </div>

      <div v-if="saveError && !loading && !loadError" class="save-banner" role="alert">
        <span>{{ saveError }}</span>
        <button type="button" class="text-btn" @click="retrySaves">{{ $t('study.retrySave') }}</button>
      </div>

      <RobotLoader v-if="loading" :title="$t('study.preparing')" />
      <p v-else-if="loadError" class="error">{{ loadError }}</p>
      <div v-else-if="done" class="done">
        <h1>{{ $t('study.doneTitle') }}</h1>
        <p>{{ $t('study.doneBody') }}</p>
        <button type="button" class="mopiq-btn" :disabled="leaving" @click="leave">{{ leaving ? $t('study.saving') : $t('study.backToDeck') }}</button>
      </div>
      <div v-else-if="current" class="board">
        <div class="card-stage">
          <iframe
            class="card-frame"
            sandbox=""
            :srcdoc="shownHtml"
            :style="{ colorScheme: studyScheme }"
            title="Flashcard"
          ></iframe>
        </div>
        <div class="controls">
          <template v-if="!showAnswer">
            <div v-if="writing" class="write-box">
              <label class="write-label" for="study-write-answer">{{ $t('study.typeAnswer') }}</label>
              <textarea
                id="study-write-answer"
                ref="writeInput"
                v-model="draftAnswer"
                rows="3"
                :placeholder="$t('study.writePlaceholder')"
                @keydown.enter.exact.prevent="submitWrittenAnswer"
              ></textarea>
              <div class="write-actions">
                <button type="button" class="write-cancel" @click="cancelWriting">{{ $t('common.cancel') }}</button>
                <button type="button" class="mopiq-btn" :disabled="!draftAnswer.trim()" @click="submitWrittenAnswer">
                  {{ $t('study.check') }}
                </button>
              </div>
            </div>
            <div class="front-row">
              <button
                type="button"
                class="tool-btn prev-btn"
                :disabled="!canGoPrevious"
                @click="goPrevious"
              >
                <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 15 4 10l5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M20 20v-6a4 4 0 0 0-4-4H4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ $t('study.previous') }}
              </button>
              <button type="button" class="show-answer" @click="reveal">
                <svg class="eye" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="1.8"/>
                </svg>
                {{ $t('study.showAnswer') }}
              </button>
              <button type="button" class="tool-btn write-btn" @click="startWriting">
                <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M8 14h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                {{ $t('study.writeAnswer') }}
              </button>
            </div>
          </template>
          <template v-else>
            <div v-if="typedAnswer" class="typed-overlay">{{ $t('study.youWrote', { answer: typedAnswer }) }}</div>
            <div class="grades">
              <div v-for="grade in gradeButtons" :key="grade.ease" class="grade-col">
                <div class="interval">{{ formatInterval(estimates[grade.ease]) }}</div>
                <button
                  type="button"
                  class="grade"
                  :class="grade.className"
                  @click="answer(grade.ease)"
                >
                  <svg class="face" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" :d="grade.icon"/>
                  </svg>
                  {{ grade.label }}
                </button>
              </div>
            </div>
            <button type="button" class="ask-ai-btn" @click="askAiOpen = true">
              <svg class="sparkle" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3.2 13.4 8l4.8 1.4L13.4 10.8 12 15.6 10.6 10.8 5.8 9.4 10.6 8 12 3.2z"/>
                <path d="M18.6 13.2 19.3 15.4 21.5 16.1 19.3 16.8 18.6 19 17.9 16.8 15.7 16.1 17.9 15.4z"/>
              </svg>
              {{ $t('study.askAi') }}
            </button>
          </template>
        </div>
      </div>
      <AskAISheet
        :open="askAiOpen"
        :card-id="current && current.id"
        :card-question="cardQuestion"
        :card-answer="cardAnswer"
        @close="askAiOpen = false"
      />
      <StudyCheckpoint
        :open="checkpointOpen"
        :answers="sessionAnswers"
        :remaining="remaining"
        :unique-studied="studiedUnique"
        :unique-total="uniqueTotal"
        :elapsed-seconds="elapsedSeconds"
        @continue="continueAfterCheckpoint"
        @stats="leave"
      />
      <StudyLimitSheet
        :open="limitReached && !loading && !loadError"
        :limit="freeLimit"
        action-key="study.backToDeck"
        @dismiss="leave"
      />
    </div>
  </div>
</template>

<script>
import { fetchAllStudyCards, fetchDeck, fetchFreeStudyQuota, fetchMediaMap, incrementFreeStudyQuota, submitReview } from '../api/mopiq';
import { ankiDayString } from '../study/ankiDay';
import { backHtml, cardDocument, cardPlainText, frontHtml } from '../study/cardHtml';
import { applyQuota, FREE_CARD_DAILY_LIMIT, isDailyLimitReached } from '../study/freeStudyQuota';
import { applyAnswer, formatInterval, previewIntervals } from '../study/scheduler';
import { buildStudyQueues, createStudyQueue } from '../study/queue';
import { createReviewSyncQueue } from '../study/reviewSync';
import { getTheme } from '../theme/theme';
import {
  currentSlotIndex,
  emptyLast10,
  gradeCounts,
} from '../study/sessionProgress';
import AskAISheet from './AskAISheet.vue';
import RobotLoader from './RobotLoader.vue';
import StudyCheckpoint from './StudyCheckpoint.vue';
import StudyLimitSheet from './StudyLimitSheet.vue';

const FACE_RING = 'M 10 20 C 4.486 20 0 15.514 0 10 C 0 4.486 4.486 0 10 0 C 15.514 0 20 4.486 20 10 C 20 15.514 15.514 20 10 20 Z M 10 1.25 C 5.175 1.25 1.25 5.175 1.25 10 C 1.25 14.825 5.175 18.75 10 18.75 C 14.825 18.75 18.75 14.825 18.75 10 C 18.75 5.175 14.825 1.25 10 1.25 Z';
const FACE_EYES = 'M 13.125 8.75 C 12.436 8.75 11.875 8.189 11.875 7.5 C 11.875 6.811 12.436 6.25 13.125 6.25 C 13.814 6.25 14.375 6.811 14.375 7.5 C 14.375 8.189 13.814 8.75 13.125 8.75 Z M 6.875 8.75 C 6.186 8.75 5.625 8.189 5.625 7.5 C 5.625 6.811 6.186 6.25 6.875 6.25 C 7.564 6.25 8.125 6.811 8.125 7.5 C 8.125 8.189 7.564 8.75 6.875 8.75 Z';

const GRADE_BUTTONS = [
  {
    ease: 'AGAIN',
    className: 'again',
    icon: `${FACE_RING} M 14.934 13.471 C 14.876 13.354 13.472 10.625 10 10.625 C 6.529 10.625 5.124 13.354 5.066 13.47 C 4.912 13.778 5.037 14.151 5.343 14.306 C 5.651 14.461 6.026 14.338 6.183 14.032 C 6.228 13.944 7.319 11.875 10 11.875 C 12.681 11.875 13.772 13.944 13.816 14.03 C 13.925 14.249 14.146 14.375 14.376 14.375 C 14.469 14.375 14.565 14.354 14.655 14.309 C 14.963 14.155 15.089 13.779 14.934 13.471 Z ${FACE_EYES}`,
  },
  {
    ease: 'HARD',
    className: 'hard',
    icon: `${FACE_RING} ${FACE_EYES} M 14.375 13.125 C 14.375 12.78 14.095 12.5 13.75 12.5 L 6.25 12.5 C 5.905 12.5 5.625 12.78 5.625 13.125 C 5.625 13.47 5.905 13.75 6.25 13.75 L 13.75 13.75 C 14.095 13.75 14.375 13.47 14.375 13.125 Z`,
  },
  {
    ease: 'GOOD',
    className: 'good',
    icon: `${FACE_RING} M 15.559 12.155 C 15.713 11.847 15.589 11.476 15.283 11.32 C 14.976 11.165 14.601 11.287 14.443 11.592 C 14.397 11.68 13.287 13.75 10 13.75 C 6.721 13.75 5.608 11.69 5.557 11.593 C 5.403 11.285 5.028 11.161 4.72 11.316 C 4.412 11.47 4.287 11.846 4.441 12.155 C 4.499 12.271 5.911 15 10 15 C 14.089 15 15.501 12.271 15.559 12.155 Z ${FACE_EYES}`,
  },
  {
    ease: 'EASY',
    className: 'easy',
    icon: `${FACE_RING} M 15.559 12.155 C 15.713 11.847 15.589 11.476 15.283 11.32 C 14.976 11.165 13.287 11.32 10 11.32 C 6.721 11.32 5.028 11.161 4.72 11.316 C 4.412 11.47 4.287 11.846 4.441 12.155 C 4.499 12.271 5.911 16.45 10 16.45 C 14.089 16.45 15.501 12.271 15.559 12.155 Z ${FACE_EYES}`,
  },
];

export default {
  name: 'StudySessionPage',
  components: { AskAISheet, RobotLoader, StudyCheckpoint, StudyLimitSheet },
  data() {
    return {
      loading: true,
      leaving: false,
      loadError: '',
      saveError: '',
      done: false,
      limitReached: false,
      quotaUsed: 0,
      quotaUnlimited: false,
      deck: null,
      queue: null,
      current: null,
      showAnswer: false,
      writing: false,
      draftAnswer: '',
      typedAnswer: '',
      askAiOpen: false,
      shownAt: 0,
      remaining: 0,
      mediaMap: {},
      last10: emptyLast10(),
      sessionAnswers: [],
      showCheckpoints: true,
      checkpointOpen: false,
      studiedUnique: 0,
      uniqueTotal: 0,
      sessionElapsedMs: 0,
      sessionStartedAt: 0,
      reviewSync: null,
      unsubReviewSync: null,
    };
  },
  computed: {
    gradeButtons() {
      return GRADE_BUTTONS.map((grade) => ({
        ...grade,
        label: this.$t(`study.${grade.className}`),
      }));
    },
    studyScheme() {
      return getTheme();
    },
    currentSlot() {
      return currentSlotIndex(this.last10);
    },
    elapsedSeconds() {
      const running = this.sessionStartedAt ? Date.now() - this.sessionStartedAt : 0;
      return Math.floor((this.sessionElapsedMs + running) / 1000);
    },
    mixPercents() {
      const counts = gradeCounts(this.sessionAnswers);
      const total = this.sessionAnswers.length + this.remaining;
      if (total <= 0) {
        return { again: '0%', hard: '0%', good: '0%', easy: '0%' };
      }
      return {
        again: `${(counts.AGAIN / total) * 100}%`,
        hard: `${(counts.HARD / total) * 100}%`,
        good: `${(counts.GOOD / total) * 100}%`,
        easy: `${(counts.EASY / total) * 100}%`,
      };
    },
    estimates() {
      if (!this.current || !this.deck) return { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 };
      return previewIntervals(this.current, this.deck.config);
    },
    shownHtml() {
      if (!this.current) return '';
      const dark = getTheme() === 'dark';
      const html = this.showAnswer
        ? backHtml(this.current, this.mediaMap, { dark })
        : frontHtml(this.current, this.mediaMap);
      return cardDocument(html, { dark });
    },
    formatInterval() {
      return formatInterval;
    },
    canGoPrevious() {
      return Boolean(this.queue && this.current && this.queue.cardStudiedBefore(this.current.id) != null);
    },
    cardQuestion() {
      return this.current ? cardPlainText(this.current, 0) : '';
    },
    cardAnswer() {
      return this.current ? cardPlainText(this.current, 1) : '';
    },
    freeLimit() {
      return FREE_CARD_DAILY_LIMIT;
    },
  },
  async created() {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('beforeunload', this.onBeforeUnload);
    this.reviewSync = createReviewSyncQueue({ submit: submitReview });
    this.unsubReviewSync = this.reviewSync.subscribe((state) => {
      this.saveError = state.error;
    });
    try {
      const deckId = this.$route.params.deckId;
      const studyDay = ankiDayString();
      const [deck, quota] = await Promise.all([
        fetchDeck(deckId),
        fetchFreeStudyQuota(studyDay).catch(() => null),
      ]);
      if (!deck.canStudy) {
        this.$router.replace(`/decks/${deckId}`);
        return;
      }
      this.deck = deck;
      const applied = applyQuota(0, quota, studyDay);
      this.quotaUsed = applied.used;
      this.quotaUnlimited = applied.unlimited;
      if (isDailyLimitReached(quota, studyDay, applied.used)) {
        this.limitReached = true;
        return;
      }
      const [cards, mediaMap] = await Promise.all([
        fetchAllStudyCards(deckId),
        fetchMediaMap(deckId).catch(() => ({})),
      ]);
      this.mediaMap = mediaMap;
      const built = buildStudyQueues(cards, deck.config);
      this.queue = createStudyQueue(built);
      for (const card of cards) this.queue.recordCard(card);
      this.uniqueTotal = built.uniqueCount || 0;
      this.showCheckpoints = deck.config.showCheckpoints !== false;
      this.nextCard();
      this.resumeTimer();
    } catch (error) {
      this.loadError = error.message || this.$t('study.startError');
    } finally {
      this.loading = false;
    }
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    this.unsubReviewSync?.();
    this.pauseTimer();
    if (this.reviewSync?.pendingCount()) {
      void this.reviewSync.flush();
    }
  },
  methods: {
    async leave() {
      if (this.leaving) return;
      this.leaving = true;
      if (this.reviewSync?.pendingCount()) {
        await Promise.race([
          this.reviewSync.flush(),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
      }
      this.$router.push(`/decks/${this.$route.params.deckId}`);
    },
    retrySaves() {
      this.reviewSync?.retry();
    },
    onBeforeUnload(event) {
      if (!this.reviewSync?.pendingCount()) return;
      event.preventDefault();
      event.returnValue = '';
    },
    nextCard() {
      const card = this.queue.pop();
      this.remaining = this.queue.remaining();
      if (!card) {
        this.done = true;
        this.current = null;
        return;
      }
      this.current = card;
      this.resetCardUi();
      this.shownAt = Date.now();
    },
    resetCardUi() {
      this.showAnswer = false;
      this.writing = false;
      this.draftAnswer = '';
      this.typedAnswer = '';
      this.askAiOpen = false;
    },
    goPrevious() {
      if (!this.queue || !this.current || this.checkpointOpen) return;
      const previousId = this.queue.cardStudiedBefore(this.current.id);
      if (previousId == null) return;
      const previous = this.queue.cardById(previousId);
      if (!previous) return;
      this.queue.restoreLastPopped();
      this.current = previous;
      this.resetCardUi();
      this.shownAt = Date.now();
      this.remaining = this.queue.remaining();
      this.done = false;
    },
    startWriting() {
      this.writing = true;
      this.$nextTick(() => this.$refs.writeInput?.focus());
    },
    cancelWriting() {
      this.writing = false;
      this.draftAnswer = '';
    },
    submitWrittenAnswer() {
      const text = this.draftAnswer.trim();
      if (!text) return;
      this.typedAnswer = text;
      this.writing = false;
      this.showAnswer = true;
    },
    reveal() {
      this.showAnswer = true;
      this.writing = false;
    },
    answer(ease) {
      if (!this.current || this.checkpointOpen || this.limitReached || !this.showAnswer) return;
      const previous = this.current;
      const durationMs = Date.now() - this.shownAt;
      const reviewedAt = new Date();
      const updated = applyAnswer(previous, ease, this.deck.config);
      this.queue.afterAnswer(previous, updated);
      this.recordSessionAnswer(ease);
      this.reviewSync.enqueue({
        deckId: this.deck.id,
        card: updated,
        previous,
        answer: ease,
        durationMs,
        reviewedAt,
      });
      if (this.consumeFreeQuota()) {
        this.limitReached = true;
        this.current = null;
        return;
      }
      this.nextCard();
      if (this.showCheckpoints && this.sessionAnswers.length % 10 === 0) {
        this.pauseTimer();
        this.checkpointOpen = true;
      }
    },
    consumeFreeQuota() {
      if (this.quotaUnlimited) return false;
      this.quotaUsed += 1;
      incrementFreeStudyQuota();
      return this.quotaUsed >= FREE_CARD_DAILY_LIMIT;
    },
    recordSessionAnswer(ease) {
      this.sessionAnswers.push(ease);
      const next = this.last10.slice();
      next[(this.sessionAnswers.length - 1) % 10] = ease;
      this.last10 = next;
      this.studiedUnique = this.queue.uniqueStudiedCount();
    },
    continueAfterCheckpoint() {
      this.last10 = emptyLast10();
      this.checkpointOpen = false;
      this.resumeTimer();
    },
    pauseTimer() {
      if (!this.sessionStartedAt) return;
      this.sessionElapsedMs += Date.now() - this.sessionStartedAt;
      this.sessionStartedAt = 0;
    },
    resumeTimer() {
      if (this.sessionStartedAt) return;
      this.sessionStartedAt = Date.now();
    },
    onKey(event) {
      if (this.done || this.limitReached || this.loading || !this.current || this.askAiOpen || this.writing || this.checkpointOpen) return;
      const tag = event.target && event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        if (!this.showAnswer) this.reveal();
        return;
      }
      if (!this.showAnswer) return;
      const map = { Digit1: 'AGAIN', Digit2: 'HARD', Digit3: 'GOOD', Digit4: 'EASY' };
      if (map[event.code]) this.answer(map[event.code]);
    },
  },
};
</script>

<style scoped>
.study-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.study-shell > .container-xl {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: 20px;
}
.top {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0;
  overflow: visible;
}
.study-close,
.top-balance {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
}
.study-close {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: -6px;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 50%;
  background: none !important;
  color: var(--close-button);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
.study-close-disc {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--close-x);
}
.study-close svg {
  position: relative;
  width: 24px;
  height: 24px;
  display: block;
}
.study-close:hover:not(:disabled) {
  color: var(--text);
}
.study-close:focus-visible {
  outline: 2px solid var(--blue-button);
  outline-offset: 2px;
}
.study-close:disabled {
  opacity: 0.55;
  cursor: default;
}
.top-track {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  overflow: visible;
}
.last10 {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 100%;
  max-width: 300px;
  height: 20px;
  overflow: visible;
}
.slot {
  position: relative;
  flex: 1;
  height: 20px;
  min-width: 0;
  overflow: visible;
}
.slot-halo {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 14px;
  margin-top: -7px;
  border-radius: 7px;
  background: transparent;
  transform: scale(0.9, 0.85);
  transform-origin: center center;
  pointer-events: none;
}
.slot.current .slot-halo {
  background: var(--slot-halo);
  animation: slot-pulse 1s linear infinite alternate;
}
.slot-fill {
  position: absolute;
  left: 3px;
  right: 3px;
  top: 50%;
  height: 8px;
  margin-top: -4px;
  border-radius: 5px;
  background: var(--slot-empty);
  z-index: 1;
}
.slot.current:not(.again):not(.hard):not(.good):not(.easy) .slot-fill {
  background: var(--slot-current);
}
.slot.again .slot-fill { background: #F87171; }
.slot.hard .slot-fill { background: #FBBF24; }
.slot.good .slot-fill { background: #A3E635; }
.slot.easy .slot-fill { background: #38BDF8; }
.mix-bar {
  display: flex;
  width: 100%;
  max-width: 300px;
  height: 8px;
  min-width: 0;
  border-radius: 4px;
  overflow: hidden;
  background: var(--empty-bar);
}
.mix-seg { height: 100%; }
.mix-again { background: #F87171; }
.mix-hard { background: #FBBF24; }
.mix-good { background: #A3E635; }
.mix-easy { background: #38BDF8; }
@keyframes slot-pulse {
  from { transform: scale(0.9, 0.85); }
  to { transform: scale(1.1, 1.1); }
}
.text-btn {
  flex: 0 0 auto;
  white-space: nowrap;
  background: none !important;
  color: var(--blue-button) !important;
  font-size: 1rem !important;
  padding: 0 !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
}
.text-btn:hover { background: none !important; }
.text-btn:disabled { opacity: 0.55; cursor: default; }
.board {
  background: var(--study-webview);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  border-radius: 24px;
  padding: 16px 16px 24px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.card-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 240px;
}
.card-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: var(--study-webview);
  color-scheme: inherit;
}
.controls { flex: 0 0 auto; margin-top: 16px; }
.front-row {
  display: grid;
  grid-template-columns: minmax(6.5rem, auto) minmax(0, 1fr) minmax(6.5rem, auto);
  gap: 10px;
  align-items: stretch;
}
.tool-btn {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 64px;
  padding: 10px 8px !important;
  border-radius: 20px !important;
  border: 0 !important;
  background: color-mix(in srgb, var(--blue-button) 12%, transparent) !important;
  color: var(--blue-button) !important;
  font-size: 0.82rem !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
  line-height: 1.15;
  text-align: center;
  cursor: pointer;
}
.tool-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--blue-button) 20%, transparent) !important;
}
.tool-btn:disabled {
  opacity: 0.38;
  cursor: default;
}
.tool-icon { width: 22px; height: 22px; }
.write-box {
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 18px;
  background: var(--inset-bg);
}
.write-label {
  display: block;
  margin-bottom: 8px;
  color: var(--title);
  font-size: 0.88rem;
  font-weight: 650;
}
.write-box textarea {
  width: 100%;
  min-height: 84px;
  resize: vertical;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--card-bg);
  color: var(--title);
  font: inherit;
  font-size: 1rem;
}
.write-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.write-cancel {
  background: none !important;
  color: var(--text) !important;
  padding: 10px 14px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
}
.typed-overlay {
  margin-bottom: 12px;
  padding: 12px 18px;
  border-radius: 0 0 24px 24px;
  background: var(--inset-bg);
  color: var(--title);
  font-size: 1.05rem;
  font-weight: 700;
  text-align: center;
}
.show-answer {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  background: var(--card-bg) !important;
  color: var(--title) !important;
  border: 1px solid var(--stat-icon) !important;
  border-radius: 999px !important;
  font-size: 1.05rem !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  padding: 14px 16px !important;
}
.show-answer:hover { background: var(--inset-bg) !important; }
.ask-ai-btn {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  min-height: 52px;
  background: var(--ask-ai-bg) !important;
  color: var(--ask-ai-text) !important;
  border: 1px solid var(--ask-ai-border) !important;
  border-radius: 20px !important;
  box-shadow: 0 4px 0 var(--ask-ai-border);
  font-size: 1.1rem !important;
  font-weight: 550 !important;
  letter-spacing: 0 !important;
  padding: 12px 20px !important;
  cursor: pointer;
  transform: translateY(0);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.ask-ai-btn:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 var(--ask-ai-border);
}
.sparkle { width: 18px; height: 18px; fill: currentColor; }
.eye { width: 22px; height: 22px; }
.grades {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.grade-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
}
.interval {
  height: 18px;
  margin-bottom: 6px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 18px;
}
.grade {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 68px;
  margin: 0 0 4px !important;
  padding: 10px 6px 12px !important;
  border-radius: 20px !important;
  border: 1px solid transparent !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  transform: translateY(0);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.grade:active {
  transform: translateY(4px);
}
.face {
  width: 20px;
  height: 20px;
  fill: currentColor;
  fill-rule: evenodd;
}
.grade.again {
  background: var(--grade-again-bg) !important;
  border-color: var(--grade-again-border) !important;
  color: var(--grade-again-text) !important;
  box-shadow: 0 4px 0 var(--grade-again-border);
}
.grade.again:active { box-shadow: 0 0 0 var(--grade-again-border); }
.grade.hard {
  background: var(--grade-hard-bg) !important;
  border-color: var(--grade-hard-border) !important;
  color: var(--grade-hard-text) !important;
  box-shadow: 0 4px 0 var(--grade-hard-border);
}
.grade.hard:active { box-shadow: 0 0 0 var(--grade-hard-border); }
.grade.good {
  background: var(--grade-good-bg) !important;
  border-color: var(--grade-good-border) !important;
  color: var(--grade-good-text) !important;
  box-shadow: 0 4px 0 var(--grade-good-border);
}
.grade.good:active { box-shadow: 0 0 0 var(--grade-good-border); }
.grade.easy {
  background: var(--grade-easy-bg) !important;
  border-color: var(--grade-easy-border) !important;
  color: var(--grade-easy-text) !important;
  box-shadow: 0 4px 0 var(--grade-easy-border);
}
.grade.easy:active { box-shadow: 0 0 0 var(--grade-easy-border); }
.done { text-align: center; padding: 64px 16px; }
.done h1 { margin-bottom: 12px; color: var(--title); }
.done p { color: var(--text); margin-bottom: 24px; }
.mopiq-btn {
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
  border-radius: 50px !important;
  font-weight: 600 !important;
  padding: 12px 28px !important;
}
.error { color: var(--error); }
.save-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--error) 12%, var(--card-bg));
  color: var(--error);
  font-size: 0.92rem;
  font-weight: 600;
}
@media (max-width: 640px) {
  .front-row {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "show show"
      "prev write";
  }
  .show-answer { grid-area: show; }
  .prev-btn { grid-area: prev; }
  .write-btn { grid-area: write; }
}
@media (max-width: 480px) {
  .grades { grid-template-columns: 1fr 1fr; gap: 12px 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .grade { transition: none; }
  .slot.current .slot-halo { animation: none; transform: scale(1, 1); }
}
</style>
