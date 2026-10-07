export const APP_LANGUAGES = [
  { code: 'en', nativeName: 'English', flag: '/flags/en.png' },
  { code: 'es', nativeName: 'Español', flag: '/flags/es.png' },
  { code: 'pt', nativeName: 'Português', flag: '/flags/pt.png' },
  { code: 'fr', nativeName: 'Français', flag: '/flags/fr.png' },
  { code: 'it', nativeName: 'Italiano', flag: '/flags/it.png' },
  { code: 'ja', nativeName: '日本語', flag: '/flags/ja.png' },
  { code: 'de', nativeName: 'Deutsch', flag: '/flags/de.png' },
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
