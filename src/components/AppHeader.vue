<template>
  <header class="app-header">
    <router-link to="/decks" class="brand">
      <img src="/logo-small.svg" alt="">
      {{ $t('common.brand') }}
    </router-link>
    <nav class="nav">
      <router-link to="/decks">{{ $t('nav.myDecks') }}</router-link>
      <router-link to="/profile">{{ $t('nav.profile') }}</router-link>
      <a :href="storeUrl" target="_blank" rel="noopener">{{ $t('common.getTheApp') }}</a>
    </nav>
  </header>
</template>

<script>
import { APP_STORE_URL } from '../constants';

export default {
  name: 'AppHeader',
  data() {
    return { storeUrl: APP_STORE_URL };
  },
};
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--blue-button);
  font-size: 1.2rem;
  font-weight: 500;
  text-decoration: none;
}
.brand img {
  width: 28px;
  height: 28px;
}
.nav {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.nav a {
  color: var(--text);
  text-decoration: none;
  font-size: 0.95rem;
}
.nav a:hover {
  color: var(--blue-button);
}
.nav a.router-link-active {
  color: var(--blue-button);
  font-weight: 600;
}
.nav a.router-link-exact-active {
  color: var(--blue-button);
  font-weight: 600;
}
</style>
