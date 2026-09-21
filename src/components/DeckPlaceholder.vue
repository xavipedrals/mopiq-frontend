<template>
  <div class="placeholder">
    <svg v-if="isLibrary" class="glyph" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="11" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <rect x="9.5" y="3.5" width="11" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    </svg>
    <svg v-else class="glyph" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6.5" width="13" height="10" rx="1.6" transform="rotate(-12 9.5 11.5)" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <rect x="8" y="5" width="13" height="10" rx="1.6" transform="rotate(10 14.5 10)" fill="none" stroke="currentColor" stroke-width="1.5"/>
    </svg>
    <h1>{{ isLibrary ? $t('decks.premadeTitle') : $t('decks.selectTitle') }}</h1>
    <p>{{ isLibrary ? $t('decks.premadeBody') : $t('decks.selectBody') }}</p>
    <a
      v-if="isLibrary"
      class="store"
      :href="storeUrl"
      target="_blank"
      rel="noopener"
    >
      <button type="button" class="mopiq-btn">{{ $t('common.downloadApp') }}</button>
    </a>
    <router-link v-if="showBack" :to="listTo" class="back">{{ $t('decks.title') }}</router-link>
  </div>
</template>

<script>
import { APP_STORE_URL } from '../constants';

export default {
  name: 'DeckPlaceholder',
  data() {
    return { storeUrl: APP_STORE_URL };
  },
  computed: {
    isLibrary() {
      return this.$route.path === '/library' || this.$route.path.endsWith('/library');
    },
    showBack() {
      return this.isLibrary;
    },
    listTo() {
      return this.$route.path.startsWith('/dev/split') ? '/dev/split' : '/decks';
    },
  },
};
</script>

<style scoped>
.placeholder {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 32px;
  background: var(--page-bg);
}
.glyph {
  width: 64px;
  height: 64px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--title);
}
p {
  margin: 8px 0 0;
  max-width: 28rem;
  font-size: 1rem;
  line-height: 1.45;
  color: var(--text-secondary);
}
.store { margin-top: 24px; }
.back {
  display: none;
  margin-top: 28px;
  color: var(--blue-button);
  text-decoration: none;
  font-weight: 600;
}
@media (max-width: 899px) {
  .back { display: inline-flex; align-items: center; }
}
</style>
