<template>
  <div class="detail-page" :class="{ selecting: selectionMode }">
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
              v-if="deck?.canEdit"
              type="button"
              class="tool"
              :aria-label="$t('deck.settings')"
              @click="settingsOpen = true"
            >
              <StudyMenuIcon name="settings" />
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
          :grade-available="gradeAvailable"
          :grade-syncing="gradeSyncing"
          @retry-grade="retryGradeSync"
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

        <button
          v-if="activeFolder"
          type="button"
          class="folder-back"
          @click="leaveFolder"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ folderBackLabel }}
        </button>
        <DeckFolders
          v-if="showFolders"
          :folders="deckFolders"
          :parent="folderParent"
          :counts="subdeckCounts"
          :decks="deck.decks"
          :deck-name="deck.name"
          :can-edit="Boolean(deck.canEdit)"
          :can-add="canAddFolder"
          :busy="foldersBusy"
          @open="openFolder"
          @add="createFolder"
          @rename="renameListedFolder"
          @remove="removeFolder"
        />

        <section v-if="cardsVisible" class="cards">
          <div class="browse-sticky">
            <div class="cards-head">
              <h2>{{ cardsHeading }}</h2>
              <div class="cards-head-actions">
              <button
                v-if="checkboxMode"
                type="button"
                class="browse-cancel"
                @click="exitCheckboxMode"
              >
                {{ $t('common.cancel') }}
              </button>
              <div
                v-if="deck?.canEdit"
                class="mode-tabs"
                role="tablist"
                :aria-label="$t('deck.inspectorMode')"
              >
                <button
                  type="button"
                  role="tab"
                  :aria-selected="inspectorMode === 'view'"
                  :class="{ on: inspectorMode === 'view' }"
                  @click="setInspectorMode('view')"
                >
                  {{ $t('deck.inspectorView') }}
                </button>
                <button
                  type="button"
                  role="tab"
                  :aria-selected="inspectorMode === 'edit'"
                  :class="{ on: inspectorMode === 'edit' }"
                  @click="setInspectorMode('edit')"
                >
                  {{ $t('deck.inspectorEdit') }}
                </button>
              </div>
              </div>
            </div>
            <div class="browse-bar" :class="{ locked: checkboxMode }">
              <label class="ios-search browse-search">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" stroke-width="2"/>
                  <path d="M16 16l4.2 4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <input
                  v-model="searchText"
                  type="search"
                  :disabled="checkboxMode"
                  :placeholder="$t('deck.searchCards')"
                  autocomplete="off"
                  autocapitalize="none"
                  spellcheck="false"
                >
                <button
                  v-if="searchText"
                  type="button"
                  class="search-clear"
                  :disabled="checkboxMode"
                  :aria-label="$t('common.clear')"
                  @click="searchText = ''"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
                  </svg>
                </button>
              </label>
              <button
                type="button"
                class="view-all"
                :class="{ active: hasActiveFilters }"
                :disabled="checkboxMode"
                :aria-pressed="hasActiveFilters"
                @click="filtersOpen = true"
              >
                {{ $t('deck.filterSort') }}
              </button>
            </div>
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
            <div
              v-for="row in cardRows"
              :key="row.card.id"
              class="card-row"
              :class="{
                selected: !checkboxMode && inspectedCard?.id === row.card.id,
                checked: checkboxMode && selectedIds[row.card.id],
                'has-menu': deck?.canEdit,
              }"
            >
              <button
                type="button"
                class="card-open"
                @click="onCardRowClick(row.card)"
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
              <button
                v-if="deck?.canEdit && checkboxMode"
                type="button"
                class="select-hit"
                :aria-pressed="selectedIds[row.card.id] ? 'true' : 'false'"
                :aria-label="$t('deck.select')"
                @click.stop="toggleCardSelected(row.card)"
              >
                <span class="select-box" :class="{ on: selectedIds[row.card.id] }">
                  <svg v-if="selectedIds[row.card.id]" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 12.5l4 4L18 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </button>
              <CardRowMenu
                v-else-if="deck?.canEdit"
                :open="menuCardId === row.card.id"
                :disabled="actionBusy"
                @toggle="toggleCardMenu(row.card.id)"
                @close="menuCardId = null"
                @select="startCheckboxMode(row.card)"
                @edit="editListedCard(row.card)"
                @move="openFolderPicker(row.card)"
                @move-to-deck="openDeckPicker(row.card)"
                @copy="copyListedCard(row.card)"
                @reverse="openReverse(row.card)"
                @delete="openDelete(row.card)"
              />
            </div>
            <p v-if="visibleCards.length === 0 && !cardsLoading" class="empty">{{ $t(browseEmptyKey) }}</p>
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
      @deleted="onDeckDeleted"
      @reset="onProgressReset"
    />
    <CardBrowseFilters
      :open="filtersOpen"
      :query="browseQuery"
      @dismiss="filtersOpen = false"
      @update="onBrowseFiltersUpdate"
    />
    <CardViewer
      :open="viewerOpen"
      :embedded="paneEmbedded"
      :deck="deck"
      :card="inspectedCard"
      @dismiss="closeInspector"
    />
    <CardEditor
      :open="editorOpen"
      :embedded="editorEmbedded"
      :deck="deck"
      :card="editorCard"
      :next-position="deck?.cardCount || 0"
      @dismiss="closeEditor"
      @saved="onCardSaved"
      @magic-imported="onMagicImported"
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
    <StudyPickerSheet
      :open="folderPickerOpen"
      :title="$t('study.moveToFolder')"
      :subtitle="actionFolderSubtitle"
      :items="actionFolders"
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
      :items="actionDeckItems"
      :busy="actionBusy"
      :error="actionError"
      @dismiss="deckPickerOpen = false"
      @select="chooseTargetDeck"
    />
    <StudyPickerSheet
      :open="targetFolderOpen"
      :title="$t('study.moveToFolder')"
      :items="targetFolders"
      :selected-id="targetFolderSelectedId"
      :confirm-label="$t('study.moveCard')"
      :busy="actionBusy"
      :error="actionError"
      @dismiss="targetFolderOpen = false"
      @select="targetFolderSelectedId = $event.id"
      @confirm="confirmMoveToDeck"
    />
    <StudyConfirmSheet
      :open="reverseOpen"
      :title="reverseConfirmTitle"
      :message="reverseConfirmMessage"
      :confirm-label="$t('deck.reverseConfirm')"
      :danger="false"
      :busy="actionBusy"
      :error="actionError"
      @dismiss="reverseOpen = false"
      @confirm="confirmReverse"
    />
    <StudyConfirmSheet
      :open="deleteOpen"
      :title="$t('study.deleteTitle')"
      :message="deleteConfirmMessage"
      :confirm-label="$t('study.deleteCard')"
      :busy="actionBusy"
      :error="actionError"
      @dismiss="deleteOpen = false"
      @confirm="confirmDelete"
    />
    <Teleport to="body">
      <button
        v-if="selectionMoreOpen"
        type="button"
        class="selection-backdrop"
        :aria-label="$t('common.close')"
        @click="selectionMoreOpen = false"
      ></button>
      <div
        v-if="selectionMode"
        class="selection-root"
        :style="selectionBarStyle"
      >
        <div v-if="selectionMoreOpen" class="selection-menu" role="menu" :aria-label="$t('deck.selectionBar')">
          <button type="button" class="selection-item" role="menuitem" @click="runSelectionAction('move')">
            <span>{{ $t('deck.moveWithinDeck') }}</span>
            <StudyMenuIcon name="folder" />
          </button>
          <button type="button" class="selection-item" role="menuitem" @click="runSelectionAction('move-to-deck')">
            <span>{{ $t('study.moveToDeck') }}</span>
            <StudyMenuIcon name="inbox" />
          </button>
          <button type="button" class="selection-item" role="menuitem" @click="runSelectionAction('copy')">
            <span>{{ $t('deck.copyCard') }}</span>
            <StudyMenuIcon name="copy" />
          </button>
          <button type="button" class="selection-item" role="menuitem" @click="runSelectionAction('reverse')">
            <span>{{ $t('deck.reverseCard') }}</span>
            <StudyMenuIcon name="exchange" />
          </button>
        </div>
        <div class="selection-bar" role="toolbar" :aria-label="$t('deck.nSelected', { count: selectionCount })">
          <button
            type="button"
            class="bar-icon danger"
            :disabled="actionBusy"
            :aria-label="$t('study.deleteCard')"
            @click="openSelectionDelete"
          >
            <StudyMenuIcon name="trash" />
          </button>
          <button
            type="button"
            class="bar-text"
            :disabled="actionBusy || allLoadedSelected"
            @click="selectAllCards"
          >
            {{ $t('deck.selectAll') }}
          </button>
          <button
            type="button"
            class="bar-icon"
            :disabled="actionBusy"
            :aria-label="$t('deck.cardMenu')"
            :aria-expanded="selectionMoreOpen ? 'true' : 'false'"
            @click="selectionMoreOpen = !selectionMoreOpen"
          >
            <StudyMenuIcon name="ellipsis" />
          </button>
        </div>
      </div>
    </Teleport>
    <div v-if="actionToast" class="action-toast" role="status">{{ actionToast }}</div>
  </div>
</template>

<script>
import { deckReviewSync } from '../study/reviewSync';
import { getCurrentUser } from '../auth/session';
import { submitReview } from '../api/mopiq';

import DeckStats from './DeckStats.vue';
import StudyLimitSheet from './StudyLimitSheet.vue';
import DeckSettings from './DeckSettings.vue';
import CardBrowseFilters from './CardBrowseFilters.vue';
import CardEditor from './CardEditor.vue';
import CardViewer from './CardViewer.vue';
import QuizSetup from './QuizSetup.vue';
import StudyModeSheet from './StudyModeSheet.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import { APP_STORE_URL } from '../constants';
import { ankiDayString } from '../study/ankiDay';
import { FREE_CARD_DAILY_LIMIT, isDailyLimitReached } from '../study/freeStudyQuota';
import {
  copyDeckCard,
  deleteDeckCards,
  fetchAnswerHistogram,
  fetchCardsPage,
  fetchDeck,
  fetchDeckList,
  fetchDeckProgressCounts,
  fetchDeckTodayStats,
  fetchFreeStudyQuota,
  fetchStudyTimeSummary,
  fetchSubdeckCardCounts,
  moveCardToAnotherDeck,
  moveCardsToSubdeck,
  reverseDeckCard,
  saveDeckFolders,
} from '../api/mopiq';
import { cacheDeck, cachedDeck, cachedDeckList, cachedDeckStats } from '../api/deckCache';
import { escapeHtml } from '../i18n';
import { deckGradeFromCounts } from '../study/deckStats';
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
import { canShowInspectorColumn } from '../study/splitInspector';
import { cardEditableOnWeb, reversedCardFields } from '../study/cardFields';
import { containsClozeMarkup } from '../study/sanitizeCardHtml';
import {
  deleteFolder,
  findFolder,
  folderById,
  folderCanAddChild,
  folderHasChildren,
  folderScopeIds,
  FolderEditError,
  parentOf,
  parseDeckFolders,
  renameFolder,
  rootFolder,
  rootFolderId,
  addFolder,
} from '../study/deckFolders';
import CardRowMenu from './CardRowMenu.vue';
import DeckFolders from './DeckFolders.vue';
import StudyMenuIcon from './StudyMenuIcon.vue';
import StudyConfirmSheet from './StudyConfirmSheet.vue';
import StudyPickerSheet from './StudyPickerSheet.vue';

export default {
  name: 'DeckDetailPage',
  inject: {
    refreshAppSplit: { default: null },
    setInspectorOpen: { default: null },
  },
  components: {
    DeckStats,
    StudyLimitSheet,
    DeckSettings,
    CardBrowseFilters,
    CardEditor,
    CardViewer,
    QuizSetup,
    StudyModeSheet,
    SkeletonBlock,
    CardRowMenu,
    StudyMenuIcon,
    StudyConfirmSheet,
    StudyPickerSheet,
    DeckFolders,
  },
  data() {
    return {
      deckPending: true,
      statsPending: true,
      timePending: true,
      gradePending: true,
      gradeAvailable: false,
      gradeSyncing: false,
      reviewSync: null,
      unsubscribeGradeSync: null,
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
      addingCard: false,
      inspectedCard: null,
      inspectorMode: 'view',
      inspectorCanShow: false,
      quizOpen: false,
      studySheetOpen: false,
      menuCardId: null,
      actionCard: null,
      actionBusy: false,
      actionError: '',
      actionToast: '',
      actionToastTimer: 0,
      folderPickerOpen: false,
      deckPickerOpen: false,
      targetFolderOpen: false,
      reverseOpen: false,
      deleteOpen: false,
      actionFolders: [],
      folderSelectedId: null,
      otherDecks: [],
      targetDeck: null,
      targetFolders: [],
      targetFolderSelectedId: null,
      checkboxMode: false,
      selectedIds: {},
      selectionMoreOpen: false,
      selectionBarStyle: {},
      subdeckCounts: {},
      foldersBusy: false,
      actionCards: [],
      bulkAction: false,
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
    showInspectorColumn(open) {
      this.setInspectorOpen?.(open);
      this.$nextTick(this.positionSelectionBar);
    },
    selectionMode(open) {
      this.selectionMoreOpen = false;
      if (open) this.$nextTick(this.positionSelectionBar);
    },
    '$route.query.folder'() {
      if (this.needsMoreFolderCards()) this.loadMoreCards();
    },
  },
  created() {
    if (this.$route.meta.preview) {
      this.applyLayoutPreview();
    } else {
      this.reloadAll(this.$route.params.deckId);
    }
    this.syncInspectorWidth();
    this.onSelectionLayout = () => {
      this.syncInspectorWidth();
      if (this.selectionMode) this.positionSelectionBar();
    };
    window.addEventListener('resize', this.onSelectionLayout);
    window.addEventListener('scroll', this.onSelectionLayout, true);
    window.addEventListener('online', this.retryGradeSync);
  },
  beforeUnmount() {
    this.unsubscribeGradeSync?.();
    window.removeEventListener('online', this.retryGradeSync);
    clearTimeout(this.searchTimer);
    window.removeEventListener('resize', this.onSelectionLayout);
    window.removeEventListener('scroll', this.onSelectionLayout, true);
    this.clearActionToast();
    this.setInspectorOpen?.(false);
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
    deckFolders() {
      return parseDeckFolders(this.deck?.decks, this.deck?.name || '');
    },
    activeFolder() {
      const folder = findFolder(this.deckFolders, this.$route.query.folder);
      return folder && folder.depth > 0 ? folder : null;
    },
    folderParent() {
      return this.activeFolder || rootFolder(this.deckFolders);
    },
    showFolders() {
      const parent = this.folderParent;
      if (!parent || !this.deck) return false;
      const hasChildren = this.deckFolders.some((folder) => (
        folder.depth === parent.depth + 1 && folder.fullPath.startsWith(`${parent.fullPath}::`)
      ));
      return hasChildren || (this.deck.canEdit && folderCanAddChild(parent));
    },
    canAddFolder() {
      return folderCanAddChild(this.folderParent);
    },
    folderBackLabel() {
      const parent = parentOf(this.deckFolders, this.activeFolder);
      return parent?.title || this.deck?.name || '';
    },
    visibleCards() {
      const folder = this.activeFolder;
      let cards = this.cards;
      if (folder && folder.depth > 0) {
        const ids = new Set(folderScopeIds(this.deckFolders, folder));
        cards = cards.filter((card) => ids.has(Number(card.subdeckId) || 0));
      }
      const query = this.$route.meta.preview ? this.browseQuery.query.trim().toLowerCase() : '';
      if (!query) return cards;
      return cards.filter((card) => `${card.question || ''} ${card.answer || ''}`.toLowerCase().includes(query));
    },
    cardRows() {
      return this.visibleCards.map((card) => {
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
    paneEmbedded() {
      return Boolean(this.inspectedCard && this.inspectorCanShow && this.setInspectorOpen);
    },
    showInspectorColumn() {
      return this.paneEmbedded;
    },
    viewerOpen() {
      return Boolean(this.inspectedCard && this.inspectorMode === 'view' && !this.addingCard);
    },
    editorCard() {
      return this.addingCard ? null : this.inspectedCard;
    },
    editorOpen() {
      return this.addingCard || Boolean(this.inspectedCard && this.inspectorMode === 'edit' && !this.addingCard);
    },
    editorEmbedded() {
      return Boolean(this.paneEmbedded && this.inspectorMode === 'edit' && !this.addingCard);
    },
    actionFolderSubtitle() {
      const folder = folderById(this.actionFolders, this.actionCard?.subdeckId);
      const name = folder?.fullPath || this.deck?.name || '';
      return name ? this.$t('study.moveCardSubtitle', { folder: name.replace(/::/g, ' → ') }) : '';
    },
    cardsHeading() {
      if (this.selectionCount) return this.$t('deck.nSelected', { count: this.selectionCount });
      const folder = this.activeFolder;
      if (folder && folder.depth > 0) {
        const count = folderScopeIds(this.deckFolders, folder)
          .reduce((sum, id) => sum + (Number(this.subdeckCounts[id]) || 0), 0);
        return this.$t('deck.allCards', { count });
      }
      return this.$t('deck.allCards', { count: this.deck ? this.deck.cardCount : '—' });
    },
    selectionCount() {
      return Object.keys(this.selectedIds).length;
    },
    selectionMode() {
      return this.checkboxMode && this.selectionCount > 0;
    },
    selectedCards() {
      return this.visibleCards.filter((card) => this.selectedIds[card.id]);
    },
    allLoadedSelected() {
      const cards = this.visibleCards;
      if (!cards.length || !cards.every((card) => this.selectedIds[card.id])) return false;
      if (this.cards.length >= this.cardTotal) return true;
      if (!this.activeFolder) return false;
      const expected = folderScopeIds(this.deckFolders, this.activeFolder)
        .reduce((sum, id) => sum + (Number(this.subdeckCounts[id]) || 0), 0);
      return expected > 0 && cards.length >= expected;
    },
    deleteConfirmMessage() {
      const count = this.actionCards.length;
      if (count > 1) return this.$t('deck.deleteMany', { count });
      return this.$t('study.deleteMessage');
    },
    reverseConfirmTitle() {
      return this.actionCards.length > 1 ? this.$t('deck.reverseManyTitle') : this.$t('deck.reverseTitle');
    },
    reverseConfirmMessage() {
      const count = this.actionCards.length;
      return count > 1
        ? this.$t('deck.reverseManyMessage', { count })
        : this.$t('deck.reverseMessage');
    },
    actionDeckItems() {
      return this.otherDecks.map((deck) => ({
        id: deck.id,
        title: deck.name,
        detail: this.$t('decks.cards', { count: deck.cardCount || 0 }),
        icon: deck.topic?.imageName ? `/topics/${deck.topic.imageName}.svg` : '',
      }));
    },
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
      this.gradeAvailable = false;
      this.gradeSyncing = false;
      this.seenPending = true;
      this.unsubscribeGradeSync?.();
      this.reviewSync = deckReviewSync({
        userId: getCurrentUser()?.supabaseUid,
        deckId,
        submit: submitReview,
        currentUserId: () => getCurrentUser()?.supabaseUid,
      });
      this.unsubscribeGradeSync = this.reviewSync.subscribe((state) => {
        const wasSyncing = this.gradeSyncing;
        this.gradeSyncing = state.pending > 0;
        if (this.gradeSyncing) this.gradeAvailable = false;
        if (wasSyncing && !this.gradeSyncing) {
          this.loadGrade(deckId);
          this.loadSeen(deckId);
        }
      });
      this.cardsReady = false;
      this.cardsLoading = false;
      this.cards = [];
      this.cardTotal = 0;
      this.searchText = '';
      this.browseQuery = defaultCardBrowseQuery();
      this.addingCard = false;
      this.inspectedCard = null;
      this.settingsOpen = false;
      this.filtersOpen = false;
      this.quizOpen = false;
      this.studySheetOpen = false;
      this.limitOpen = false;
      this.exitCheckboxMode();
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
        decks: {
          1: { id: 1, name: 'UK Prime Ministers', conf: 1, desc: '' },
          2: { id: 2, name: 'UK Prime Ministers::18th century', conf: 1, desc: '' },
          3: { id: 3, name: 'UK Prime Ministers::20th century', conf: 1, desc: '' },
          4: { id: 4, name: 'UK Prime Ministers::20th century::Wartime', conf: 1, desc: '' },
        },
      };
      this.listStats = {
        statsAvailable: true,
        cardsForToday: 52,
        newRemainingToday: 13,
        reviewDueToday: 39,
      };
      this.seenCount = 40;
      this.studiedToday = 1;
      const previewCounts = { AGAIN: 10, HARD: 1, GOOD: 1, EASY: 0 };
      this.histogram = {
        counts: previewCounts,
        total: 12,
        grade: deckGradeFromCounts(previewCounts, 12),
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
        subdeckId: [2, 2, 2, 3, 3, 3, 4, 4, 1, 1][index],
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
      this.gradeAvailable = true;
      this.seenPending = false;
      this.cardsReady = true;
      this.subdeckCounts = { 1: 22, 2: 12, 3: 11, 4: 8 };
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
      this.loadFolderCounts(deckId);
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
    retryGradeSync() {
      this.reviewSync?.retry();
      if (!this.reviewSync?.pendingCount()) this.loadGrade(this.$route.params.deckId);
    },
    async loadGrade(deckId) {
      const gen = this.loadGen;
      this.gradePending = true;
      try {
        if (this.reviewSync?.pendingCount()) {
          this.gradeAvailable = false;
          return;
        }
        const histogram = await fetchAnswerHistogram(deckId);
        if (gen !== this.loadGen || this.reviewSync?.pendingCount()) return;
        this.histogram = histogram;
        this.gradeAvailable = true;
      } catch {
        if (gen === this.loadGen) this.gradeAvailable = false;
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
      if (this.$route.meta.preview) return;
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
    needsMoreFolderCards() {
      if (this.$route.meta.preview || !this.activeFolder || !this.deck) return false;
      if (this.cardTotal && this.cards.length >= this.cardTotal) return false;
      return this.visibleCards.length < 20;
    },
    async loadMoreCards() {
      if (this.$route.meta.preview || !this.deck?.id || this.cardsLoading) return;
      const requestId = ++this.cardsRequestId;
      this.cardsLoading = true;
      try {
        let guard = 0;
        do {
          const offset = this.cards.length;
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
          if (!page.cards.length) break;
          this.cards = this.cards.concat(page.cards);
          guard += 1;
        } while (this.needsMoreFolderCards() && guard < 50);
      } catch (error) {
        if (requestId !== this.cardsRequestId) return;
        this.error = error.message || this.$t('deck.cardsError');
      } finally {
        if (requestId === this.cardsRequestId) this.cardsLoading = false;
      }
    },
    syncInspectorWidth() {
      this.inspectorCanShow = canShowInspectorColumn(window.innerWidth);
    },
    setInspectorMode(mode) {
      this.inspectorMode = mode === 'edit' && this.deck?.canEdit ? 'edit' : 'view';
    },
    openCard(card) {
      if (!card) return;
      this.addingCard = false;
      this.inspectedCard = card;
      if (this.inspectorMode === 'edit' && !this.deck?.canEdit) {
        this.inspectorMode = 'view';
      }
    },
    closeInspector() {
      this.inspectedCard = null;
    },
    openAddCard() {
      this.closeInspector();
      this.addingCard = true;
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
      this.addingCard = false;
      if (this.inspectorMode === 'edit') this.closeInspector();
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
    onDeckDeleted() {
      this.settingsOpen = false;
      this.refreshAppSplit?.();
      this.$router.replace(this.listTo);
    },
    onProgressReset() {
      this.settingsOpen = false;
      this.statsPending = true;
      this.timePending = true;
      this.gradePending = true;
      this.seenPending = true;
      this.loadListStats(this.deck.id);
      this.loadTime(this.deck.id);
      this.loadGrade(this.deck.id);
      this.loadSeen(this.deck.id);
      this.resetAndLoadCards();
      this.refreshAppSplit?.();
    },
    onMagicImported() {
      this.statsPending = true;
      this.gradePending = true;
      this.seenPending = true;
      this.loadListStats(this.deck.id);
      this.loadGrade(this.deck.id);
      this.loadSeen(this.deck.id);
      this.resetAndLoadCards();
      this.refreshAppSplit?.();
    },
    async loadFolderCounts(deckId) {
      if (!deckId || this.$route.meta.preview) return;
      try {
        this.subdeckCounts = await fetchSubdeckCardCounts(deckId);
      } catch {
        this.subdeckCounts = {};
      }
    },
    openFolder(folder) {
      this.$router.push({ query: { ...this.$route.query, folder: String(folder.id) } });
    },
    leaveFolder() {
      const parent = parentOf(this.deckFolders, this.activeFolder);
      const query = { ...this.$route.query };
      if (!parent || parent.depth === 0) delete query.folder;
      else query.folder = String(parent.id);
      this.$router.push({ query });
    },
    folderErrorText(error) {
      const keys = {
        empty: 'deck.folderNameEmpty',
        invalid: 'deck.folderNameInvalid',
        exists: 'deck.folderAlreadyExists',
        path: 'deck.folderPathNotFound',
        content: 'deck.folderHasContent',
        depth: 'deck.folderTooDeep',
      };
      const key = error instanceof FolderEditError ? keys[error.code] : '';
      return key ? this.$t(key) : (error?.message || this.$t('study.actionError'));
    },
    async persistFolders(decks) {
      if (this.$route.meta.preview) {
        this.deck = { ...this.deck, decks };
        return;
      }
      this.foldersBusy = true;
      try {
        this.deck = await saveDeckFolders(this.deck, decks);
      } finally {
        this.foldersBusy = false;
      }
    },
    async createFolder({ parent, name }) {
      if (!this.deck || this.foldersBusy) return;
      try {
        const next = addFolder(this.deck.decks, parent.fullPath, name, this.deck.name);
        await this.persistFolders(next);
      } catch (error) {
        this.showActionToast(this.folderErrorText(error));
      }
    },
    async renameListedFolder({ folder, name }) {
      if (!this.deck || this.foldersBusy) return;
      try {
        const next = renameFolder(this.deck.decks, folder.id, name, this.deck.name);
        await this.persistFolders(next);
      } catch (error) {
        this.showActionToast(this.folderErrorText(error));
      }
    },
    async removeFolder(folder) {
      if (!this.deck || this.foldersBusy) return;
      try {
        const next = deleteFolder(this.deck.decks, folder.id, this.subdeckCounts, this.deck.name);
        await this.persistFolders(next);
        if (this.activeFolder && (
          this.activeFolder.id === folder.id
          || this.activeFolder.fullPath.startsWith(`${folder.fullPath}::`)
        )) {
          this.leaveFolder();
        }
      } catch (error) {
        this.showActionToast(this.folderErrorText(error));
      }
    },
    toggleCardMenu(cardId) {
      this.menuCardId = this.menuCardId === cardId ? null : cardId;
    },
    startCheckboxMode(card) {
      this.menuCardId = null;
      this.checkboxMode = true;
      this.selectedIds = card?.id ? { [card.id]: true } : {};
      this.selectionMoreOpen = false;
    },
    exitCheckboxMode() {
      this.checkboxMode = false;
      this.selectedIds = {};
      this.selectionMoreOpen = false;
      this.menuCardId = null;
      this.bulkAction = false;
    },
    onCardRowClick(card) {
      if (this.checkboxMode) {
        this.toggleCardSelected(card);
        return;
      }
      this.openCard(card);
    },
    toggleCardSelected(card) {
      const next = { ...this.selectedIds };
      if (next[card.id]) delete next[card.id];
      else next[card.id] = true;
      this.selectedIds = next;
    },
    async selectAllCards() {
      if (this.actionBusy) return;
      while (this.cards.length < this.cardTotal) {
        const before = this.cards.length;
        await this.loadMoreCards();
        if (this.cards.length <= before) break;
      }
      const next = {};
      for (const card of this.visibleCards) next[card.id] = true;
      this.selectedIds = next;
    },
    positionSelectionBar() {
      const page = this.$el;
      if (!page || !page.getBoundingClientRect) return;
      const rect = page.getBoundingClientRect();
      this.selectionBarStyle = {
        left: `${Math.max(0, rect.left)}px`,
        width: `${Math.max(0, rect.width)}px`,
      };
    },
    runSelectionAction(name) {
      this.selectionMoreOpen = false;
      if (name === 'move') this.openFolderPicker(null, { bulk: true });
      else if (name === 'move-to-deck') this.openDeckPicker(null, { bulk: true });
      else if (name === 'copy') this.copySelectedCards();
      else if (name === 'reverse') this.openReverse(null, { bulk: true });
    },
    selectionTooLarge(kind) {
      const count = this.selectedCards.length;
      if (count <= 100) return false;
      this.showActionToast(this.$t(kind === 'copy' ? 'deck.copyLimit' : 'deck.reverseLimit', { count }));
      return true;
    },
    editableSelection(cards) {
      if (cards.some((card) => !cardEditableOnWeb(card))) {
        this.showActionToast(this.$t('editor.lockedOcclusion'));
        return null;
      }
      return cards;
    },
    beginCardAction(card) {
      this.menuCardId = null;
      this.actionCard = card;
      this.actionError = '';
    },
    showActionToast(text) {
      this.clearActionToast();
      this.actionToast = text;
      this.actionToastTimer = window.setTimeout(() => {
        this.actionToast = '';
        this.actionToastTimer = 0;
      }, 2200);
    },
    clearActionToast() {
      if (this.actionToastTimer) clearTimeout(this.actionToastTimer);
      this.actionToastTimer = 0;
      this.actionToast = '';
    },
    editListedCard(card) {
      this.beginCardAction(card);
      if (!cardEditableOnWeb(card)) {
        this.showActionToast(this.$t('study.editLocked'));
        return;
      }
      this.addingCard = false;
      this.inspectedCard = card;
      this.inspectorMode = 'edit';
    },
    openFolderPicker(card, { bulk = false } = {}) {
      if (!this.deck) return;
      const cards = bulk ? this.selectedCards : [card];
      if (!cards.length) return;
      this.bulkAction = bulk;
      this.actionCards = cards;
      this.beginCardAction(cards[0]);
      this.actionFolders = parseDeckFolders(this.deck.decks, this.deck.name);
      this.folderSelectedId = folderById(this.actionFolders, cards[0].subdeckId)?.id
        ?? rootFolderId(this.actionFolders);
      this.folderPickerOpen = true;
    },
    async confirmMoveToFolder() {
      const cards = this.actionCards;
      if (!cards.length || !this.deck || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      try {
        await moveCardsToSubdeck(this.deck, cards, this.folderSelectedId);
        const subdeckId = Number(this.folderSelectedId) || 0;
        const ids = new Set(cards.map((card) => card.id));
        this.cards = this.cards.map((row) => (ids.has(row.id) ? { ...row, subdeckId } : row));
        if (this.inspectedCard && ids.has(this.inspectedCard.id)) {
          this.inspectedCard = { ...this.inspectedCard, subdeckId };
        }
        this.folderPickerOpen = false;
        if (this.bulkAction) this.exitCheckboxMode();
        this.showActionToast(cards.length > 1 ? this.$t('deck.movedMany') : this.$t('study.moved'));
      } catch (error) {
        this.actionError = error.message || this.$t('study.actionError');
      } finally {
        this.actionBusy = false;
      }
    },
    async openDeckPicker(card, { bulk = false } = {}) {
      if (!this.deck) return;
      const cards = bulk ? this.selectedCards : [card];
      if (!cards.length) return;
      this.bulkAction = bulk;
      this.actionCards = cards;
      this.beginCardAction(cards[0]);
      let decks = cachedDeckList();
      if (!decks) {
        try {
          decks = await fetchDeckList();
        } catch (error) {
          this.actionError = error.message || this.$t('study.actionError');
          this.otherDecks = [];
          this.deckPickerOpen = true;
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
      const cards = this.actionCards.length ? this.actionCards : (this.actionCard ? [this.actionCard] : []);
      if (!cards.length || !this.deck || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      const moved = [];
      try {
        for (const card of cards) {
          await moveCardToAnotherDeck(this.deck, card, targetDeck, subdeckId);
          moved.push(card.id);
        }
        this.removeListedCards(moved);
        this.deckPickerOpen = false;
        this.targetFolderOpen = false;
        if (this.bulkAction) this.exitCheckboxMode();
        this.showActionToast(cards.length > 1 ? this.$t('deck.movedMany') : this.$t('study.moved'));
      } catch (error) {
        if (moved.length) this.removeListedCards(moved);
        this.actionError = error.message || this.$t('study.actionError');
        if (!this.targetFolderOpen && !this.deckPickerOpen) {
          this.showActionToast(this.actionError);
        }
      } finally {
        this.actionBusy = false;
      }
    },
    async copySelectedCards() {
      const cards = this.editableSelection(this.selectedCards);
      if (!cards || !this.deck || this.actionBusy || this.selectionTooLarge('copy')) return;
      this.actionBusy = true;
      try {
        const copies = [];
        for (const card of cards) copies.push(await copyDeckCard(this.deck, card));
        this.noteCreatedCards(copies);
        this.exitCheckboxMode();
        this.showActionToast(cards.length > 1 ? this.$t('deck.copiedMany') : this.$t('deck.copied'));
      } catch (error) {
        this.showActionToast(error.message || this.$t('study.actionError'));
      } finally {
        this.actionBusy = false;
      }
    },
    async copyListedCard(card) {
      if (!this.deck || this.actionBusy) return;
      this.beginCardAction(card);
      if (!cardEditableOnWeb(card)) {
        this.showActionToast(this.$t('editor.lockedOcclusion'));
        return;
      }
      this.actionBusy = true;
      try {
        const copy = await copyDeckCard(this.deck, card);
        this.noteCreatedCards([copy]);
        this.showActionToast(this.$t('deck.copied'));
      } catch (error) {
        this.showActionToast(error.message || this.$t('study.actionError'));
      } finally {
        this.actionBusy = false;
      }
    },
    openReverse(card, { bulk = false } = {}) {
      const cards = bulk ? this.selectedCards : [card];
      if (!this.editableSelection(cards)) return;
      if (bulk && this.selectionTooLarge('reverse')) return;
      for (const row of cards) {
        const fields = reversedCardFields(row);
        if (!fields) {
          this.showActionToast(this.$t('deck.reverseUnavailable'));
          return;
        }
        if (containsClozeMarkup(fields[1])) {
          this.showActionToast(this.$t('editor.clozeFrontOnly'));
          return;
        }
      }
      this.bulkAction = bulk;
      this.actionCards = cards;
      this.beginCardAction(cards[0]);
      this.reverseOpen = true;
    },
    async confirmReverse() {
      const cards = this.actionCards;
      if (!cards.length || !this.deck || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      try {
        const reversed = [];
        for (const card of cards) reversed.push(await reverseDeckCard(this.deck, card));
        this.noteCreatedCards(reversed);
        this.reverseOpen = false;
        if (this.bulkAction) this.exitCheckboxMode();
        this.showActionToast(cards.length > 1 ? this.$t('deck.reversedMany') : this.$t('deck.reversed'));
      } catch (error) {
        this.actionError = error.message || this.$t('study.actionError');
      } finally {
        this.actionBusy = false;
      }
    },
    openDelete(card) {
      this.bulkAction = false;
      this.actionCards = [card];
      this.beginCardAction(card);
      this.deleteOpen = true;
    },
    openSelectionDelete() {
      const cards = this.selectedCards;
      if (!cards.length) return;
      this.bulkAction = true;
      this.actionCards = cards;
      this.beginCardAction(cards[0]);
      this.selectionMoreOpen = false;
      this.deleteOpen = true;
    },
    async confirmDelete() {
      const cards = this.actionCards;
      if (!cards.length || !this.deck || this.actionBusy) return;
      this.actionBusy = true;
      this.actionError = '';
      try {
        await deleteDeckCards(this.deck, cards);
        this.removeListedCards(cards.map((card) => card.id));
        this.deleteOpen = false;
        if (this.bulkAction) this.exitCheckboxMode();
        this.showActionToast(cards.length > 1 ? this.$t('deck.deletedMany') : this.$t('study.deleted'));
      } catch (error) {
        this.actionError = error.message || this.$t('study.actionError');
      } finally {
        this.actionBusy = false;
      }
    },
    noteCreatedCards(created) {
      const add = created.length;
      if (!add || !this.deck) return;
      this.deck = cacheDeck({ ...this.deck, cardCount: (this.deck.cardCount || 0) + add });
      if (isDefaultCardBrowseQuery(this.browseQuery)) {
        this.cards = created.concat(this.cards);
        this.cardTotal += add;
      } else {
        this.resetAndLoadCards();
      }
      this.statsPending = true;
      this.loadListStats(this.deck.id);
      this.refreshAppSplit?.();
    },
    removeListedCard(cardId) {
      this.removeListedCards([cardId]);
    },
    removeListedCards(cardIds) {
      const ids = new Set(cardIds);
      const removed = this.cards.filter((row) => ids.has(row.id)).length;
      this.cards = this.cards.filter((row) => !ids.has(row.id));
      if (removed && this.deck) {
        this.cardTotal = Math.max(0, this.cardTotal - removed);
        this.deck = cacheDeck({
          ...this.deck,
          cardCount: Math.max(0, (this.deck.cardCount || 0) - removed),
        });
      }
      if (this.inspectedCard && ids.has(this.inspectedCard.id)) this.closeInspector();
      if (Object.keys(this.selectedIds).some((id) => ids.has(id))) {
        const next = { ...this.selectedIds };
        for (const id of ids) delete next[id];
        this.selectedIds = next;
      }
      this.statsPending = true;
      this.loadListStats(this.deck?.id);
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
        if (this.inspectedCard?.id === card.id) this.inspectedCard = { ...this.inspectedCard, ...card };
      }
      if (!keepOpen) {
        this.addingCard = false;
        if (!this.paneEmbedded) this.closeInspector();
      }
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
.detail-page.selecting { padding-bottom: 112px; }
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
.folder-back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.folder-back svg { width: 18px; height: 18px; display: block; }
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
.cards { margin-top: 6px; padding-top: 0; padding-bottom: 8px; }
.browse-sticky {
  position: sticky;
  top: 0;
  z-index: 6;
  margin: 0 -28px 12px;
  padding: 12px 28px 0;
  background-color: var(--page-bg);
  background-image: none;
  box-shadow: 0 12px 18px -14px rgba(15, 23, 42, 0.28);
}
.cards-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.cards-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.browse-cancel {
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 4px;
}
.cards h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--title);
}
.mode-tabs {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 3px;
  border-radius: 10px;
  background: var(--inset-bg);
}
.mode-tabs button {
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
}
.mode-tabs button.on {
  background: var(--card-bg);
  color: var(--title);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}
.browse-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 0 0 12px;
  background: transparent;
}
.browse-bar.locked { opacity: 0.5; }
.browse-search {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
.view-all {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 2px;
  white-space: nowrap;
}
.view-all.active { font-weight: 700; }
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
  position: relative;
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid var(--card-list-border);
  background: var(--card-bg);
  border-radius: 20px;
  padding: 0;
  box-shadow: none;
  color: inherit;
  font: inherit;
  overflow: hidden;
}
.card-open {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 16px;
  box-shadow: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.card-row.has-menu .q,
.card-row.has-menu .card-tags {
  padding-right: 28px;
}
.card-row.selected,
.card-row.checked {
  border-color: var(--blue-button);
  box-shadow: 0 0 0 1px var(--blue-button);
}
.select-hit {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.select-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 1.5px solid color-mix(in srgb, var(--text) 40%, transparent);
  background: color-mix(in srgb, var(--card-bg) 88%, transparent);
  color: var(--button-text);
}
.select-box.on {
  background: var(--blue-button);
  border-color: var(--blue-button);
}
.select-box svg { width: 14px; height: 14px; display: block; }
.selection-backdrop {
  position: fixed;
  inset: 0;
  z-index: 39;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: default;
}
.selection-root {
  position: fixed;
  bottom: 0;
  z-index: 40;
}
.selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 6px 12px calc(6px + env(safe-area-inset-bottom));
  background: var(--card-bg);
  border-top: 0.5px solid color-mix(in srgb, var(--text) 14%, transparent);
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.08);
}
.bar-icon,
.bar-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  margin: 0;
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-size: 1.05rem;
  font-weight: 500;
  cursor: pointer;
}
.bar-icon :deep(.tabler-icon) { width: 24px; height: 24px; }
.bar-icon.danger,
.bar-icon.danger :deep(.tabler-icon) { color: #ff3b30; }
.bar-icon:disabled,
.bar-text:disabled { opacity: 0.4; cursor: default; }
.selection-menu {
  position: absolute;
  right: 8px;
  bottom: calc(100% + 8px);
  width: min(280px, calc(100% - 16px));
  padding: 6px;
  background: color-mix(in srgb, var(--card-bg) 88%, transparent);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 0.5px solid color-mix(in srgb, var(--text) 12%, transparent);
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(15, 23, 42, 0.22);
}
.selection-item {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px !important;
  border: 0 !important;
  border-radius: 8px !important;
  background: transparent !important;
  color: var(--title) !important;
  font: inherit !important;
  font-size: 1.0625rem !important;
  font-weight: 400 !important;
  text-align: left;
  cursor: pointer;
}
.selection-item :deep(.tabler-icon) { color: var(--text); }
.selection-item:hover { background: color-mix(in srgb, var(--text) 8%, transparent) !important; }
.skeleton-row { padding: 16px; }
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
:global(html[data-theme='dark']) .action-toast {
  background: #f8fafc;
  color: #0f172a;
}
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
  .browse-sticky {
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
