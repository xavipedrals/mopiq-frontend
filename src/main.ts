import { createApp } from 'vue';
import { browserTracingIntegration, init as initSentry } from '@sentry/vue';
import App from './App.vue';
import router from './router';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';
import { initTheme } from './theme/theme';
import { createI18nPlugin } from './i18n';
import './auth/session';

const app = createApp(App);
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  initSentry({
    app,
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    integrations: [browserTracingIntegration({ router })],
    tracesSampleRate: 0.1,
    // The site's APIs are not part of this Sentry integration.
    tracePropagationTargets: [],
    beforeBreadcrumb(breadcrumb) {
      return breadcrumb.category === 'console' ? null : breadcrumb;
    },
  });
}

initTheme();

app.use(router).use(createI18nPlugin()).mount('#app');
