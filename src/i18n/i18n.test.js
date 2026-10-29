import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { APP_LANGUAGES, matchAppLanguage } from './languages.js';
import de from './messages/de.js';
import en from './messages/en.js';
import es from './messages/es.js';
import fr from './messages/fr.js';
import itMessages from './messages/it.js';
import ja from './messages/ja.js';
import pt from './messages/pt.js';

import nb from './messages/nb.js';
import nl from './messages/nl.js';
import sv from './messages/sv.js';
import he from './messages/he.js';
import fi from './messages/fi.js';
import da from './messages/da.js';
import zhHans from './messages/zh-Hans.js';
function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? keys(value, path) : [path];
  });
}

const newCatalogs = { nb, nl, sv, he, fi, da, 'zh-Hans': zhHans };

function entries(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? entries(value, path) : [[path, value]];
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
    assert.equal(matchAppLanguage('zh'), 'zh-Hans');
    assert.equal(matchAppLanguage('zh-CN'), 'zh-Hans');
    assert.equal(matchAppLanguage('zh-Hant'), null);
    assert.equal(matchAppLanguage('he-IL'), 'he');
    assert.equal(matchAppLanguage('no-NO'), 'nb');
    assert.equal(APP_LANGUAGES.length,14);
  });
});

describe('message catalogs', () => {
  it('keep the same keys as English', () => {
    const english = keys(en).sort();
    for (const [name, catalog] of Object.entries({ es, pt, fr, it: itMessages, ja, de, nb, nl, sv, he, fi, da, zhHans })) {
      assert.deepEqual(keys(catalog).sort(), english, `${name} is missing keys`);
    }
  });

  it('localizes website copy instead of silently inheriting English sentences', () => {
    const english = Object.fromEntries(entries(en));
    const essentialKeys = new Set([
      'home.titleBefore', 'home.titleMark', 'home.language',
      'common.downloadApp', 'login.haveAccount', 'login.needAccount',
      'settings.howItWorks', 'limit.title', 'notFound.home',
    ]);
    for (const [locale, catalog] of Object.entries(newCatalogs)) {
      for (const [key, value] of entries(catalog)) {
        // Commands, product names and short cognates can legitimately match English.
        if (key === 'settings.debugImpersonateCommand' || /^https?:\/\//.test(value)) continue;
        if (essentialKeys.has(key) || english[key].length >= 30) {
          assert.notEqual(value, english[key], `${locale}: ${key} still uses English`);
        }
      }
    }
  });

  it('preserves every interpolation placeholder in the new languages', () => {
    const english = Object.fromEntries(entries(en));
    const placeholders = (value) => (value.match(/\{\w+\}/g) || []).sort();
    for (const [locale, catalog] of Object.entries(newCatalogs)) {
      for (const [key, value] of entries(catalog)) {
        assert.deepEqual(placeholders(value), placeholders(english[key]), `${locale}: ${key}`);
      }
    }
  });
});


it('native catalogs preserve web placeholders and translate the release features',()=>{
  const leaves=(o)=>Object.values(o).flatMap(v=>v&&typeof v==='object'?leaves(v):[v]);
  for(const catalog of [nb,nl,sv,he,fi,da,zhHans]) {
    assert.notEqual(catalog.customStudy.title,en.customStudy.title);
    assert.notEqual(catalog.tutorial.recallTitle,en.tutorial.recallTitle);
    assert.ok(catalog.customStudy.start.includes('{count}'));
    assert.ok(catalog.study.youWrote.includes('{answer}'));
    assert.equal(leaves(catalog).some(s=>/%(?:\d+\$)?[@df]/.test(s)),false);
  }
});
