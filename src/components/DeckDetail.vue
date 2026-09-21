<template>
  <div class="detail-page">
      <p v-if="error" class="error">{{ error }}</p>
      <div v-else class="detail" :aria-busy="pending">
        <div class="topbar">
          <router-link :to="listTo" class="back">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            {{ $t('decks.title') }}
          </router-link>
          <div class="tools">
            <button
              v-if="cardsVisible"
              type="button"
              class="tool"
              :aria-label="$t('deck.searchCards')"
              @click="focusSearch"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <button
              v-if="deck?.canEdit"
              type="button"
              class="tool"
              :aria-label="$t('deck.settings')"
              @click="settingsOpen = true"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.4l1.6 1.6M17.5 16l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.6l1.6-1.6M17.5 8l1.6-1.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <button
              v-if="deck?.canEdit"
              type="button"
              class="tool add"
              @click="openAddCard"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
              </svg>
              <span class="add-label">{{ $t('deck.addCards') }}</span>
            </button>
          </div>
        </div>
        <div class="hero">
          <template v-if="deck">
            <h1>{{ deck.name }}</h1>
          </template>
          <SkeletonBlock v-else class="title-line" w="min(340px, 80%)" h="1.5rem" radius="8px" />
          <p class="sub">
            <SkeletonBlock v-if="subPending" w="min(200px, 60%)" h="1rem" radius="6px" />
            <template v-else>{{ $t('deck.studiedOf', { seen: seenCount, total: deck.cardCount }) }}</template>
          </p>
        </div>

        <DeckStats
          :list-stats="listStats"
          :studied-today="studiedToday"
          :time="time"
          :histogram="histogram"
          :stats-pending="statsPending"
          :grade-pending="gradePending"
          :time-pending="timePending"
        >
          <template #study>
            <div v-if="!deck" class="study-wrap">
              <SkeletonBlock w="100%" h="64px" radius="20px" />
            </div>
            <div v-else-if="deck.canStudy" class="study-wrap">
              <button
                type="button"
                class="mopiq-btn study-btn"
                :disabled="startingStudy"
                @click="openStudySheet"
              >
                {{ $t('deck.study') }}
              </button>
            </div>
            <div v-else class="app-only">
              <h2>{{ $t('deck.appOnlyTitle') }}</h2>
              <p>{{ $t('deck.appOnlyBody') }}</p>
              <a :href="storeUrl" target="_blank" rel="noopener">
                <button type="button" class="mopiq-btn">{{ $t('deck.downloadApp') }}</button>
              </a>
            </div>
          </template>
        </DeckStats>

        <section v-if="cardsVisible" ref="cardsSection" class="cards">
          <div class="cards-head">
            <h2>{{ $t('deck.allCards', { count: deck ? deck.cardCount : '—' }) }}</h2>
            <button
              type="button"
              class="view-all"
              :class="{ active: hasActiveFilters }"
              :aria-pressed="hasActiveFilters"
              @click="filtersOpen = true"
            >
              {{ $t('deck.filterSort') }}
            </button>
          </div>
          <div class="browse-bar">
            <input
              ref="searchInput"
              v-model="searchText"
              type="search"
              class="browse-search"
              :placeholder="$t('deck.searchCards')"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
            >
          </div>
          <div v-if="!cardsReady" class="card-rows">
            <div v-for="n in 4" :key="n" class="card-row skeleton-row">
              <SkeletonBlock w="88px" h="28px" radius="10px" />
              <SkeletonBlock class="q-line" w="min(320px, 72%)" h="1rem" radius="6px" />
              <div class="card-rule" aria-hidden="true"></div>
              <SkeletonBlock w="min(220px, 48%)" h="0.95rem" radius="6px" />
            </div>
          </div>
          <div v-else class="card-rows">
            <button
              v-for="row in cardRows"
              :key="row.card.id"
              type="button"
              class="card-row"
              :class="{ editable: canEditCard(row.card) }"
              :disabled="!canEditCard(row.card)"
              @click="openEditCard(row.card)"
            >
              <div v-if="row.hasTags" class="card-tags">
                <span v-if="row.due" class="card-tag" :class="row.due.kind">
                  <svg v-if="row.due.kind === 'inDays'" class="tag-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M8 3v4M16 3v4M3 10h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  <svg v-else class="tag-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 8v4.5l3 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ row.dueLabel }}
                </span>
                <span v-if="row.recent" class="card-tag recent">{{ $t('deck.tagRecent') }}</span>
              </div>
              <div class="q">{{ preview(row.card.question || row.card.noteFields[0]) }}</div>
              <div class="card-rule" aria-hidden="true"></div>
              <div class="a">{{ preview(row.card.answer || row.card.noteFields[1]) }}</div>
              <div v-if="row.card.hasImage || row.card.hasAudio" class="card-media">
                <svg
                  v-if="row.card.hasImage"
                  class="media-icon"
                  viewBox="0 0 24 24"
                  :aria-label="$t('deck.containsImage')"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
                  <circle cx="8.5" cy="10" r="1.4" fill="currentColor"/>
                  <path d="M7 16.5l4.2-4.2 2.6 2.6 2.1-2.1L21 16.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg
                  v-if="row.card.hasAudio"
                  class="media-icon"
                  viewBox="0 0 24 24"
                  :aria-label="$t('deck.containsAudio')"
                >
                  <path d="M4 12v2a4 4 0 0 0 4 4h1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M15 15.5V8.8a1 1 0 0 1 1.5-.86l3.2 1.86" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M4 12a3.5 3.5 0 0 1 6.7-1.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <circle cx="8.2" cy="16.6" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
                  <circle cx="16.8" cy="15.8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
                </svg>
              </div>
            </button>
            <p v-if="cards.length === 0 && !cardsLoading" class="empty">{{ $t(browseEmptyKey) }}</p>
          </div>
          <button
            v-if="cards.length < cardTotal"
            type="button"
            class="show-more"
            :disabled="cardsLoading"
            @click="loadMoreCards"
          >
            {{ $t('deck.showMore') }}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </section>
        <p v-if="deckPending" class="cta">
          <SkeletonBlock w="min(480px, 92%)" h="1rem" radius="6px" />
        </p>
        <p v-else class="cta" v-html="ctaHtml"></p>
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
    <CardBrowseFilters
      :open="filtersOpen"
      :query="browseQuery"
      @dismiss="filtersOpen = false"
      @update="onBrowseFiltersUpdate"
    />
    <CardEditor
      :open="editorOpen"
      :deck="deck"
      :card="editingCard"
      :next-position="deck?.cardCount || 0"
      @dismiss="closeEditor"
      @saved="onCardSaved"
    />
    <StudyModeSheet
      :open="studySheetOpen"
      :title="deck?.name || $t('deck.study')"
      :busy="startingStudy"
      @dismiss="studySheetOpen = false"
      @study="onStudyChosen"
      @quiz="onQuizChosen"
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
import DeckStats from './DeckStats.vue';
import StudyLimitSheet from './StudyLimitSheet.vue';
import DeckSettings from './DeckSettings.vue';
import CardBrowseFilters from './CardBrowseFilters.vue';
import CardEditor from './CardEditor.vue';
import QuizSetup from './QuizSetup.vue';
import StudyModeSheet from './StudyModeSheet.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import { APP_STORE_URL } from '../constants';
import { ankiDayString } from '../study/ankiDay';
import { FREE_CARD_DAILY_LIMIT, isDailyLimitReached } from '../study/freeStudyQuota';
import {
  fetchAnswerHistogram,
  fetchCardsPage,
  fetchDeck,
  fetchDeckProgressCounts,
  fetchDeckTodayStats,
  fetchFreeStudyQuota,
  fetchStudyTimeSummary,
} from '../api/mopiq';
import { cacheDeck, cachedDeck, cachedDeckStats } from '../api/deckCache';
import { escapeHtml } from '../i18n';
import { cardEditableOnWeb } from '../study/cardFields';
import {
  browseDueTag,
  isRecentBrowseCard,
} from '../study/cardBrowseTags';
import {
  cardBrowsePageLimit,
  defaultCardBrowseQuery,
  hasActiveCardBrowseFilters,
  isDefaultCardBrowseQuery,
  normalizeCardBrowseQuery,
} from '../study/cardBrowse';

export default {
  name: 'DeckDetailPage',
  inject: {
    refreshAppSplit: { default: null },
  },
  components: {
    DeckStats,
    StudyLimitSheet,
    DeckSettings,
    CardBrowseFilters,
    CardEditor,
    QuizSetup,
    StudyModeSheet,
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
      cardsRequestId: 0,
      loadGen: 0,
      searchText: '',
      searchTimer: 0,
      browseQuery: defaultCardBrowseQuery(),
      seenCount: 0,
      studiedToday: 0,
      storeUrl: APP_STORE_URL,
      limitOpen: false,
      settingsOpen: false,
      filtersOpen: false,
      editorOpen: false,
      editingCard: null,
      quizOpen: false,
      studySheetOpen: false,
    };
  },
  watch: {
    searchText() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        const query = this.searchText.trim();
        if (query === this.browseQuery.query) return;
        this.browseQuery = normalizeCardBrowseQuery({ ...this.browseQuery, query });
        this.resetAndLoadCards();
      }, 300);
    },
    '$route.params.deckId'(deckId) {
      if (!deckId || this.$route.meta.preview) return;
      this.reloadAll(deckId);
    },
  },
  beforeUnmount() {
    clearTimeout(this.searchTimer);
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
    listTo() {
      return this.$route.path.startsWith('/dev/split') ? '/dev/split' : '/decks';
    },
    cardsVisible() {
      return this.deck ? this.deck.canStudy : this.deckPending;
    },
    ctaHtml() {
      const app = `<a href="${this.storeUrl}" target="_blank" rel="noopener">${escapeHtml(this.$t('common.app'))}</a>`;
      const key = this.deck?.canEdit ? 'deck.ctaMedia' : 'deck.cta';
      return this.$t(key, { app });
    },
    hasActiveFilters() {
      return hasActiveCardBrowseFilters(this.browseQuery);
    },
    browseEmptyKey() {
      return this.hasActiveFilters || this.browseQuery.query
        ? 'deck.noCardMatches'
        : 'deck.noCardsYet';
    },
    cardRows() {
      return this.cards.map((card) => {
        const due = browseDueTag(card);
        const recent = isRecentBrowseCard(card);
        let dueLabel = '';
        if (due?.kind === 'today') dueLabel = this.$t('deck.tagToday');
        else if (due?.kind === 'tomorrow') dueLabel = this.$t('deck.tagTomorrow');
        else if (due?.kind === 'inDays') dueLabel = this.$t('deck.tagInDays', { days: due.days });
        return {
          card,
          due,
          dueLabel,
          recent,
          hasTags: Boolean(due || recent),
        };
      });
    },
  },
  created() {
    if (this.$route.meta.preview) {
      this.applyLayoutPreview();
      return;
    }
    this.reloadAll(this.$route.params.deckId);
  },
  methods: {
    reloadAll(deckId) {
      ++this.loadGen;
      this.cardsRequestId += 1;
      clearTimeout(this.searchTimer);
      this.error = '';
      this.deckPending = true;
      this.statsPending = true;
      this.timePending = true;
      this.gradePending = true;
      this.seenPending = true;
      this.cardsReady = false;
      this.cardsLoading = false;
      this.cards = [];
      this.cardTotal = 0;
      this.searchText = '';
      this.browseQuery = defaultCardBrowseQuery();
      this.editorOpen = false;
      this.editingCard = null;
      this.settingsOpen = false;
      this.filtersOpen = false;
      this.quizOpen = false;
      this.studySheetOpen = false;
      this.limitOpen = false;
      this.seenCount = 0;
      this.studiedToday = 0;
      this.deck = cachedDeck(deckId);
      this.listStats = cachedDeckStats(deckId);
      this.loadDeck(deckId);
      this.loadListStats(deckId);
      this.loadTime(deckId);
      this.loadGrade(deckId);
      this.loadSeen(deckId);
    },
    applyLayoutPreview() {
      const now = Date.now();
      this.deck = {
        id: 'preview',
        name: 'UK Prime Ministers',
        cardCount: 53,
        canStudy: true,
        canEdit: true,
        topic: { color: '#0A7AFF', backgroundColor: '#E0F2FE', imageName: 'history' },
      };
      this.listStats = {
        statsAvailable: true,
        cardsForToday: 52,
        newRemainingToday: 13,
        reviewDueToday: 39,
      };
      this.seenCount = 40;
      this.studiedToday = 1;
      this.histogram = {
        counts: { AGAIN: 10, HARD: 1, GOOD: 1, EASY: 0 },
        total: 12,
        grade: 49,
      };
      this.time = {
        todayMilliseconds: 3000,
        totalMilliseconds: 1285000,
        activeDays: 4,
        firstStudiedAt: '2026-08-26T10:00:00Z',
      };
      const samples = [
        ['Who was the first Prime Minister of the United Kingdom?', 'Robert Walpole (1721–1742)'],
        ['Which PM led Britain through most of World War II?', 'Winston Churchill'],
        ['Who was the first female Prime Minister?', 'Margaret Thatcher (1979)'],
        ['Who oversaw the creation of the NHS?', 'Clement Attlee'],
        ['Who succeeded Tony Blair in 2007?', 'Gordon Brown'],
        ['Which PM served the longest in the 20th century?', 'Margaret Thatcher'],
        ['Who was Prime Minister during the Suez Crisis?', 'Anthony Eden'],
        ['Who led the coalition government from 2010?', 'David Cameron'],
        ['Who became Prime Minister in 2022 after Liz Truss?', 'Rishi Sunak'],
        ['Who was the first Labour Prime Minister?', 'Ramsay MacDonald'],
      ];
      this.cards = samples.map(([question, answer], index) => ({
        id: String(index + 1),
        question,
        answer,
        noteFields: [question, answer],
        dueDate: new Date(now + index * 86400000).toISOString(),
        reviewCount: index + 1,
        state: 'REVIEW',
        updatedAt: now - index * 3600000,
        hasImage: index === 1,
        hasAudio: index === 2,
      }));
      this.cardTotal = 53;
      this.deckPending = false;
      this.statsPending = false;
      this.timePending = false;
      this.gradePending = false;
      this.seenPending = false;
      this.cardsReady = true;
    },
    async loadDeck(deckId) {
      const gen = this.loadGen;
      try {
        const deck = await fetchDeck(deckId);
        if (gen !== this.loadGen) return;
        this.deck = deck;
      } catch (error) {
        if (gen !== this.loadGen) return;
        this.error = error.message || this.$t('deck.loadError');
        return;
      } finally {
        if (gen === this.loadGen) this.deckPending = false;
      }
      if (this.deck.canStudy) {
        await this.loadMoreCards();
      }
      if (gen === this.loadGen) this.cardsReady = true;
    },
    async loadListStats(deckId) {
      const gen = this.loadGen;
      try {
        const deck = (this.deck?.id === deckId && this.deck.config)
          ? this.deck
          : await fetchDeck(deckId);
        if (gen !== this.loadGen) return;
        if (!this.deck) this.deck = deck;
        this.listStats = await fetchDeckTodayStats(deck);
        if (gen !== this.loadGen) return;
      } catch {
        // The dashboard falls back to em dashes when stats are unavailable.
      } finally {
        if (gen === this.loadGen) this.statsPending = false;
      }
    },
    async loadTime(deckId) {
      const gen = this.loadGen;
      try {
        const time = await fetchStudyTimeSummary(deckId);
        if (gen !== this.loadGen) return;
        this.time = time;
      } catch {
        // Keep the zeroed defaults.
      } finally {
        if (gen === this.loadGen) this.timePending = false;
      }
    },
    async loadGrade(deckId) {
      const gen = this.loadGen;
      try {
        const histogram = await fetchAnswerHistogram(deckId);
        if (gen !== this.loadGen) return;
        this.histogram = histogram;
      } catch {
        // Keep the zeroed defaults.
      } finally {
        if (gen === this.loadGen) this.gradePending = false;
      }
    },
    async loadSeen(deckId) {
      const gen = this.loadGen;
      const counts = await fetchDeckProgressCounts(deckId).catch(() => ({ seen: 0, studiedToday: 0 }));
      if (gen !== this.loadGen) return;
      this.seenCount = counts.seen;
      this.studiedToday = counts.studiedToday;
      this.seenPending = false;
    },
    preview(text) {
      return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    },
    openStudySheet() {
      if (!this.deck?.canStudy || this.startingStudy) return;
      this.studySheetOpen = true;
    },
    onStudyChosen() {
      this.studySheetOpen = false;
      this.startStudy();
    },
    onQuizChosen() {
      this.studySheetOpen = false;
      this.quizOpen = true;
    },
    focusSearch() {
      const section = this.$refs.cardsSection;
      if (section?.scrollIntoView) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      this.$nextTick(() => {
        this.$refs.searchInput?.focus();
      });
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
    async resetAndLoadCards() {
      this.cards = [];
      this.cardTotal = 0;
      await this.loadMoreCards();
    },
    onBrowseFiltersUpdate(query) {
      this.browseQuery = normalizeCardBrowseQuery({
        ...query,
        query: this.browseQuery.query,
      });
      this.resetAndLoadCards();
    },
    async loadMoreCards() {
      if (!this.deck?.id) return;
      const requestId = ++this.cardsRequestId;
      const offset = this.cards.length;
      this.cardsLoading = true;
      try {
        const page = await fetchCardsPage(
          this.deck.id,
          offset,
          cardBrowsePageLimit(offset),
          this.browseQuery,
        );
        if (requestId !== this.cardsRequestId) return;
        if (page.cards.length || offset === 0) {
          this.cardTotal = page.total;
        }
        this.cards = this.cards.concat(page.cards);
      } catch (error) {
        if (requestId !== this.cardsRequestId) return;
        this.error = error.message || this.$t('deck.cardsError');
      } finally {
        if (requestId === this.cardsRequestId) this.cardsLoading = false;
      }
    },
    canEditCard(card) {
      return Boolean(this.deck?.canEdit && card && cardEditableOnWeb(card));
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
      this.refreshAppSplit?.();
    },
    onCardSaved({ card, extra, created, keepOpen, imported }) {
      if (imported?.length) {
        const add = imported.length;
        this.deck = cacheDeck({ ...this.deck, cardCount: (this.deck.cardCount || 0) + add });
        if (isDefaultCardBrowseQuery(this.browseQuery)) {
          this.cards = imported.concat(this.cards);
          this.cardTotal += add;
        } else {
          this.resetAndLoadCards();
        }
        this.statsPending = true;
        this.loadListStats(this.deck.id);
        this.refreshAppSplit?.();
        return;
      }
      if (created) {
        const add = extra ? 2 : 1;
        this.deck = cacheDeck({ ...this.deck, cardCount: (this.deck.cardCount || 0) + add });
        if (isDefaultCardBrowseQuery(this.browseQuery)) {
          const prepend = extra ? [extra, card] : [card];
          this.cards = prepend.concat(this.cards);
          this.cardTotal += add;
        } else {
          this.resetAndLoadCards();
        }
      } else {
        this.cards = this.cards.map((row) => (row.id === card.id ? { ...row, ...card } : row));
      }
      if (!keepOpen) this.closeEditor();
      this.statsPending = true;
      this.loadListStats(this.deck.id);
      this.refreshAppSplit?.();
    },
  },
};
</script>

<style scoped>
.detail-page {
  text-align: left;
  min-height: 100%;
  padding: 12px 28px 48px;
  background-color: var(--page-bg);
  background-image: none;
}
.detail { text-align: left; }
.topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 8px;
}
.back {
  display: none;
  align-items: center;
  gap: 2px;
  margin-right: auto;
  color: var(--blue-button);
  text-decoration: none;
  font-weight: 600;
}
.back svg { width: 18px; height: 18px; display: block; }
.tools { display: flex; align-items: center; gap: 8px; }
.tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 18px;
  background: var(--card-bg);
  color: var(--blue-button);
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--card-list-border);
}
.tool svg { width: 18px; height: 18px; display: block; }
.tool.add { color: var(--title); }
.add-label {
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
}
.hero { margin: 18px 0 0; }
h1 {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--title);
  margin: 0 0 8px;
}
.title-line { margin-bottom: 10px; }
.sub { margin: 0; font-size: 1rem; color: var(--text-secondary); }
.study-wrap { padding-top: 0; }
.study-btn {
  width: 100%;
  height: 64px;
  border-radius: 20px !important;
  font-size: 1.125rem !important;
  letter-spacing: 0 !important;
  font-weight: 600 !important;
  padding: 0 !important;
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
}
.app-only {
  background: var(--card-bg);
  border: 1px solid var(--stat-card-border);
  border-radius: 24px;
  padding: 24px 18px;
}
.app-only h2 { font-size: 1.25rem; margin-bottom: 8px; color: var(--title); }
.app-only p { color: var(--text); margin-bottom: 16px; }
.cta { color: var(--text-secondary); margin: 28px 0 0; font-size: 0.9rem; }
.cta a { color: var(--blue-button); }
.cards { margin-top: 18px; padding-top: 0; padding-bottom: 8px; }
.cards-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.cards h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--title);
}
.view-all {
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}
.view-all.active { font-weight: 700; }
.browse-bar {
  position: sticky;
  top: 0;
  z-index: 6;
  margin: -12px -28px 12px;
  padding: 12px 28px 12px;
  background-color: var(--page-bg);
  background-image: none;
  box-shadow: 0 12px 18px -14px rgba(15, 23, 42, 0.28);
}
.browse-search {
  width: 100%;
  min-width: 0;
  border: 0;
  background: var(--inset-bg);
  color: var(--title);
  border-radius: 12px;
  padding: 10px 14px;
  font: inherit;
}
.show-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin-top: 8px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
.show-more svg { width: 12px; height: 12px; }
.show-more:disabled { opacity: 0.55; }
.card-rows { display: grid; gap: 18px; }
.card-row {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid var(--card-list-border);
  background: var(--card-bg);
  border-radius: 20px;
  padding: 16px;
  box-shadow: none;
  color: inherit;
  font: inherit;
  overflow: hidden;
}
.card-row.editable { cursor: pointer; }
.card-row:disabled { cursor: default; opacity: 1; }
.skeleton-row .q-line { margin-top: 10px; }
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.card-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}
.card-tag.today { color: var(--tag-today-fg); background: var(--tag-today-bg); }
.card-tag.tomorrow { color: var(--tag-tomorrow-fg); background: var(--tag-tomorrow-bg); }
.card-tag.inDays { color: var(--tag-later-fg); background: var(--tag-later-bg); }
.card-tag.recent {
  color: var(--tag-recent-fg);
  background: var(--tag-recent-bg);
  font-weight: 800;
  letter-spacing: 0.02em;
}
.tag-icon { width: 12px; height: 12px; flex: 0 0 auto; }
.q {
  font-size: 1rem;
  font-weight: 500;
  color: var(--title);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-rule {
  height: 1px;
  margin: 16px -16px;
  background-image: repeating-linear-gradient(
    to right,
    var(--card-dash) 0 3px,
    transparent 3px 6px
  );
}
.a {
  font-size: 1rem;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-media {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  color: var(--text-secondary);
}
.media-icon { width: 20px; height: 20px; display: block; }
.error { color: var(--error); }
.empty { color: var(--text-secondary); }
@media (max-width: 899px) {
  .back { display: inline-flex; }
  .detail-page { padding: 8px 16px 40px; }
  .browse-bar {
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
  }
}
@media (max-width: 599px) {
  .add-label { display: none; }
  .tool.add { padding: 0; }
}
</style>
