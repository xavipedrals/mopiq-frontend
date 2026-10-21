<template>
  <div v-if="visible" class="cookie-notice" role="dialog" aria-labelledby="cookie-title">
    <p id="cookie-title">
      {{ $t('common.cookieBody') }}
      <router-link to="/privacy">{{ $t('common.privacy') }}</router-link>
    </p>
    <div class="cookie-actions">
      <button type="button" class="cookie-refuse" @click="choose('denied')">{{ $t('common.cookieRefuse') }}</button>
      <button type="button" class="cookie-allow" @click="choose('granted')">{{ $t('common.cookieAllow') }}</button>
    </div>
  </div>
</template>

<script>
import { readAnalyticsConsent, setAnalyticsConsent } from '../analytics';

export default {
  name: 'CookieNotice',
  data() {
    return { visible: false };
  },
  mounted() {
    this.visible = readAnalyticsConsent() == null;
  },
  methods: {
    choose(value) {
      setAnalyticsConsent(value);
      this.visible = false;
    },
  },
};
</script>

<style scoped>
.cookie-notice {
  position: fixed;
  z-index: 80;
  left: 16px;
  right: 16px;
  bottom: 16px;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
}
.cookie-notice p {
  flex: 1 1 280px;
  margin: 0;
  color: var(--text);
  font-size: 0.95rem;
  line-height: 1.45;
}
.cookie-notice a {
  color: var(--blue-button);
  font-weight: 600;
}
.cookie-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.cookie-actions button {
  border-radius: 999px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
}
.cookie-refuse {
  background: transparent;
  color: var(--title);
  border: 1px solid var(--search-border);
}
.cookie-allow {
  background: var(--blue-button);
  color: var(--button-text);
  border: 1px solid var(--blue-button);
}
</style>
