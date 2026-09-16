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
          <div class="browse-bar">
            <input
              v-model="searchText"
              type="search"
              class="browse-search"
              :placeholder="$t('deck.searchCards')"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
            >
            <button
              type="button"
              class="mopiq-btn secondary filter-btn"
              :class="{ active: hasActiveFilters }"
              :aria-pressed="hasActiveFilters"
              @click="filtersOpen = true"
            >
              {{ $t('deck.filterSort') }}
            </button>
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
import CardBrowseFilters from './CardBrowseFilters.vue';
import CardEditor from './CardEditor.vue';
import QuizSetup from './QuizSetup.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import { APP_STORE_URL } from '../constants';
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
  components: {
    AppHeader,
    DeckStats,
    StudyLimitSheet,
    DeckSettings,
    CardBrowseFilters,
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
      cardsRequestId: 0,
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
        : 'deck.noCards';
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
      return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
        this.deck = cacheDeck({ ...this.deck, cardCount: (this.deck.cardCount || 0) + 1 });
        if (isDefaultCardBrowseQuery(this.browseQuery)) {
          this.cards = [card, ...this.cards];
          this.cardTotal += 1;
        } else {
          this.resetAndLoadCards();
        }
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
.browse-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.browse-search {
  flex: 1 1 220px;
  min-width: 0;
  border: 1px solid var(--empty-bar);
  background: var(--card-bg);
  color: var(--title);
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
}
.filter-btn { margin-top: 0; }
.filter-btn.active {
  outline: 2px solid var(--blue-button);
}
.cards .mopiq-btn { margin-top: 12px; }
.browse-bar .mopiq-btn { margin-top: 0; }
.card-rows { display: grid; gap: 12px; }
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
</style>
