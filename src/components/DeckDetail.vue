<template>
  <div class="shell">
    <div class="container-xl">
      <AppHeader />
      <p v-if="error" class="error">{{ error }}</p>
      <div v-else class="detail" :aria-busy="pending">
        <router-link to="/decks" class="back">{{ $t('deck.back') }}</router-link>
        <div class="hero">
          <div class="hero-text">
            <template v-if="deck">
              <div class="topic" :style="{ color: deck.topic.color }">{{ $topic(deck.topic) }}</div>
              <h1>{{ deck.name }}</h1>
            </template>
            <template v-else>
              <SkeletonBlock class="topic-line" w="96px" h="0.72rem" radius="5px" />
              <SkeletonBlock class="title-line" w="min(340px, 80%)" h="2rem" radius="10px" />
            </template>
            <p class="sub">
              <SkeletonBlock v-if="subPending" w="min(200px, 60%)" h="1rem" radius="6px" />
              <template v-else>{{ $t('deck.studiedOf', { seen: seenCount, total: deck.cardCount }) }}</template>
            </p>
          </div>
          <div v-if="deck" class="icon" :style="{ background: deck.topic.backgroundColor }">
            <img :src="`/topics/${deck.topic.imageName}.svg`" alt="">
          </div>
          <SkeletonBlock v-else w="72px" h="72px" radius="16px" />
        </div>

        <DeckStats
          :list-stats="listStats"
          :studied-today="studiedToday"
          :time="time"
          :histogram="histogram"
          :stats-pending="statsPending"
          :grade-pending="gradePending"
          :time-pending="timePending"
        />

        <div v-if="!deck" class="actions">
          <SkeletonBlock w="150px" h="49px" radius="999px" />
          <SkeletonBlock w="128px" h="49px" radius="999px" />
        </div>
        <div v-else-if="deck.canStudy || deck.canEdit" class="actions">
          <button v-if="deck.canStudy" type="button" class="mopiq-btn" :disabled="startingStudy" @click="startStudy">
            {{ $t('deck.study') }}
          </button>
          <button v-if="deck.canStudy" type="button" class="mopiq-btn secondary" @click="quizOpen = true">
            {{ $t('deck.quiz') }}
          </button>
          <button v-if="deck.canEdit" type="button" class="mopiq-btn secondary" @click="settingsOpen = true">
            {{ $t('deck.settings') }}
          </button>
          <button v-if="deck.canEdit" type="button" class="mopiq-btn secondary" @click="openAddCard">
            {{ $t('deck.addCard') }}
          </button>
        </div>
        <div v-if="deck && !deck.canStudy" class="app-only">
          <h2>{{ $t('deck.appOnlyTitle') }}</h2>
          <p>{{ $t('deck.appOnlyBody') }}</p>
          <a :href="storeUrl" target="_blank" rel="noopener">
            <button type="button" class="mopiq-btn">{{ $t('deck.downloadApp') }}</button>
          </a>
        </div>

        <p v-if="deckPending" class="cta">
          <SkeletonBlock w="min(480px, 92%)" h="1rem" radius="6px" />
        </p>
        <p v-else class="cta" v-html="ctaHtml"></p>

        <section v-if="cardsVisible" class="cards">
          <h2>{{ $t('deck.cards') }}</h2>
          <div v-if="!cardsReady" class="card-rows">
            <div v-for="n in 4" :key="n" class="card-row">
              <SkeletonBlock w="min(320px, 72%)" h="1rem" radius="6px" />
              <SkeletonBlock class="sub-line" w="min(220px, 48%)" h="0.9rem" radius="6px" />
            </div>
          </div>
          <div v-else class="card-rows">
            <button
              v-for="card in cards"
              :key="card.id"
              type="button"
              class="card-row"
              :class="{ editable: canEditCard(card) }"
              :disabled="!canEditCard(card)"
              @click="openEditCard(card)"
            >
              <div class="q">{{ preview(card.question || card.noteFields[0]) }}</div>
              <div class="a">{{ preview(card.answer || card.noteFields[1]) }}</div>
              <div v-if="cardHasImage(card)" class="image-lock">{{ $t('editor.imageLocked') }}</div>
            </button>
            <p v-if="cards.length === 0" class="empty">{{ $t('deck.noCards') }}</p>
          </div>
          <button
            v-if="cards.length < cardTotal"
            type="button"
            class="mopiq-btn secondary"
            :disabled="cardsLoading"
            @click="loadMoreCards"
          >
            {{ $t('deck.loadMore') }}
          </button>
        </section>
      </div>
    </div>
    <StudyLimitSheet
      :open="limitOpen"
      :limit="freeLimit"
      action-key="common.ok"
      @dismiss="limitOpen = false"
    />
    <DeckSettings
      :open="settingsOpen"
      :deck="deck"
      @dismiss="settingsOpen = false"
      @saved="onSettingsSaved"
    />
    <CardEditor
      :open="editorOpen"
      :deck="deck"
      :card="editingCard"
      :next-position="cardTotal"
      @dismiss="closeEditor"
      @saved="onCardSaved"
    />
    <QuizSetup
      :open="quizOpen"
      :deck="deck"
      @dismiss="quizOpen = false"
      @start="startQuiz"
    />
  </div>
</template>

<script>
import AppHeader from './AppHeader.vue';
import DeckStats from './DeckStats.vue';
import StudyLimitSheet from './StudyLimitSheet.vue';
import DeckSettings from './DeckSettings.vue';
import CardEditor from './CardEditor.vue';
import QuizSetup from './QuizSetup.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import { APP_STORE_URL, CARD_PAGE_SIZE } from '../constants';
import { ankiDayString } from '../study/ankiDay';
import { FREE_CARD_DAILY_LIMIT, isDailyLimitReached } from '../study/freeStudyQuota';
import {
  fetchAnswerHistogram,
  fetchCardsPage,
  fetchDeck,
  fetchDeckTodayStats,
  fetchFreeStudyQuota,
  fetchSeenCount,
  fetchStudiedTodayCount,
  fetchStudyTimeSummary,
} from '../api/mopiq';
import { cacheDeck, cachedDeck, cachedDeckStats } from '../api/deckCache';
import { escapeHtml } from '../i18n';
import { cardContainsImage } from '../study/cardFields';

export default {
  name: 'DeckDetailPage',
  components: {
    AppHeader,
    DeckStats,
    StudyLimitSheet,
    DeckSettings,
    CardEditor,
    QuizSetup,
    SkeletonBlock,
  },
  data() {
    return {
      deckPending: true,
      statsPending: true,
      timePending: true,
      gradePending: true,
      seenPending: true,
      cardsReady: false,
      cardsLoading: false,
      startingStudy: false,
      error: '',
      deck: null,
      listStats: null,
      time: { todayMilliseconds: 0, totalMilliseconds: 0, activeDays: 0 },
      histogram: { counts: { AGAIN: 0, HARD: 0, GOOD: 0, EASY: 0 }, total: 0, grade: 0 },
      cards: [],
      cardTotal: 0,
      seenCount: 0,
      studiedToday: 0,
      storeUrl: APP_STORE_URL,
      limitOpen: false,
      settingsOpen: false,
      editorOpen: false,
      editingCard: null,
      quizOpen: false,
    };
  },
  computed: {
    freeLimit() {
      return FREE_CARD_DAILY_LIMIT;
    },
    subPending() {
      return this.seenPending || !this.deck;
    },
    pending() {
      return this.deckPending
        || this.statsPending
        || this.timePending
        || this.gradePending
        || this.seenPending
        || !this.cardsReady;
    },
    cardsVisible() {
      return this.deck ? this.deck.canStudy : this.deckPending;
    },
    ctaHtml() {
      const app = `<a href="${this.storeUrl}" target="_blank" rel="noopener">${escapeHtml(this.$t('common.app'))}</a>`;
      const key = this.deck?.canEdit ? 'deck.ctaMedia' : 'deck.cta';
      return this.$t(key, { app });
    },
  },
  created() {
    const deckId = this.$route.params.deckId;
    // Paint whatever the deck list already taught us, then fill each card in as
    // its own request lands.
    this.deck = cachedDeck(deckId);
    this.listStats = cachedDeckStats(deckId);
    this.loadDeck(deckId);
    this.loadListStats(deckId);
    this.loadTime(deckId);
    this.loadGrade(deckId);
    this.loadSeen(deckId);
  },
  methods: {
    async loadDeck(deckId) {
      try {
        this.deck = await fetchDeck(deckId);
      } catch (error) {
        this.error = error.message || this.$t('deck.loadError');
        return;
      } finally {
        this.deckPending = false;
      }
      if (this.deck.canStudy) {
        await this.loadMoreCards();
      }
      this.cardsReady = true;
    },
    async loadListStats(deckId) {
      try {
        const deck = (this.deck?.id === deckId && this.deck.config)
          ? this.deck
          : await fetchDeck(deckId);
        if (!this.deck) this.deck = deck;
        this.listStats = await fetchDeckTodayStats(deck);
      } catch {
        // The dashboard falls back to em dashes when stats are unavailable.
      } finally {
        this.statsPending = false;
      }
    },
    async loadTime(deckId) {
      try {
        this.time = await fetchStudyTimeSummary(deckId);
      } catch {
        // Keep the zeroed defaults.
      } finally {
        this.timePending = false;
      }
    },
    async loadGrade(deckId) {
      try {
        this.histogram = await fetchAnswerHistogram(deckId);
      } catch {
        // Keep the zeroed defaults.
      } finally {
        this.gradePending = false;
      }
    },
    async loadSeen(deckId) {
      const [seen, studiedToday] = await Promise.all([
        fetchSeenCount(deckId).catch(() => 0),
        fetchStudiedTodayCount(deckId).catch(() => 0),
      ]);
      this.seenCount = seen;
      this.studiedToday = studiedToday;
      this.seenPending = false;
    },
    preview(text) {
      return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
    },
    async startStudy() {
      if (!this.deck?.canStudy || this.startingStudy) return;
      this.startingStudy = true;
      try {
        const studyDay = ankiDayString();
        const quota = await fetchFreeStudyQuota(studyDay).catch(() => null);
        if (isDailyLimitReached(quota, studyDay)) {
          this.limitOpen = true;
          return;
        }
        await this.$router.push(`/decks/${this.deck.id}/study`);
      } catch (error) {
        this.error = error.message || this.$t('deck.startError');
      } finally {
        this.startingStudy = false;
      }
    },
    async loadMoreCards() {
      this.cardsLoading = true;
      try {
        const page = await fetchCardsPage(this.deck.id, this.cards.length, CARD_PAGE_SIZE);
        this.cardTotal = page.total;
        this.cards = this.cards.concat(page.cards);
      } catch (error) {
        this.error = error.message || this.$t('deck.cardsError');
      } finally {
        this.cardsLoading = false;
      }
    },
    cardHasImage(card) {
      return cardContainsImage(card);
    },
    canEditCard(card) {
      return Boolean(this.deck?.canEdit && card && !cardContainsImage(card));
    },
    openAddCard() {
      this.editingCard = null;
      this.editorOpen = true;
    },
    openEditCard(card) {
      if (!this.canEditCard(card)) return;
      this.editingCard = card;
      this.editorOpen = true;
    },
    startQuiz(config) {
      this.quizOpen = false;
      this.$router.push({
        path: `/decks/${this.deck.id}/quiz`,
        query: {
          source: config.source,
          count: String(config.count),
          multi: config.multi ? '1' : '0',
          tf: config.trueFalse ? '1' : '0',
          difficulty: config.difficulty,
        },
      });
    },
    closeEditor() {
      this.editorOpen = false;
      this.editingCard = null;
    },
    onSettingsSaved({ extraConfig, config, name, topic }) {
      this.deck = cacheDeck({
        ...this.deck,
        extraConfig,
        config,
        name,
        topic,
      });
      this.settingsOpen = false;
      this.statsPending = true;
      this.loadListStats(this.deck.id);
    },
    onCardSaved({ card, created }) {
      if (created) {
        this.cards = [card, ...this.cards];
        this.cardTotal += 1;
        this.deck = cacheDeck({ ...this.deck, cardCount: (this.deck.cardCount || 0) + 1 });
      } else {
        this.cards = this.cards.map((row) => (row.id === card.id ? { ...row, ...card } : row));
      }
      this.closeEditor();
      this.statsPending = true;
      this.loadListStats(this.deck.id);
    },
  },
};
</script>

<style scoped>
.detail { text-align: left; padding-bottom: 48px; }
.back { color: var(--blue-button); text-decoration: none; display: inline-block; margin-bottom: 16px; }
.hero { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.hero-text { flex: 1 1 auto; min-width: 0; }
h1 { font-size: 2rem; font-weight: 700; color: var(--title); }
.topic { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
.topic-line { margin-bottom: 9px; }
.title-line { margin-bottom: 10px; }
.sub { color: var(--text-secondary); }
.sub-line { margin-top: 8px; }
.icon { width: 72px; height: 72px; border-radius: 16px; padding: 16px; }
.icon img { width: 100%; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
.mopiq-btn {
  font-size: 1.05rem !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
  padding: 12px 28px !important;
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
}
.mopiq-btn.secondary {
  background: var(--secondary-btn-bg) !important;
  color: var(--secondary-btn-text) !important;
  margin-top: 0;
}
.app-only {
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 16px;
}
.app-only h2 { font-size: 1.25rem; margin-bottom: 8px; color: var(--title); }
.app-only p { color: var(--text); margin-bottom: 16px; }
.cta { color: var(--text); margin: 8px 0 28px; }
.cta a { color: var(--blue-button); }
.cards h2 { font-size: 1.3rem; margin-bottom: 12px; color: var(--title); }
.cards .mopiq-btn { margin-top: 12px; }
.card-rows { display: grid; gap: 8px; }
.card-row {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: var(--card-shadow);
  color: inherit;
  font: inherit;
}
.card-row.editable { cursor: pointer; }
.card-row:disabled { cursor: default; }
.image-lock { margin-top: 6px; color: var(--text-secondary); font-size: 0.8rem; }
.q { font-weight: 600; color: var(--title); margin-bottom: 4px; }
.a { color: var(--text-secondary); }
.error { color: var(--error); }
.empty { color: var(--text-secondary); }
</style>
