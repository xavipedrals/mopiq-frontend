import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  autoDetectSpreadsheet,
  decodeSpreadsheetBytes,
  detectSpreadsheetSettings,
  parseSpreadsheet,
  wrapSpreadsheetField,
} from './spreadsheetImport.js';

describe('parseSpreadsheet', () => {
  it('parses tab-separated rows', () => {
    const cards = parseSpreadsheet('cat\tgato\ndog\tperro', {
      termDelimiter: 'tab',
      cardDelimiter: 'newLine',
      customTermDelimiter: '|',
      customCardDelimiter: '---',
      skipHeader: false,
    });
    assert.equal(cards.length, 2);
    assert.equal(cards[0].question, 'cat');
    assert.equal(cards[0].answer, 'gato');
    assert.equal(cards[1].question, 'dog');
    assert.equal(cards[1].answer, 'perro');
    assert.deepEqual(cards[0].tags, ['from-spreadsheet']);
  });

  it('parses comma-separated rows with quoted commas', () => {
    const cards = parseSpreadsheet('"Term, with comma","Definition, also comma"\nhello,world', {
      termDelimiter: 'comma',
      cardDelimiter: 'newLine',
      customTermDelimiter: '|',
      customCardDelimiter: '---',
      skipHeader: false,
    });
    assert.equal(cards.length, 2);
    assert.equal(cards[0].question, 'Term, with comma');
    assert.equal(cards[0].answer, 'Definition, also comma');
    assert.equal(cards[1].question, 'hello');
    assert.equal(cards[1].answer, 'world');
  });

  it('parses semicolon term delimiters', () => {
    const cards = parseSpreadsheet('a;b\nc;d', {
      termDelimiter: 'semicolon',
      cardDelimiter: 'newLine',
      customTermDelimiter: '|',
      customCardDelimiter: '---',
      skipHeader: false,
    });
    assert.equal(cards.length, 2);
    assert.equal(cards[0].question, 'a');
    assert.equal(cards[0].answer, 'b');
  });

  it('skips a header row', () => {
    const cards = parseSpreadsheet('Term,Definition\nfront,back\nother,side', {
      termDelimiter: 'comma',
      cardDelimiter: 'newLine',
      customTermDelimiter: '|',
      customCardDelimiter: '---',
      skipHeader: true,
    });
    assert.equal(cards.length, 2);
    assert.equal(cards[0].question, 'front');
    assert.equal(cards[1].question, 'other');
  });

  it('parses custom delimiters', () => {
    const cards = parseSpreadsheet('q1||a1---q2||a2', {
      termDelimiter: 'custom',
      cardDelimiter: 'custom',
      customTermDelimiter: '||',
      customCardDelimiter: '---',
      skipHeader: false,
    });
    assert.equal(cards.length, 2);
    assert.equal(cards[0].question, 'q1');
    assert.equal(cards[0].answer, 'a1');
    assert.equal(cards[1].question, 'q2');
    assert.equal(cards[1].answer, 'a2');
  });

  it('prefers tab when detecting separators', () => {
    const settings = detectSpreadsheetSettings('a\tb\nc\td');
    assert.equal(settings.termDelimiter, 'tab');
    assert.equal(settings.cardDelimiter, 'newLine');
  });

  it('prefers comma when there is no tab', () => {
    const settings = detectSpreadsheetSettings('a,b\nc,d');
    assert.equal(settings.termDelimiter, 'comma');
  });

  it('drops incomplete rows', () => {
    const cards = parseSpreadsheet('onlyterm\nfront,back', {
      termDelimiter: 'comma',
      cardDelimiter: 'newLine',
      customTermDelimiter: '|',
      customCardDelimiter: '---',
      skipHeader: false,
    });
    assert.equal(cards.length, 1);
    assert.equal(cards[0].question, 'front');
  });

  it('splits cards on semicolons when asked', () => {
    const cards = parseSpreadsheet('a\tb;c\td', {
      termDelimiter: 'tab',
      cardDelimiter: 'semicolon',
      customTermDelimiter: '|',
      customCardDelimiter: '---',
      skipHeader: false,
    });
    assert.equal(cards.length, 2);
    assert.equal(cards[0].question, 'a');
    assert.equal(cards[1].question, 'c');
  });
});

describe('autoDetectSpreadsheet', () => {
  it('detects tab-separated pastes', () => {
    const result = autoDetectSpreadsheet('cat\tgato\ndog\tperro\nbird\tpájaro');
    assert.equal(result.settings.termDelimiter, 'tab');
    assert.equal(result.settings.cardDelimiter, 'newLine');
    assert.equal(result.cards.length, 3);
    assert.equal(result.cards[0].question, 'cat');
    assert.ok(result.confidence > 0.3);
  });

  it('detects comma CSV with a header', () => {
    const result = autoDetectSpreadsheet('Term,Definition\nhello,hola\nworld,mundo\nthanks,gracias');
    assert.equal(result.settings.termDelimiter, 'comma');
    assert.equal(result.settings.skipHeader, true);
    assert.equal(result.cards.length, 3);
    assert.equal(result.cards[0].question, 'hello');
  });

  it('detects EU semicolon CSV', () => {
    const result = autoDetectSpreadsheet('bonjour;hello\nmerci;thanks\nau revoir;goodbye');
    assert.equal(result.settings.termDelimiter, 'semicolon');
    assert.equal(result.cards.length, 3);
    assert.equal(result.cards[0].answer, 'hello');
  });

  it('detects pipe-separated rows', () => {
    const result = autoDetectSpreadsheet('front|back\nfoo|bar\nbaz|qux');
    assert.equal(result.cards.length, 3);
    assert.equal(result.cards[0].question, 'front');
    assert.equal(result.cards[0].answer, 'back');
  });
});

describe('spreadsheet helpers', () => {
  it('wraps plain text as stored HTML', () => {
    assert.equal(wrapSpreadsheetField('  a <b> & c  '), '<p>a &lt;b&gt; &amp; c</p>');
    assert.equal(wrapSpreadsheetField('line 1\nline 2'), '<p>line 1<br>line 2</p>');
  });

  it('decodes latin-1 when utf-8 is invalid', () => {
    assert.equal(decodeSpreadsheetBytes(Uint8Array.from([0x63, 0x61, 0x74])), 'cat');
    assert.equal(decodeSpreadsheetBytes(Uint8Array.from([0xe9])), 'é');
  });
});
