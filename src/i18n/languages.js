export const APP_LANGUAGES = [
  { code: 'en', nativeName: 'English', flag: '/flags/en.png' },
  { code: 'es', nativeName: 'Español', flag: '/flags/es.png' },
  { code: 'pt', nativeName: 'Português', flag: '/flags/pt.png' },
  { code: 'fr', nativeName: 'Français', flag: '/flags/fr.png' },
  { code: 'it', nativeName: 'Italiano', flag: '/flags/it.png' },
  { code: 'ja', nativeName: '日本語', flag: '/flags/ja.png' },
  { code: 'de', nativeName: 'Deutsch', flag: '/flags/de.png' },
  { code: 'nb', nativeName: 'Norsk bokmål', flag: '/flags/nb.png' },
  { code: 'nl', nativeName: 'Nederlands', flag: '/flags/nl.png' },
  { code: 'sv', nativeName: 'Svenska', flag: '/flags/sv.png' },
  { code: 'he', nativeName: 'עברית', flag: '/flags/he.png' },
  { code: 'fi', nativeName: 'Suomi', flag: '/flags/fi.png' },
  { code: 'da', nativeName: 'Dansk', flag: '/flags/da.png' },
  { code: 'zh-Hans', nativeName: '简体中文', flag: '/flags/zh-Hans.png' },

];

const BY_CODE = Object.fromEntries(APP_LANGUAGES.map((language) => [language.code, language]));

export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'mopiq-language';

/** Same mapping as iOS AppLanguage.matchingProfileLocale. */
export function matchAppLanguage(locale) {
  const trimmed = String(locale || '').trim();
  if (!trimmed) return null;
  if (BY_CODE[trimmed]) return trimmed;
  switch (trimmed) {
    case 'no':
    case 'no-NO':
      return 'nb';
    case 'zh':
    case 'zh-CN':
    case 'zh-SG':
      return 'zh-Hans';
    case 'iw':
      return 'he';
    case 'es-419':
      return 'es';
    case 'pt-PT':
    case 'pt-BR':
      return 'pt';
    case 'fr-CA':
      return 'fr';
    default:
      break;
  }
  const base = trimmed.split(/[-_]/)[0].toLowerCase();
  if (base === 'zh' && !/hant|tw|hk|mo/i.test(trimmed)) return 'zh-Hans';
  if (base === 'no') return 'nb';
  if (base === 'iw') return 'he';
  if (BY_CODE[base]) return base;
  return null;
}

export function detectBrowserLanguage() {
  const candidates = [];
  if (typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    if (navigator.language) candidates.push(navigator.language);
  }
  for (const candidate of candidates) {
    const matched = matchAppLanguage(candidate);
    if (matched) return matched;
  }
  return DEFAULT_LANGUAGE;
}
