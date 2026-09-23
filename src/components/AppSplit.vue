<template>
  <div class="split-root" :class="{ 'is-list': isListRoute, 'is-detail': !isListRoute, 'has-inspector': inspectorOpen }">
    <aside class="sidebar" :aria-label="$t('decks.title')">
      <div class="sidebar-top">
        <router-link
          :to="profileTo"
          class="profile-card"
          :class="{ selected: isProfile }"
        >
          <img
            class="avatar"
            :src="avatarSrc"
            alt=""
            @error="onAvatarError"
          >
          <div class="profile-copy">
            <div class="profile-name">{{ profileName }}</div>
            <div class="profile-level">{{ $t('profile.level', { level: profileLevel }) }}</div>
          </div>
        </router-link>
        <a
          class="download-row"
          :href="storeUrl"
          target="_blank"
          rel="noopener"
        >
          <svg class="download-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="2.5" width="10" height="19" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M12 7.5v6.2M9.6 11.4L12 13.8l2.4-2.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 18.2h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span>{{ $t('common.downloadApp') }}</span>
        </a>
        <label class="search ios-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M16 16l4.2 4.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input
            v-model="searchText"
            type="search"
            :placeholder="$t('decks.search')"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
          >
          <button
            v-if="searchText"
            type="button"
            class="search-clear"
            :aria-label="$t('common.clear')"
            @click="searchText = ''"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
            </svg>
          </button>
        </label>
      </div>
      <div class="sidebar-list">
        <p v-if="error" class="error">{{ error }}</p>
        <div v-else-if="showSkeleton" class="deck-rows" aria-busy="true">
          <div v-for="n in 5" :key="n" class="deck-row skeleton">
            <SkeletonBlock class="topic-icon" w="36px" h="36px" radius="10px" />
            <div class="deck-copy">
              <SkeletonBlock w="72%" h="1.05rem" radius="6px" />
              <SkeletonBlock w="54%" h="0.9rem" radius="5px" />
            </div>
          </div>
        </div>
        <p v-else-if="decks.length === 0" class="empty">{{ $t('decks.empty') }}</p>
        <p v-else-if="visibleDecks.length === 0" class="empty">{{ $t('decks.noSearchMatches') }}</p>
        <div v-else class="deck-rows">
          <router-link
            v-for="deck in visibleDecks"
            :key="deck.id"
            :to="deckTo(deck.id)"
            class="deck-row"
            :class="{ selected: selectedDeckId === deck.id }"
          >
            <div
              class="topic-icon"
              :class="{ bordered: selectedDeckId === deck.id }"
              :style="topicIconStyle(deck)"
            >
              <span class="topic-glyph" aria-hidden="true" />
            </div>
            <div class="deck-copy">
              <div class="deck-name">{{ deck.name }}</div>
              <div class="deck-sub">{{ deckSubtitle(deck) }}</div>
            </div>
          </router-link>
        </div>
      </div>
      <div class="sidebar-add">
        <button type="button" class="add-btn" @click="addOpen = true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
          {{ $t('decks.addADeck') }}
        </button>
      </div>
    </aside>
    <main class="detail-pane">
      <router-view />
    </main>
    <aside
      id="browse-inspector"
      class="inspector-pane"
      :class="{ open: inspectorOpen }"
      :aria-hidden="inspectorOpen ? 'false' : 'true'"
    ></aside>
    <CreateDeckSheet
      :open="addOpen"
      @dismiss="addOpen = false"
      @created="onDeckCreated"
      @queued="onDeckQueued"
    />
  </div>
</template>

<script>
import CreateDeckSheet from './Decks.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import { fetchDeckList, fetchUserProfile } from '../api/mopiq';
import { cachedDeckList } from '../api/deckCache';
import { getAvatarImageName, sidebarTablerIconUrl } from '../utils';
import { getLevelAndPercentage } from '../profile/experience';
import { APP_STORE_URL } from '../constants';

export default {
  name: 'AppSplit',
  components: { CreateDeckSheet, SkeletonBlock },
  provide() {
    return {
      refreshAppSplit: () => this.refreshDecks(),
      setInspectorOpen: (open) => { this.inspectorOpen = Boolean(open); },
    };
  },
  data() {
    return {
      pending: true,
      error: '',
      decks: cachedDeckList() || [],
      searchText: '',
      addOpen: false,
      avatarFailed: false,
      profile: null,
      storeUrl: APP_STORE_URL,
      inspectorOpen: false,
    };
  },
  computed: {
    isPreview() {
      return Boolean(this.$route.meta.preview);
    },
    isListRoute() {
      return this.$route.name === 'decks' || this.$route.path === '/dev/split';
    },
    isProfile() {
      return this.$route.name === 'profile' || this.$route.path === '/dev/split/profile';
    },
    profileTo() {
      return this.isPreview ? '/dev/split/profile' : '/profile';
    },
    selectedDeckId() {
      return this.$route.params.deckId || '';
    },
    showSkeleton() {
      return this.pending && this.decks.length === 0;
    },
    visibleDecks() {
      const query = this.searchText.trim().toLowerCase();
      if (!query) return this.decks;
      return this.decks.filter((deck) => (deck.name || '').toLowerCase().includes(query));
    },
    profileName() {
      return this.profile?.name || this.$t('nav.profile');
    },
    profileLevel() {
      return getLevelAndPercentage(this.profile?.experience || 0).level;
    },
    avatarSrc() {
      if (this.avatarFailed) return getAvatarImageName(this.profile?.avatarNumber || 0);
      return this.profile?.avatarUrl || getAvatarImageName(this.profile?.avatarNumber || 0);
    },
  },
  watch: {
    selectedDeckId() {
      this.inspectorOpen = false;
    },
    isListRoute(isList) {
      if (isList) this.inspectorOpen = false;
    },
  },
  async created() {
    if (this.isPreview) {
      this.applyPreview();
      return;
    }
    this.loadProfile();
    await this.refreshDecks();
  },
  methods: {
    topicIconStyle(deck) {
      return {
        background: deck.topic?.backgroundColor,
        '--topic-tint': deck.topic?.color,
        '--tabler-src': `url("${sidebarTablerIconUrl(deck.topic?.imageName)}")`,
      };
    },
    deckTo(id) {
      return this.isPreview ? `/dev/split/${id}` : `/decks/${id}`;
    },
    applyPreview() {
      this.pending = false;
      this.profile = { name: 'Alex', experience: 4200, avatarNumber: 3, avatarUrl: getAvatarImageName(3) };
      this.decks = [
        {
          id: 'preview',
          name: 'UK Prime Ministers',
          cardCount: 53,
          statsAvailable: true,
          cardsForToday: 12,
          topic: { color: '#D97706', backgroundColor: '#FEF3C7', imageName: 'history' },
        },
        {
          id: 'spanish',
          name: 'Spanish verbs',
          cardCount: 180,
          statsAvailable: true,
          cardsForToday: 24,
          topic: { color: '#D97706', backgroundColor: '#FEF3C7', imageName: 'languages' },
        },
        {
          id: 'anatomy',
          name: 'Anatomy',
          cardCount: 640,
          statsAvailable: true,
          cardsForToday: 40,
          topic: { color: '#65A30D', backgroundColor: '#ECFCCB', imageName: 'anatomy' },
        },
      ];
    },
    deckSubtitle(deck) {
      const count = deck.cardCount || 0;
      if (deck.statsAvailable) {
        const due = count > 0 ? Math.min(deck.cardsForToday || 0, count) : (deck.cardsForToday || 0);
        return this.$t('decks.cardsAndDue', { count, due });
      }
      return this.$t('decks.cards', { count });
    },
    syncFromCache() {
      const cached = cachedDeckList();
      if (cached) this.decks = cached;
    },
    async refreshDecks() {
      this.syncFromCache();
      try {
        this.decks = await fetchDeckList();
        this.error = '';
      } catch (error) {
        if (this.decks.length === 0) this.error = error.message || this.$t('decks.loadError');
      } finally {
        this.pending = false;
      }
    },
    async loadProfile() {
      try {
        this.profile = await fetchUserProfile();
      } catch {
        this.profile = null;
      }
    },
    onAvatarError() {
      this.avatarFailed = true;
    },
    onDeckQueued() {
      this.syncFromCache();
    },
    async onDeckCreated(deck) {
      this.addOpen = false;
      this.syncFromCache();
      await this.$router.push(`/decks/${deck.id}`);
      this.refreshDecks();
    },
  },
};
</script>

<style scoped>
.split-root {
  display: flex;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  background: var(--list-bg);
  color: var(--title);
}
.sidebar {
  flex: 0 0 400px;
  width: 400px;
  min-width: 320px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--list-bg);
  border-right: 1px solid var(--split-rule);
}
.sidebar-top {
  flex: 0 0 auto;
  padding: 12px 0 4px;
}
.profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 12px 6px;
  padding: 10px 12px;
  text-decoration: none;
  color: inherit;
  background: var(--card-bg);
  border-radius: 24px;
  box-shadow: 0 0 0 1px transparent;
}
.profile-card.selected {
  box-shadow: 0 0 0 1px var(--split-selected-ring);
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--inset-bg);
  flex: 0 0 auto;
}
.profile-copy { min-width: 0; }
.profile-name {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.profile-level {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.25;
}
.download-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 8px 2px;
  padding: 10px 18px;
  border-radius: 16px;
  text-decoration: none;
  color: var(--blue-button);
  font-size: 1.0625rem;
  font-weight: 600;
}
.download-row:hover { background: var(--list-selected); }
.download-icon {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
}
.deck-row.selected {
  background: var(--list-selected);
}
.search {
  margin: 8px 18px 4px;
}
.sidebar-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
.deck-rows { padding: 4px 0 8px; }
.deck-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 8px;
  padding: 10px;
  border-radius: 13px;
  text-decoration: none;
  color: inherit;
}
.deck-row.skeleton { pointer-events: none; }
.topic-icon {
  width: 36px;
  height: 36px;
  margin: 4px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-shadow: 0 0 0 0 transparent;
}
.topic-icon.bordered {
  box-shadow: 0 0 0 2px var(--topic-tint, var(--blue-button));
}
html[data-theme="dark"] .topic-icon.bordered {
  box-shadow: none;
}
.topic-glyph {
  width: 24px;
  height: 24px;
  display: block;
  background-color: var(--topic-tint, currentColor);
  -webkit-mask-image: var(--tabler-src);
  mask-image: var(--tabler-src);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}
.deck-copy {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.deck-name {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.deck-sub {
  font-size: 1rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.empty, .error {
  margin: 24px 22px;
  color: var(--text);
  line-height: 1.45;
  text-align: center;
}
.error { color: var(--error); }
.sidebar-add {
  flex: 0 0 auto;
  padding: 0 18px 12px;
  background: var(--list-bg);
}
.sidebar-add::before {
  content: "";
  display: block;
  height: 1px;
  background: var(--split-rule);
  margin: 0 -18px 12px;
}
.add-btn {
  width: 100%;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  background: var(--blue-button);
  color: var(--button-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.add-btn svg { width: 18px; height: 18px; }
.add-btn:hover { background: var(--blue-button-hover); }
.detail-pane {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background-color: var(--page-bg);
  background-image: none;
}
.inspector-pane {
  display: none;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--card-bg);
  border-left: 1px solid var(--split-rule);
}
.inspector-pane.open {
  display: flex;
  flex-direction: column;
}
.inspector-pane.open > * {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}
.split-root.has-inspector {
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(260px, 1fr) minmax(480px, 1fr);
}
.split-root.has-inspector .sidebar {
  flex: none;
  width: auto;
  min-width: 0;
  max-width: none;
}
.split-root.has-inspector .detail-pane {
  flex: none;
}
@media (max-width: 899px) {
  .sidebar {
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    max-width: none;
    border-right: 0;
  }
  .split-root.is-list .detail-pane { display: none; }
  .split-root.is-detail .sidebar { display: none; }
  .split-root.has-inspector {
    display: flex;
    grid-template-columns: none;
  }
  .inspector-pane,
  .inspector-pane.open { display: none; }
}
</style>
