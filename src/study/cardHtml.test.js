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

  it('uses the iOS browse column for the card inspector', () => {
    const html = cardDocument('<p>Hola</p>', { browse: true });
    assert.equal(html.includes('width: 90%'), true);
    assert.equal(html.includes('padding-top: 30px'), true);
    assert.equal(html.includes('font-size: 14pt'), true);
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

  it('draws image occlusion masks from the card template index', () => {
    const occlusion = [
      '{{c1::image-occlusion:rect:left=0.1000:top=0.1000:width=0.2000:height=0.2000:oi=1}}',
      '{{c2::image-occlusion:rect:left=0.5000:top=0.2000:width=0.2000:height=0.2000:oi=1}}',
    ].join('<br>');
    const card = {
      noteFields: [occlusion, '<img src="diagram.jpg">'],
      templateIndex: 1,
      noteModelId: '777000003',
    };
    const front = frontHtml(card, { 'diagram.jpg': 'https://cdn.example/diagram.jpg' });
    const back = backHtml(card, { 'diagram.jpg': 'https://cdn.example/diagram.jpg' });
    assert.match(front, /class="io-mask target"/);
    assert.match(front, /class="io-mask other"/);
    assert.match(front, /https:\/\/cdn\.example\/diagram\.jpg/);
    assert.equal(front.includes('image-occlusion:rect'), false);
    assert.equal(back.includes('io-mask target'), false);
    assert.match(back, /class="io-mask other"/);
    assert.match(back, /io-mask-toggle/);
    assert.ok(back.indexOf('io-frame') < back.indexOf('io-toggle'));
    const doc = cardDocument(front);
    assert.match(doc, /#A7F3D0/);
    assert.match(doc, /#FDE68A/);
    assert.match(doc, /\.io-check:checked ~ \.io-toggle \.io-hide/);
    assert.match(doc, /\.io-check:not\(:checked\) ~ \.io-frame \.io-masks/);
  });
});
