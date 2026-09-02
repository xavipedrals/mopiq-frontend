import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_THEME, backHtml, cardDocument } from './cardHtml.js';

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
