import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchAppLanguage } from './languages.js';
import de from './messages/de.js';
import en from './messages/en.js';
import es from './messages/es.js';
import fr from './messages/fr.js';
import itMessages from './messages/it.js';
import ja from './messages/ja.js';
import pt from './messages/pt.js';

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? keys(value, path) : [path];
  });
}

describe('matchAppLanguage', () => {
  it('maps exact picker codes and regional variants like iOS', () => {
    assert.equal(matchAppLanguage('en'), 'en');
    assert.equal(matchAppLanguage('es-419'), 'es');
    assert.equal(matchAppLanguage('pt-BR'), 'pt');
    assert.equal(matchAppLanguage('pt-PT'), 'pt');
    assert.equal(matchAppLanguage('fr-CA'), 'fr');
    assert.equal(matchAppLanguage('de-DE'), 'de');
    assert.equal(matchAppLanguage('ja_JP'), 'ja');
    assert.equal(matchAppLanguage('en-US'), 'en');
    assert.equal(matchAppLanguage('zh'), null);
  });
});

describe('message catalogs', () => {
  it('keep the same keys as English', () => {
    const english = keys(en).sort();
    for (const [name, catalog] of Object.entries({ es, pt, fr, it: itMessages, ja, de })) {
      assert.deepEqual(keys(catalog).sort(), english, `${name} is missing keys`);
    }
  });
});
