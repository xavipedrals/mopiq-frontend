import { reactive } from 'vue';
import { formatJoinedDate as formatJoinedDateValue } from '../profile/experience';
import {
  APP_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  detectBrowserLanguage,
  matchAppLanguage,
} from './languages';
import de from './messages/de';
import en from './messages/en';
import es from './messages/es';
import fr from './messages/fr';
import it from './messages/it';
import ja from './messages/ja';
import pt from './messages/pt';

const CATALOGS = { en, es, pt, fr, it, ja, de };

const state = reactive({
  preference: readStoredPreference(),
  locale: DEFAULT_LANGUAGE,
});

state.locale = resolveLocale(state.preference);

function readStoredPreference() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'system' || stored === '') return null;
    return matchAppLanguage(stored);
  } catch {
    return null;
  }
}

function persistPreference(code) {
  try {
    if (!code) localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    else localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // ignore
  }
}

function resolveLocale(preference) {
  return preference || detectBrowserLanguage();
}

function applyDocumentLang(locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
}

applyDocumentLang(state.locale);

function lookup(messages, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), messages);
}

export function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, name) => (
    params[name] == null ? `{${name}}` : String(params[name])
  ));
}

export function t(key, params) {
  const locale = state.locale;
  const raw = lookup(CATALOGS[locale], key) ?? lookup(en, key) ?? key;
  return interpolate(raw, params);
}

export function getLocale() {
  return state.locale;
}

export function localeTag(locale = state.locale) {
  return locale === 'pt' ? 'pt-BR' : locale;
}

export function getLanguagePreference() {
  return state.preference;
}

export function setLanguagePreference(code) {
  const matched = code ? matchAppLanguage(code) : null;
  state.preference = matched;
  state.locale = resolveLocale(matched);
  persistPreference(matched);
  applyDocumentLang(state.locale);
  return state.locale;
}

/** iOS adoptFromProfileIfNeeded: only when this device has no override. */
export function adoptFromProfileIfNeeded(locale) {
  if (state.preference) return false;
  const matched = matchAppLanguage(locale);
  if (!matched) return false;
  setLanguagePreference(matched);
  return true;
}

export function localeForProfileSync() {
  return state.preference || detectBrowserLanguage();
}

export function formatJoinedDate(value, locale = state.locale) {
  return formatJoinedDateValue(value, locale);
}

export function translateTopic(topic) {
  const slug = String(topic?.imageName || topic?.name || '').toLowerCase();
  if (!slug) return '';
  const raw = lookup(CATALOGS[state.locale], `topics.${slug}`) ?? lookup(en, `topics.${slug}`);
  return raw || topic?.name || topic?.label || '';
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { APP_LANGUAGES, state as i18nState };

export function createI18nPlugin() {
  return {
    install(app) {
      app.config.globalProperties.$t = (key, params) => {
        void state.locale;
        return t(key, params);
      };
      app.config.globalProperties.$topic = (topic) => {
        void state.locale;
        return translateTopic(topic);
      };
      app.config.globalProperties.$i18n = state;
      app.provide('i18n', state);
    },
  };
}
