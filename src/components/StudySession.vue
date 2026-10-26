<template>
  <div class="shell study-shell" :class="{ 'custom-results-shell': customMode && done }">
    <div class="container-xl">
      <div v-if="!(customMode && done)" class="top">
        <button
          type="button"
          class="study-close"
          :disabled="leaving"
          :aria-label="leaving ? $t('study.savingSession') : $t('study.closeStudy')"
          @click="requestLeave"
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
        <StudyMenu
          :deck-id="deck?.id"
          :card-id="current?.id"
          :show-timer="showTimer"
          :show-keycaps="showKeycaps"
          :can-toggle-keyboard="keyboardAvailable"
          :appearance="appearancePreference"
          :toast-position="toastPosition"
          :can-report="canReport"
          :disabled="leaving || loading || !current"
          @flags-change="cardFlagState = $event"
          @toggle-timer="toggleTimer"
          @toggle-keycaps="toggleKeycaps"
          @set-appearance="setAppearance"
          @set-toast="setToastPosition"
          @edit="openEdit"
          @move-card="openFolderPicker"
          @move-to-deck="openDeckPicker"
          @report="openReport"
          @delete="openDelete"
          @open-change="menuOpen = $event"
          @tutorial="tutorialOpen = true"
        />
        <div v-if="showTimer" class="timer-pill" aria-live="polite">{{ timerLabel }}</div>
      </div>

      <div v-if="saveError && !loading && !loadError" class="save-banner" role="alert">
        <span>{{ saveError }}</span>
        <button type="button" class="text-btn" @click="retrySaves">{{ $t('study.retrySave') }}</button>
      </div>

      <RobotLoader v-if="loading" :title="$t('study.preparing')" />
      <p v-else-if="loadError" class="error">{{ loadError }}</p>
      <CustomStudyResults
        v-else-if="done && customMode"
        :results="customResults"
        :deck="deck"
        :elapsed-seconds="elapsedSeconds"
        :skipped="skippedCustomCards"
        :retrying="retryingCustom"
        :leaving="leaving"
        :error="customRetryError"
        :flush-reviews="flushCustomReviews"
        @retry="retryCustomCards"
        @done="leave"
        @edit="onCustomResultEdited"
        @remove="customResults = customResults.filter(result => result.id !== $event)"
      />
      <div v-else-if="done" class="done">
        <h1>{{ $t('study.doneTitle') }}</h1>
        <p>{{ $t('study.doneBody') }}</p>
        <button type="button" class="mopiq-btn" :disabled="leaving" @click="requestLeave">{{ leaving ? $t('study.saving') : $t('study.backToDeck') }}</button>
      </div>
      <div v-else-if="current" class="board">
        <div class="card-stage" :class="{ 'with-timer': showTimer }">
          <StudyAnswerToast
            v-if="feedbackEase && toastPosition !== 'hide'"
            :ease="feedbackEase"
            :position="toastPosition"
          />
          <iframe
            class="card-frame"
            sandbox=""
            :srcdoc="shownHtml"
            :style="{ colorScheme: studyScheme }"
            title="Flashcard"
          ></iframe>
        </div>
        <div class="controls">
          <aside v-if="activeTip && !tutorialOpen" class="study-tip" role="status"><span><strong>{{ $t(`tutorial.${activeTip}Title`) }}</strong> {{ $t(`tutorial.${activeTip}Body`) }}</span><button :aria-label="$t('common.close')" @click="finishStudyTips">×</button></aside>
          <StudyKeyboardToast v-if="keyboardHintKind" :kind="keyboardHintKind" @dismiss="dismissKeyboardHint" />
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
                <span v-if="showsKeycaps" class="keycap">{{ $t('study.keyboardSpace') }}</span>
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
                  <span v-if="showsKeycaps" class="keycap">{{ grade.digit }}</span>
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
      <StudyPickerSheet
        :open="folderPickerOpen"
        :title="$t('study.moveToFolder')"
        :subtitle="folderSubtitle"
        :items="folderItems"
        :selected-id="folderSelectedId"
        :confirm-label="$t('study.moveCard')"
        :busy="actionBusy"
        :error="actionError"
        @dismiss="folderPickerOpen = false"
        @select="folderSelectedId = $event.id"
        @confirm="confirmMoveToFolder"
      />
      <StudyPickerSheet
        :open="deckPickerOpen"
        :title="$t('study.moveToDeck')"
        :empty-text="$t('study.noOtherDecks')"
        :items="deckItems"
        :busy="actionBusy"
        :error="actionError"
        @dismiss="deckPickerOpen = false"
        @select="chooseTargetDeck"
      />
      <StudyPickerSheet
        :open="targetFolderOpen"
        :title="$t('study.moveToFolder')"
        :items="targetFolderItems"
        :selected-id="targetFolderSelectedId"
        :confirm-label="$t('study.moveCard')"
        :busy="actionBusy"
        :error="actionError"
        @dismiss="targetFolderOpen = false"
        @select="targetFolderSelectedId = $event.id"
        @confirm="confirmMoveToDeck"
      />
      <StudyReportSheet
        :open="reportOpen"
        :busy="actionBusy"
        :error="actionError"
        @dismiss="reportOpen = false"
        @submit="submitReport"
      />
      <StudyConfirmSheet
        :open="deleteOpen"
        :title="$t('study.deleteTitle')"
        :message="$t('study.deleteMessage')"
        :confirm-label="$t('study.deleteCard')"
        :busy="actionBusy"
        :error="actionError"
        @dismiss="deleteOpen = false"
        @confirm="confirmDelete"
      />
      <StudyTutorial :open="tutorialOpen" @done="finishTutorial" />
      <EnjoyPrompt :open="enjoyOpen" @done="finishEnjoy" />
      <CardEditor
        :open="editorOpen"
        :deck="deck"
        :card="current"
        @dismiss="editorOpen = false"
        @saved="onCardEdited"
      />
      <div v-if="actionToast" class="action-toast" role="status">{{ actionToast }}</div>
    </div>
  </div>
</template>

<script>
import { fetchAllStudyCards, fetchDeck, fetchDeckList, fetchFreeStudyQuota, fetchMediaMap, fetchUserProfile, incrementFreeStudyQuota, deleteDeckCard, moveCardToAnotherDeck, moveCardToSubdeck, submitReview, updateUserProfileAnswerFeedback } from '../api/mopiq';
import { fetchCustomStudyCards } from '../api/customStudy';
import { createCustomStudyQueue, readCustomStudySnapshot } from '../study/customStudy';
import { applyFilteredAnswer, filteredPreviewIntervals } from '../study/filteredScheduling';
import { readStudyTips, writeStudyTips, tutorialCompleted, completeTutorial } from '../study/studyTips';
import StudyTutorial from './StudyTutorial.vue';
import EnjoyPrompt from './EnjoyPrompt.vue';
import { isDebugAlwaysShowFeedback, isDebugAlwaysShowStudyTutorial } from '../debug/flags';
import { reportStudyCard } from '../api/reportCard';
import { fetchKeyboardHintHistory, saveKeyboardHintHistory } from '../api/keyboardHints';
import { cachedDeckList } from '../api/deckCache';
import { onSessionChange, getCurrentUser } from '../auth/session';
import { createKeyboardHintHistory, desktopKeyboardLikely, isKeyboardEvidence, isTypingTarget,
  readShowStudyKeycaps, studyShortcutAction, visibleKeyboardHint, writeShowStudyKeycaps } from '../study/keyboardHints';
import StudyKeyboardToast from './StudyKeyboardToast.vue';
import { ankiDayString } from '../study/ankiDay';
import { backHtml, cardDocument, cardPlainText, frontHtml } from '../study/cardHtml';
import { applyQuota, FREE_CARD_DAILY_LIMIT, isDailyLimitReached } from '../study/freeStudyQuota';
import { applyAnswer, formatInterval, previewIntervals } from '../study/scheduler';
import { buildStudyQueues, createStudyQueue } from '../study/queue';
import { deckReviewSync } from '../study/reviewSync';
import { getTheme, getThemePreference, setThemePreference, subscribeTheme } from '../theme/theme';
import {
  currentSlotIndex,
  emptyLast10,
  gradeCounts,
} from '../study/sessionProgress';
import {
  formatStudyTimer,
  hasLocalAnswerFeedbackPosition,
  normalizeAnswerFeedbackPosition,
  readAnswerFeedbackPosition,
  readShowStudyTimer,
  writeAnswerFeedbackPosition,
  writeShowStudyTimer,
} from '../study/answerFeedback';
import {
  folderById,
  folderHasChildren,
  parseDeckFolders,
  rootFolderId,
} from '../study/deckFolders';
import { cardEditableOnWeb } from '../study/cardFields';
import AskAISheet from './AskAISheet.vue';
import CardEditor from './CardEditor.vue';
import RobotLoader from './RobotLoader.vue';
import StudyAnswerToast from './StudyAnswerToast.vue';
import StudyCheckpoint from './StudyCheckpoint.vue';
import StudyConfirmSheet from './StudyConfirmSheet.vue';
import StudyLimitSheet from './StudyLimitSheet.vue';
import StudyMenu from './StudyMenu.vue';
import StudyPickerSheet from './StudyPickerSheet.vue';
import StudyReportSheet from './StudyReportSheet.vue';

import { GRADE_BUTTONS } from '../study/gradeIcons';
import CustomStudyResults from './CustomStudyResults.vue';

export default {
  name: 'StudySessionPage',
  components: {
    CardEditor,
    CustomStudyResults,
    StudyTutorial,
    EnjoyPrompt,
    StudyKeyboardToast,
    AskAISheet,
    RobotLoader,
    StudyCheckpoint,
    StudyLimitSheet,
    StudyMenu,
    StudyAnswerToast,
    StudyPickerSheet,
    StudyReportSheet,
    StudyConfirmSheet,
  },
  data() {
    return {
      customMode: false,
      customResults: [],
      skippedCustomCards: 0,
      retryingCustom: false,
      customRetryError: '',
      sessionOwner: null,
      tutorialOpen: false,
      enjoyOpen: false,
      enjoyHandled: false,
      tipStage: 'complete',
      keyboardAvailable: false,
      keyboardTyping: false,
      keyboardPageActive: false,
      keyboardHintState: { ready: false, shortcutUsed: false, questionSeen: false, answerSeen: false },
      keyboardHintHistory: null,
      keyboardHintUserId: null,
      unsubKeyboardSession: null,
      questionHintDismissed: false,
      answerHintVisible: false,
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
      cardFlagState: { deckId: null, cardId: null, flags: [] },
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
      unsubTheme: null,
      timerTick: 0,
      timerInterval: null,
      feedbackEase: '',
      feedbackTimer: null,
      showTimer: false,
      showKeycaps: true,
      appearancePreference: 'light',
      theme: 'light',
      toastPosition: 'top',
      menuOpen: false,
      folderPickerOpen: false,
      deckPickerOpen: false,
      targetFolderOpen: false,
      reportOpen: false,
      deleteOpen: false,
      editorOpen: false,
      actionBusy: false,
      actionError: '',
      actionToast: '',
      actionToastTimer: null,
      folders: [],
      folderSelectedId: null,
      otherDecks: [],
      targetDeck: null,
      targetFolders: [],
      targetFolderSelectedId: null,
    };
  },
  computed: {
    activeTip() {
      if (this.customMode || this.tipStage === 'complete') return '';
      return (this.tipStage === 'rating') === this.showAnswer ? this.tipStage : '';
    },
    keyboardHintKind() {
      return visibleKeyboardHint({
        ready: this.keyboardHintState.ready,
        active: this.keyboardPageActive && !this.loading && !this.leaving && !this.loadError
          && !this.done && !!this.current && !this.limitReached && !this.askAiOpen && !this.checkpointOpen
          && !this.menuOpen && !this.sheetOpen,
        keyboard: this.keyboardAvailable,
        typing: this.writing || this.keyboardTyping,
        showingAnswer: this.showAnswer,
        flags: this.keyboardHintState,
        questionDismissed: this.questionHintDismissed,
        answerVisible: this.answerHintVisible,
      });
    },
    gradeButtons() {
      return GRADE_BUTTONS.map((grade) => ({
        ...grade,
        label: this.$t(`study.${grade.className}`),
      }));
    },
    studyScheme() {
      return this.theme;
    },
    currentSlot() {
      return currentSlotIndex(this.last10);
    },
    elapsedSeconds() {
      const running = this.sessionStartedAt ? Date.now() - this.sessionStartedAt : 0;
      return Math.floor((this.sessionElapsedMs + running) / 1000) + (this.timerTick * 0);
    },
    timerLabel() {
      return formatStudyTimer(this.elapsedSeconds);
    },
    mixPercents() {
      const counts = gradeCounts(this.sessionAnswers);
      const total = this.customMode ? this.uniqueTotal : this.sessionAnswers.length + this.remaining;
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
      return this.customMode ? filteredPreviewIntervals(this.current, this.deck.config) : previewIntervals(this.current, this.deck.config);
    },
    currentFlags() {
      if (this.cardFlagState.deckId !== this.deck?.id || this.cardFlagState.cardId !== this.current?.id) return [];
      return this.cardFlagState.flags.map(flag => ({ ...flag, name: flag.labelKey ? this.$t(flag.labelKey) : flag.name }));
    },
    shownHtml() {
      if (!this.current) return '';
      const dark = this.theme === 'dark';
      const labels = {
        showAnswers: this.$t('study.occlusionShow'),
        hideAnswers: this.$t('study.occlusionHide'),
      };
      const html = this.showAnswer
        ? backHtml(this.current, this.mediaMap, { dark, ...labels })
        : frontHtml(this.current, this.mediaMap, labels);
      return cardDocument(html, { dark, flags: this.currentFlags });
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
    canReport() {
      return Boolean(this.deck?.sharedDeckId);
    },
    showsKeycaps() {
      return this.showKeycaps && this.keyboardAvailable && !this.writing && !this.keyboardTyping;
    },
    sheetOpen() {
      return this.folderPickerOpen || this.deckPickerOpen || this.targetFolderOpen
        || this.reportOpen || this.deleteOpen || this.editorOpen || this.tutorialOpen;
    },
    folderItems() {
      return this.folders;
    },
    folderSubtitle() {
      const folder = folderById(this.folders, this.current?.subdeckId);
      const name = folder?.fullPath || this.deck?.name || '';
      return name ? this.$t('study.moveCardSubtitle', { folder: name.replace(/::/g, ' → ') }) : '';
    },
    deckItems() {
      return this.otherDecks.map((deck) => ({
        id: deck.id,
        title: deck.name,
        detail: this.$t('decks.cards', { count: deck.cardCount || 0 }),
        icon: deck.topic?.imageName ? `/topics/${deck.topic.imageName}.svg` : '',
      }));
    },
    targetFolderItems() {
      return this.targetFolders;
    },
  },
  watch: {
    keyboardHintKind: {
      flush: 'post',
      handler(kind) {
        if (kind === 'question') this.keyboardHintHistory?.mark({ questionSeen: true });
        if (kind === 'answer') {
          this.answerHintVisible = true;
          this.keyboardHintHistory?.mark({ answerSeen: true });
        }
      },
    },
  },
  async created() {
    this.keyboardAvailable = desktopKeyboardLikely({
      maxTouchPoints: navigator.maxTouchPoints,
      mobile: navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      finePointer: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    });
    this.updateKeyboardFocus();
    this.sessionOwner = getCurrentUser()?.supabaseUid;
    this.tipStage = readStudyTips(this.tipStorage(), this.sessionOwner);
    this.customMode = typeof this.$route.query.custom === 'string';
    this.unsubKeyboardSession = onSessionChange(user => {
      if (user?.supabaseUid !== this.sessionOwner) {
        this.current = null; this.queue = null; this.tutorialOpen = false;
        this.$router.replace('/decks');
      }
      this.resetKeyboardHintHistory(user);
    });
    document.addEventListener('focusin', this.updateKeyboardFocus);
    document.addEventListener('focusout', this.onKeyboardFocusOut);
    document.addEventListener('visibilitychange', this.updateKeyboardFocus);
    window.addEventListener('focus', this.updateKeyboardFocus);
    window.addEventListener('blur', this.updateKeyboardFocus);
    window.addEventListener('online', this.retryKeyboardHintSave);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('beforeunload', this.onBeforeUnload);
    this.reviewSync = deckReviewSync({
      userId: getCurrentUser()?.supabaseUid,
      deckId: this.$route.params.deckId,
      submit: submitReview,
      currentUserId: () => getCurrentUser()?.supabaseUid,
    });
    this.unsubReviewSync = this.reviewSync.subscribe((state) => {
      this.saveError = state.error;
    });
    this.hydratePrefs();
    this.unsubTheme = subscribeTheme((theme) => {
      this.theme = theme;
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
      const ids = this.customMode ? readCustomStudySnapshot(sessionStorage, this.$route.query.custom, this.sessionOwner, deckId) : null;
      if (this.customMode && !ids) throw new Error(this.$t('customStudy.expired'));
      const [cards, mediaMap] = await Promise.all([
        this.customMode ? fetchCustomStudyCards(deckId, ids) : fetchAllStudyCards(deckId),
        fetchMediaMap(deckId).catch(() => ({})),
      ]);
      if (this.sessionOwner !== getCurrentUser()?.supabaseUid) return;
      this.mediaMap = mediaMap;
      this.skippedCustomCards = this.customMode ? Math.max(0, ids.length - cards.length) : 0;
      const built = this.customMode ? { uniqueCount: cards.length } : buildStudyQueues(cards, deck.config);
      this.queue = this.customMode ? createCustomStudyQueue(cards) : createStudyQueue(built);
      for (const card of cards) this.queue.recordCard(card);
      this.uniqueTotal = built.uniqueCount || 0;
      this.showCheckpoints = !this.customMode && deck.config.showCheckpoints !== false;
      this.tutorialOpen = !this.customMode && (isDebugAlwaysShowStudyTutorial() || !tutorialCompleted(this.tipStorage(), this.sessionOwner));
      this.folders = parseDeckFolders(deck.decks, deck.name);
      this.nextCard();
      this.resumeTimer();
      this.syncTimerTick();
      void this.hydrateAnswerFeedbackFromProfile();
    } catch (error) {
      this.loadError = error.message || this.$t('study.startError');
    } finally {
      this.loading = false;
    }
  },
  beforeUnmount() {
    this.unsubKeyboardSession?.();
    this.keyboardHintHistory?.dispose();
    document.removeEventListener('focusin', this.updateKeyboardFocus);
    document.removeEventListener('focusout', this.onKeyboardFocusOut);
    document.removeEventListener('visibilitychange', this.updateKeyboardFocus);
    window.removeEventListener('focus', this.updateKeyboardFocus);
    window.removeEventListener('blur', this.updateKeyboardFocus);
    window.removeEventListener('online', this.retryKeyboardHintSave);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    this.unsubReviewSync?.();
    this.unsubTheme?.();
    this.clearFeedback();
    this.clearActionToast();
    this.stopTimerTick();
    this.pauseTimer();
    if (this.reviewSync?.pendingCount()) {
      void this.reviewSync.flush();
    }
  },
  methods: {
    tipStorage() { try { return window.localStorage; } catch { return null; } },
    finishTutorial() {
      this.tutorialOpen = false;
      completeTutorial(this.tipStorage(), this.sessionOwner);
      this.tipStage = 'recall';
      writeStudyTips(this.tipStorage(), this.sessionOwner, this.tipStage);
    },
    finishStudyTips() {
      this.tipStage = 'complete';
      writeStudyTips(this.tipStorage(), this.sessionOwner, 'complete');
    },
    async flushCustomReviews() {
      await this.reviewSync?.flush();
      if (this.reviewSync?.pendingCount()) throw new Error(this.$t('study.retrySave'));
    },
    onCustomResultEdited(card) {
      this.customResults = this.customResults.map(result => result.id === card.id ? { ...result, card: { ...result.card, ...card } } : result);
      this.queue?.recordCard?.(card);
    },
    async retryCustomCards() {
      if (this.retryingCustom || this.leaving) return;
      this.retryingCustom = true;
      this.customRetryError = '';
      try {
        await this.reviewSync?.flush();
        if (this.reviewSync?.pendingCount()) {
          this.customRetryError = this.$t('study.retrySave');
          return;
        }
        const ids = this.customResults.filter(result => ['AGAIN','HARD'].includes(result.answer)).map(result => result.id);
        const cards = await fetchCustomStudyCards(this.deck.id, ids);
        this.customResults = []; this.sessionAnswers = []; this.studiedUnique = 0;
        this.skippedCustomCards = Math.max(0, ids.length - cards.length);
        this.uniqueTotal = cards.length; this.sessionElapsedMs = 0; this.done = false;
        this.queue = createCustomStudyQueue(cards); this.nextCard(); this.resumeTimer();
      } catch {
        this.customRetryError = this.$t('customStudy.error');
      } finally {
        this.retryingCustom = false;
      }
    },
    hydratePrefs() {
      let storage;
      try { storage = window.localStorage; } catch { /* Private browsing may disable storage. */ }
      this.showTimer = readShowStudyTimer(storage);
      this.showKeycaps = readShowStudyKeycaps(storage);
      this.toastPosition = readAnswerFeedbackPosition(storage);
      this.appearancePreference = getThemePreference();
      this.theme = getTheme();
    },
    async hydrateAnswerFeedbackFromProfile() {
      if (hasLocalAnswerFeedbackPosition(this.prefsStorage())) return;
      try {
        const profile = await fetchUserProfile();
        const remote = normalizeAnswerFeedbackPosition(profile.answerFeedbackPosition);
        if (profile.answerFeedbackPosition) this.setToastPosition(remote, { sync: false });
      } catch {
        // Keep the local default.
      }
    },
    prefsStorage() {
      try { return window.localStorage; } catch { return null; }
    },
    toggleTimer() {
      this.showTimer = writeShowStudyTimer(!this.showTimer, this.prefsStorage());
      this.syncTimerTick();
    },
    toggleKeycaps() {
      this.showKeycaps = writeShowStudyKeycaps(!this.showKeycaps, this.prefsStorage());
    },
    openEdit() {
      if (!this.current || !this.deck) return;
      if (!this.deck.canEdit || !cardEditableOnWeb(this.current)) {
        this.showActionToast(this.$t('study.editLocked'));
        return;
      }
      this.editorOpen = true;
    },
    async onCardEdited({ card, keepOpen }) {
      if (!card) return;
      this.current = { ...this.current, ...card };
      this.queue?.recordCard?.(this.current);
      if (this.deck?.id) {
        this.mediaMap = await fetchMediaMap(this.deck.id).catch(() => this.mediaMap);
      }
      if (!keepOpen) this.editorOpen = false;
    },
    setAppearance(preference) {
      this.appearancePreference = preference;
      setThemePreference(preference);
      this.theme = getTheme();
    },
    setToastPosition(position, { sync = true } = {}) {
      this.toastPosition = writeAnswerFeedbackPosition(position, this.prefsStorage());
      if (sync) void updateUserProfileAnswerFeedback(this.toastPosition).catch(() => {});
    },
    syncTimerTick() {
      this.stopTimerTick();
      if (!this.showTimer) return;
      this.timerTick += 1;
      this.timerInterval = window.setInterval(() => {
        this.timerTick += 1;
      }, 1000);
    },
    stopTimerTick() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },
    showFeedback(ease) {
      this.clearFeedback();
      if (this.toastPosition === 'hide') return;
      this.feedbackEase = ease;
      this.feedbackTimer = window.setTimeout(() => {
        this.feedbackEase = '';
        this.feedbackTimer = null;
      }, 900);
    },
    clearFeedback() {
      if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
      this.feedbackEase = '';
    },
    showActionToast(text) {
      this.clearActionToast();
      this.actionToast = text;
      this.actionToastTimer = window.setTimeout(() => {
        this.actionToast = '';
        this.actionToastTimer = null;
      }, 2200);
    },
    clearActionToast() {
      if (this.actionToastTimer) clearTimeout(this.actionToastTimer);
      this.actionToastTimer = null;
      this.actionToast = '';
    },
    closeActionSheets() {
      this.folderPickerOpen = false;
      this.deckPickerOpen = false;
      this.targetFolderOpen = false;
      this.reportOpen = false;
      this.deleteOpen = false;
      this.actionError = '';
      this.actionBusy = false;
    },
    openReport() {
      this.actionError = '';
      this.reportOpen = true;
    },
    openDelete() {
      this.actionError = '';
      this.deleteOpen = true;
    },
    openFolderPicker() {
      if (!this.current || !this.deck) return;
      this.actionError = '';
      this.folders = parseDeckFolders(this.deck.decks, this.deck.name);
      this.folderSelectedId = folderById(this.folders, this.current.subdeckId)?.id
        ?? rootFolderId(this.folders);
      this.folderPickerOpen = true;
    },
    async confirmMoveToFolder() {
      if (!this.current || !this.deck || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      try {
        await moveCardToSubdeck(this.deck, this.current, this.folderSelectedId);
        this.current = { ...this.current, subdeckId: Number(this.folderSelectedId) || 0 };
        this.folderPickerOpen = false;
        this.showActionToast(this.$t('study.moved'));
      } catch (error) {
        this.actionError = error.message || this.$t('study.actionError');
      } finally {
        this.actionBusy = false;
      }
    },
    async openDeckPicker() {
      if (!this.current || !this.deck) return;
      this.actionError = '';
      let decks = cachedDeckList();
      if (!decks) {
        try {
          decks = await fetchDeckList();
        } catch (error) {
          this.actionError = error.message || this.$t('study.actionError');
          this.deckPickerOpen = true;
          this.otherDecks = [];
          return;
        }
      }
      this.otherDecks = (decks || []).filter((deck) => (
        deck.id !== this.deck.id && deck.canStudy && deck.canEdit !== false
      ));
      this.deckPickerOpen = true;
    },
    async chooseTargetDeck(item) {
      const deck = this.otherDecks.find((row) => row.id === item.id);
      if (!deck || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      try {
        const full = await fetchDeck(deck.id);
        if (!full.canEdit) {
          this.actionError = this.$t('study.actionError');
          this.actionBusy = false;
          return;
        }
        const folders = parseDeckFolders(full.decks, full.name);
        this.targetDeck = full;
        this.targetFolders = folders;
        this.targetFolderSelectedId = rootFolderId(folders);
        this.deckPickerOpen = false;
        this.actionBusy = false;
        if (folderHasChildren(folders)) {
          this.targetFolderOpen = true;
          return;
        }
        await this.performMoveToDeck(full, this.targetFolderSelectedId);
      } catch (error) {
        this.actionError = error.message || this.$t('study.actionError');
        this.actionBusy = false;
      }
    },
    async confirmMoveToDeck() {
      if (!this.targetDeck) return;
      await this.performMoveToDeck(this.targetDeck, this.targetFolderSelectedId);
    },
    async performMoveToDeck(targetDeck, subdeckId) {
      if (!this.current || !this.deck || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      try {
        await moveCardToAnotherDeck(this.deck, this.current, targetDeck, subdeckId);
        this.closeActionSheets();
        this.showActionToast(this.$t('study.moved'));
        this.advanceAfterRemovingCurrent();
      } catch (error) {
        this.actionError = error.message || this.$t('study.actionError');
        if (!this.targetFolderOpen && !this.deckPickerOpen) {
          this.showActionToast(this.actionError);
        }
      } finally {
        this.actionBusy = false;
      }
    },
    async confirmDelete() {
      if (!this.current || !this.deck || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      try {
        await deleteDeckCard(this.deck, this.current);
        this.deleteOpen = false;
        this.showActionToast(this.$t('study.deleted'));
        this.advanceAfterRemovingCurrent();
      } catch (error) {
        this.actionError = error.message || this.$t('study.actionError');
      } finally {
        this.actionBusy = false;
      }
    },
    async submitReport({ reason, details }) {
      if (!this.current || !this.deck?.sharedDeckId || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      try {
        await reportStudyCard({
          sharedDeckId: this.deck.sharedDeckId,
          localDeckId: this.deck.firebaseId || this.deck.id,
          cardId: this.current.id,
          reason,
          details,
        });
        this.reportOpen = false;
        this.showActionToast(this.$t('study.reportSent'));
      } catch (error) {
        this.actionError = error.message || this.$t('study.reportError');
      } finally {
        this.actionBusy = false;
      }
    },
    advanceAfterRemovingCurrent() {
      this.resetCardUi();
      this.nextCard();
    },
    resetKeyboardHintHistory(user) {
      const userId = user?.supabaseUid || null;
      if (userId === this.keyboardHintUserId) return;
      this.keyboardHintHistory?.dispose();
      this.keyboardHintUserId = userId;
      this.questionHintDismissed = false;
      this.answerHintVisible = false;
      this.keyboardHintState = { ready: false, shortcutUsed: false, questionSeen: false, answerSeen: false };
      if (!userId) { this.keyboardHintHistory = null; return; }
      let storage;
      try { storage = window.localStorage; } catch { /* Private browsing may disable storage. */ }
      this.keyboardHintHistory = createKeyboardHintHistory({
        userId, storage,
        load: () => fetchKeyboardHintHistory(userId),
        save: (flags) => saveKeyboardHintHistory(userId, flags),
        onChange: (state) => { this.keyboardHintState = state; },
      });
      void this.keyboardHintHistory.hydrate();
    },
    updateKeyboardFocus() {
      this.keyboardPageActive = document.visibilityState !== 'hidden' && document.hasFocus();
      this.keyboardTyping = isTypingTarget(document.activeElement);
    },
    onKeyboardFocusOut() {
      // focusout runs before the next active element has been assigned.
      this.$nextTick(this.updateKeyboardFocus);
    },
    retryKeyboardHintSave() {
      void this.keyboardHintHistory?.flush();
    },
    dismissKeyboardHint() {
      if (this.showAnswer) this.answerHintVisible = false;
      else this.questionHintDismissed = true;
    },
    requestLeave() {
      if (this.leaving || this.enjoyOpen) return;
      if (!this.enjoyHandled && !this.loadError && this.deck && isDebugAlwaysShowFeedback()) {
        this.enjoyOpen = true;
        return;
      }
      void this.leave();
    },
    finishEnjoy() {
      this.enjoyOpen = false;
      this.enjoyHandled = true;
      void this.leave();
    },
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
        if (this.customMode) this.pauseTimer();
        this.done = true;
        this.current = null;
        return;
      }
      this.current = card;
      this.resetCardUi();
      this.shownAt = Date.now();
    },
    resetCardUi() {
      this.answerHintVisible = false;
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
      if (this.customMode) {
        this.customResults = this.customResults.filter(result => result.id !== previous.id);
        this.sessionAnswers.pop();
        this.studiedUnique = this.queue.uniqueStudiedCount();
      }
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
      this.reveal();
    },
    reveal() {
      if (this.tipStage === 'recall') {
        this.tipStage = 'rating';
        writeStudyTips(this.tipStorage(), this.sessionOwner, this.tipStage);
      } else if (this.tipStage === 'scheduled') this.finishStudyTips();
      if (this.keyboardHintKind === 'question') this.questionHintDismissed = true;
      this.showAnswer = true;
      this.writing = false;
    },
    answer(ease) {
      if (!this.current || this.checkpointOpen || this.limitReached || !this.showAnswer) return;
      const previous = this.current;
      const durationMs = Date.now() - this.shownAt;
      const reviewedAt = new Date();
      const updated = this.customMode ? applyFilteredAnswer(previous, ease, this.deck.config) : applyAnswer(previous, ease, this.deck.config);
      if (this.customMode) {
        this.customResults = [...this.customResults.filter(result => result.id !== previous.id), {id: previous.id, answer: ease, card: updated}];
      }
      if (this.tipStage === 'rating') {
        this.tipStage = 'scheduled';
        writeStudyTips(this.tipStorage(), this.sessionOwner, this.tipStage);
      }
      this.queue.afterAnswer(previous, updated);
      this.recordSessionAnswer(ease);
      this.showFeedback(ease);
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
      if (this.done || this.sessionStartedAt) return;
      this.sessionStartedAt = Date.now();
    },
    onKey(event) {
      if (isKeyboardEvidence(event)) this.keyboardAvailable = true;
      if (this.done || this.leaving || this.limitReached || this.loading || !this.current
          || this.askAiOpen || this.writing || this.checkpointOpen || this.menuOpen || this.sheetOpen) return;
      const action = studyShortcutAction(event, this.showAnswer);
      if (!action) return;
      event.preventDefault();
      this.keyboardHintHistory?.mark({ shortcutUsed: true });
      if (action === 'reveal') this.reveal();
      else this.answer(action);
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
  position: relative;
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0;
  overflow: visible;
}
.study-close {
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
.timer-pill {
  position: absolute;
  left: 50%;
  bottom: -18px;
  z-index: 2;
  transform: translateX(-50%);
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--inset-bg);
  border: 1px solid var(--empty-bar);
  color: var(--title);
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  pointer-events: none;
}
.action-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 95;
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 12px;
  background: #0f172a;
  color: #fff;
  font-size: 0.92rem;
  font-weight: 650;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.28);
  pointer-events: none;
}
:global([data-theme='dark']) .action-toast {
  background: #f8fafc;
  color: #0f172a;
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
.card-stage.with-timer .card-frame {
  top: 28px;
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
  border: none;
  border-radius: 50px;
  background: var(--secondary-btn-bg);
  color: var(--secondary-btn-text);
  font: inherit;
  font-weight: 600;
  padding: 12px 28px;
  cursor: pointer;
}
.write-cancel:hover {
  background: var(--secondary-btn-hover);
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
  position: relative;
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
.keycap {
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 1;
  padding: 0 9px;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 2px 0 color-mix(in srgb, currentColor 16%, transparent);
  color: #202b3b;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 23px;
  pointer-events: none;
}
.grade .keycap {
  top: 8px;
  right: 8px;
  padding: 0 7px;
}
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
  position: relative;
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

<style scoped>
.study-tip{display:flex;align-items:center;gap:14px;background:var(--inset-bg);border:1px solid var(--separator);padding:14px 18px;border-radius:16px;color:var(--text);font-size:.9rem}.study-tip strong{color:var(--title)}.study-tip button{border:0;background:transparent;color:var(--text-secondary);font-size:24px}
</style>

<style scoped>
.custom-results-shell { background:#e2e8f0; }
html[data-theme="dark"] .custom-results-shell { background:#1e293c; }
.custom-results-shell>.container-xl { padding:0; }
</style>
