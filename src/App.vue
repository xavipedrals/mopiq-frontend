<template>
  <div id="app">
    <router-view/>
  </div>
</template>

<style>
#app {
  width: 100%;
}
</style>

<script>
import { i18nState } from './i18n';
import { applySeo } from './seo';

export default {
  name: 'App',
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
