import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';
import { initTheme } from './theme/theme';
import { createI18nPlugin } from './i18n';
import './auth/session';

initTheme();

createApp(App).use(router).use(createI18nPlugin()).mount('#app');
