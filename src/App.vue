<template>
  <div id="app">
    <router-view/>
    <CookieNotice />
  </div>
</template>

<style>
#app {
  width: 100%;
  max-width: 100%;
  overflow-x: clip;
}
</style>

<script>
import CookieNotice from './components/CookieNotice.vue';
import { i18nState } from './i18n';
import { applySeo } from './seo';

export default {
  name: 'App',
  components: { CookieNotice },
  computed: {
    locale() {
      return i18nState.locale;
    },
  },
  watch: {
    locale() {
      applySeo(this.$route);
    },
    $route: {
      immediate: true,
      handler(to) {
        applySeo(to);
      },
    },
  },
};
</script>
