<template>
  <div class="shell">
    <div class="container-xl">
      <AppHeader />
      <div class="page">
        <div class="title-row">
          <h1>{{ $t('decks.title') }}</h1>
          <button type="button" class="mopiq-btn add-deck" @click="addOpen = true">
            {{ $t('decks.add') }}
          </button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-else-if="showSkeleton" class="deck-list" aria-busy="true">
          <div v-for="n in 4" :key="n" class="deck-card">
            <div class="grow">
              <SkeletonBlock w="88px" h="0.7rem" radius="5px" />
              <SkeletonBlock class="title-line" w="min(240px, 68%)" h="1.35rem" radius="8px" />
              <SkeletonBlock class="meta-line" w="96px" h="0.9rem" radius="5px" />
            </div>
            <div class="right">
              <SkeletonBlock w="56px" h="56px" radius="14px" />
              <SkeletonBlock w="74px" h="22px" radius="999px" />
            </div>
          </div>
        </div>
        <p v-else-if="decks.length === 0" class="empty" v-html="emptyHtml"></p>
        <div v-else class="deck-list">
          <router-link
            v-for="deck in decks"
            :key="deck.id"
            :to="`/decks/${deck.id}`"
            class="deck-card"
          >
            <div>
              <div class="topic" :style="{ color: deck.topic.color }">{{ $topic(deck.topic) }}</div>
              <h2>{{ deck.name }}</h2>
              <div class="meta">{{ $t('decks.cards', { count: deck.cardCount }) }}</div>
              <div v-if="deck.statsAvailable" class="today">
                {{ $t('decks.dueToday', { count: deck.cardsForToday }) }}
              </div>
            </div>
            <div class="right">
              <div class="icon" :style="{ background: deck.topic.backgroundColor }">
                <img :src="`/topics/${deck.topic.imageName}.svg`" alt="">
              </div>
              <span v-if="!deck.canStudy" class="badge">{{ $t('decks.studyInApp') }}</span>
              <span v-else class="badge study">{{ $t('decks.webStudy') }}</span>
            </div>
          </router-link>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="addOpen"
        class="sheet-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-deck-title"
        @keydown.esc="addOpen = false"
      >
        <button type="button" class="sheet-backdrop" :aria-label="$t('common.close')" @click="addOpen = false"></button>
        <section class="sheet">
          <h2 id="add-deck-title">{{ $t('decks.addTitle') }}</h2>
          <p>{{ $t('decks.addBody') }}</p>
          <a class="mopiq-btn" :href="storeUrl" target="_blank" rel="noopener">{{ $t('common.getMopiqStore') }}</a>
          <button type="button" class="text-close" @click="addOpen = false">{{ $t('common.close') }}</button>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script>
import AppHeader from './AppHeader.vue';
import SkeletonBlock from './SkeletonBlock.vue';
import { fetchDeckList } from '../api/mopiq';
import { cachedDeckList } from '../api/deckCache';
import { APP_STORE_URL } from '../constants';
import { escapeHtml } from '../i18n';

export default {
  name: 'DecksPage',
  components: { AppHeader, SkeletonBlock },
  data() {
    return {
      pending: true,
      error: '',
      decks: cachedDeckList() || [],
      addOpen: false,
      storeUrl: APP_STORE_URL,
    };
  },
  computed: {
    showSkeleton() {
      return this.pending && this.decks.length === 0;
    },
    emptyHtml() {
      const app = `<a href="${this.storeUrl}" target="_blank" rel="noopener">${escapeHtml(this.$t('common.app'))}</a>`;
      return this.$t('decks.empty', { app });
    },
  },
  async created() {
    try {
      this.decks = await fetchDeckList();
    } catch (error) {
      if (this.decks.length === 0) this.error = error.message || this.$t('decks.loadError');
    } finally {
      this.pending = false;
    }
  },
};
</script>

<style scoped>
.page { padding-bottom: 48px; }
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 8px 0 24px;
  text-align: left;
}
h1 { font-size: 2rem; font-weight: 700; color: var(--title); }
.add-deck {
  flex: 0 0 auto;
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
  font-weight: 600 !important;
  padding: 10px 18px !important;
  white-space: nowrap;
}
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.sheet-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  padding: 0;
  background: rgba(15, 23, 42, 0.5);
  cursor: pointer;
}
.sheet {
  position: relative;
  width: min(420px, 100%);
  padding: 28px 24px 24px;
  background: var(--card-bg);
  border-radius: 24px;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.28);
  text-align: center;
}
.sheet h2 {
  margin: 0 0 12px;
  font-size: 1.45rem;
  font-weight: 750;
  color: var(--title);
}
.sheet p {
  margin: 0 0 20px;
  color: var(--text);
  line-height: 1.45;
}
.sheet .mopiq-btn {
  display: inline-block;
  background: var(--blue-button) !important;
  color: var(--button-text) !important;
  border: none !important;
  font-weight: 600 !important;
  padding: 12px 24px !important;
  text-decoration: none;
}
.text-close {
  display: block;
  width: 100%;
  margin-top: 14px;
  border: 0;
  background: transparent;
  color: var(--blue-button);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.error { color: var(--error); }
.empty { color: var(--text); }
.empty a { color: var(--blue-button); }
.deck-list { display: grid; gap: 14px; }
.deck-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  border-radius: 20px;
  padding: 20px 24px;
  text-decoration: none;
  color: inherit;
  text-align: left;
}
.topic {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.grow { flex: 1 1 auto; min-width: 0; }
.title-line { margin: 9px 0 10px; }
.meta-line { margin-bottom: 4px; }
h2 { font-size: 1.35rem; font-weight: 700; color: var(--title); margin: 0 0 6px; }
.meta, .today { color: var(--text-secondary); font-size: 0.95rem; }
.right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}
.icon img { width: 100%; }
.badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--badge-app-text);
  background: var(--badge-app-bg);
  border-radius: 999px;
  padding: 4px 10px;
  white-space: nowrap;
}
.badge.study {
  color: var(--badge-web-text);
  background: var(--badge-web-bg);
}
@media (max-width: 640px) {
  .title-row { flex-direction: column; align-items: stretch; }
  .add-deck { align-self: flex-start; }
}
</style>
