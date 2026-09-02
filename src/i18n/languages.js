export const APP_LANGUAGES = [
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'de', nativeName: 'Deutsch' },
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
