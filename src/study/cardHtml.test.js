import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_THEME, backHtml, cardDocument, frontHtml, renderClozeHtml } from './cardHtml.js';

describe('cardDocument', () => {
  it('uses the light study text color by default', () => {
    const html = cardDocument('<p>Hola</p>');
    assert.equal(html.includes('night_mode'), false);
    assert.equal(html.includes('color-scheme" content="light"'), true);
    assert.equal(html.includes(CARD_THEME.light.text), true);
  });

  it('matches iOS night_mode wrapper colors', () => {
    const html = cardDocument('<p>Hola</p>', { dark: true });
    assert.equal(html.includes('class="night_mode nightMode"'), true);
    assert.equal(html.includes('card night_mode nightMode'), true);
    assert.equal(html.includes('#020617'), true);
    assert.equal(html.includes('#cbd5e1'), true);
    assert.equal(html.includes('#f1f5f9'), true);
    assert.equal(html.includes('color-scheme" content="dark"'), true);
  });
});

describe('backHtml', () => {
  it('uses a dark separator in night mode', () => {
    const html = backHtml(
      { question: 'Q', answer: 'A', noteFields: ['Q', 'A'] },
      {},
      { dark: true },
    );
    assert.equal(html.includes(CARD_THEME.dark.hr), true);
  });
});

describe('cloze study rendering', () => {
  it('blanks cloze on the front and reveals it on the back', () => {
    const card = {
      noteFields: ['The {{c1::powerhouse}} of the cell', 'Extra'],
      noteModelId: '777000002',
    };
    assert.equal(renderClozeHtml('The {{c1::powerhouse}}', { reveal: false }), 'The <span class="cloze">[...]</span>');
    assert.equal(renderClozeHtml('The {{c1::powerhouse}}', { reveal: true }), 'The <span class="cloze">powerhouse</span>');
    assert.match(frontHtml(card, {}), /\[&hellip;\]|\[\.\.\.\]/);
    assert.match(backHtml(card, {}), /powerhouse/);
    assert.match(backHtml(card, {}), /Extra/);
  });
});
