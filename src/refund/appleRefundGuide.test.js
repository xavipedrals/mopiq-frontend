import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appleRefundGuideUrl, appleSupportLocale } from './appleRefundGuide.js';

describe('apple refund guide locale', () => {
  it('uses the region on the matching browser language', () => {
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-US'] }), 'en-us');
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-GB'] }), 'en-gb');
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-AU'] }), 'en-au');
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-CA'] }), 'en-ca');
    assert.equal(appleSupportLocale({ language: 'es', browserLocales: ['es-MX'] }), 'es-mx');
    assert.equal(appleSupportLocale({ language: 'es', browserLocales: ['es-ES'] }), 'es-es');
    assert.equal(appleSupportLocale({ language: 'es', browserLocales: ['es-419'] }), 'es-la');
    assert.equal(appleSupportLocale({ language: 'es', browserLocales: ['es-AR'] }), 'es-la');
    assert.equal(appleSupportLocale({ language: 'pt', browserLocales: ['pt-PT'] }), 'pt-pt');
    assert.equal(appleSupportLocale({ language: 'pt', browserLocales: ['pt-BR'] }), 'pt-br');
    assert.equal(appleSupportLocale({ language: 'fr', browserLocales: ['fr-CA'] }), 'fr-ca');
    assert.equal(appleSupportLocale({ language: 'de', browserLocales: ['de-AT'] }), 'de-at');
    assert.equal(appleSupportLocale({ language: 'de', browserLocales: ['de-CH'] }), 'de-ch');
    assert.equal(appleSupportLocale({ language: 'it', browserLocales: ['it-IT'] }), 'it-it');
    assert.equal(appleSupportLocale({ language: 'ja', browserLocales: ['ja-JP'] }), 'ja-jp');
  });

  it('keeps a country-specific page ahead of a regional one', () => {
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-IN'] }), 'en-in');
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-ZA'] }), 'en-za');
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-NG'] }), 'en-ng');
    assert.equal(appleSupportLocale({ language: 'fr', browserLocales: ['fr-SN'] }), 'fr-sn');
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-UK'] }), 'en-gb');
  });

  it('uses Apple regional pages when that country has no own locale', () => {
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-DE'] }), 'en-euro');
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-JP'] }), 'en-asia');
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['en-MX'] }), 'en-la');
    assert.equal(appleSupportLocale({ language: 'fr', browserLocales: ['fr-BJ'] }), 'fr-afri');
  });

  it('guesses the country from another browser language when the site language has none', () => {
    assert.equal(appleSupportLocale({ language: 'en', browserLocales: ['es-ES', 'en'] }), 'en-euro');
    assert.equal(appleSupportLocale({ language: 'es', browserLocales: ['en-US'] }), 'es-us');
    assert.equal(appleSupportLocale({ language: 'ja', browserLocales: ['en-GB'] }), 'ja-jp');
  });

  it('prefers an explicit country, then falls back to the language default', () => {
    assert.equal(appleSupportLocale({ language: 'es', country: 'MX', browserLocales: ['en-US'] }), 'es-mx');
    assert.equal(appleSupportLocale({ language: 'pt', browserLocales: ['pt'] }), 'pt-br');
    assert.equal(appleSupportLocale({ language: 'de', browserLocales: ['en'] }), 'de-de');
    assert.equal(appleSupportLocale({ language: 'zh', browserLocales: ['zh-CN'] }), 'en-asia');
  });

  it('builds the support article url', () => {
    assert.equal(
      appleRefundGuideUrl({ language: 'es', browserLocales: ['es-MX'] }),
      'https://support.apple.com/es-mx/118223',
    );
  });
});
