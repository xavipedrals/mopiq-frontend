<template>
  <div class="welcome-page">
    <main>
      <h1>You're in</h1>
      <p>Mopiq Flashcards Pro is ready on this account.</p>
      <router-link to="/decks" @click="completeWelcome">Go to your decks</router-link>
    </main>
  </div>
</template>

<script>
import { trackProductEvent } from '../analytics';

export default {
  name: 'WelcomePage',
  mounted() {
    void trackProductEvent('onboarding_welcome_shown');
  },
  methods: {
    completeWelcome() {
      void trackProductEvent('onboarding_welcome_completed');
    },
  },
};
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--page-bg);
  color: var(--text);
  text-align: center;
  padding: 24px;
}
h1 { color: var(--title); margin-bottom: 8px; }
a { color: var(--blue-button); font-weight: 700; }
</style>
