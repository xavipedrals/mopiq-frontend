import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultTtsLanguage, TTS_LANGUAGES, TTS_MAX_CHARS } from './ttsLanguages.js';

describe('defaultTtsLanguage', () => {
  it('maps app locales to the iOS TTS codes', () => {
    assert.equal(defaultTtsLanguage('en'), 'en');
    assert.equal(defaultTtsLanguage('es'), 'es-ES');
    assert.equal(defaultTtsLanguage('es-419'), 'es-ES');
    assert.equal(defaultTtsLanguage('pt-BR'), 'pt-BR');
    assert.equal(defaultTtsLanguage('ja'), 'ja');
  });
});

describe('TTS_LANGUAGES', () => {
  it('stays under the iOS character cap and includes English', () => {
    assert.equal(TTS_MAX_CHARS, 299);
    assert.ok(TTS_LANGUAGES.some((language) => language.code === 'en'));
  });
});
