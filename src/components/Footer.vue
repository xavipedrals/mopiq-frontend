<template>
  <div class="footer-bar">
    <p class="copyright">{{ $t('common.copyright', { year }) }}</p>
    <ul class="footer-links">
      <li><router-link to="/privacy">{{ $t('common.privacy') }}</router-link></li>
      <li><router-link to="/terms">{{ $t('common.terms') }}</router-link></li>
      <li><a :href="helpUrl" target="_blank" rel="noopener">{{ $t('common.support') }}</a></li>
    </ul>
  </div>
</template>

<style scoped>
.footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 8px 0 24px;
}
.copyright {
  font-size: 0.9em;
  color: #64748b;
  margin: 0;
}
.footer-links {
  display: flex;
  gap: 16px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.footer-links a {
  font-size: 0.9em;
  color: #475569;
  text-decoration: none;
  font-weight: 600;
}
.footer-links a:hover { color: #0A7AFF; }
</style>

<script>
import { HELP_CENTER_URL } from '../constants';

export default {
  name: 'FooterComponent',
  data() {
    return { helpUrl: HELP_CENTER_URL };
  },
  computed: {
    year() {
      return new Date().getFullYear();
    },
  },
};
</script>
