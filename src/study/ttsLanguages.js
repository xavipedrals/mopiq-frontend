import { matchAppLanguage } from '../i18n/languages.js';

/** Same cap as iOS `getTextToSpeech` (`text.count < 300`). */
export const TTS_MAX_CHARS = 299;

/** Same picker as iOS `LemonFoxApiLanguage.allCases`. */
export const TTS_LANGUAGES = [
  { code: 'en', nativeName: 'English', emoji: '🇺🇸' },
  { code: 'ja', nativeName: '日本語', emoji: '🇯🇵' },
  { code: 'es-ES', nativeName: 'Español', emoji: '🇪🇸' },
  { code: 'zh', nativeName: '中文', emoji: '🇨🇳' },
  { code: 'fr', nativeName: 'Français', emoji: '🇫🇷' },
  { code: 'pt-BR', nativeName: 'Português', emoji: '🇧🇷' },
  { code: 'it', nativeName: 'Italiano', emoji: '🇮🇹' },
  { code: 'hi', nativeName: 'हिन्दी', emoji: '🇮🇳' },
  { code: 'de', nativeName: 'Deutsch', emoji: '🇩🇪' },
  { code: 'ko', nativeName: '한국어', emoji: '🇰🇷' },
  { code: 'ru', nativeName: 'Русский', emoji: '🇷🇺' },
  { code: 'ar-SA', nativeName: 'العربية', emoji: '🇸🇦' },
  { code: 'bn', nativeName: 'বাংলা', emoji: '🇧🇩' },
  { code: 'id', nativeName: 'Bahasa Indonesia', emoji: '🇮🇩' },
  { code: 'tr', nativeName: 'Türkçe', emoji: '🇹🇷' },
  { code: 'vi', nativeName: 'Tiếng Việt', emoji: '🇻🇳' },
];

export function defaultTtsLanguage(locale) {
  switch (matchAppLanguage(locale) || locale) {
    case 'es':
      return 'es-ES';
    case 'pt':
      return 'pt-BR';
    case 'fr':
      return 'fr';
    case 'de':
      return 'de';
    case 'it':
      return 'it';
    case 'ja':
      return 'ja';
    default:
      return 'en';
  }
}
