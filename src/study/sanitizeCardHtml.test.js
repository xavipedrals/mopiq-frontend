import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CardHtmlTooLargeError,
  MAX_CARD_FIELD_HTML_BYTES,
  WEB_CLOZE_NOTE_MODEL_ID,
  WEB_QA_NOTE_MODEL_ID,
  containsClozeMarkup,
  editorHtmlToStored,
  htmlLooksEmpty,
  isLocalMediaFilename,
  noteModelIdForWebFields,
  normalizeClozesToC1,
  sanitizeCardHtml,
  storedHtmlToEditor,
} from './sanitizeCardHtml.js';

describe('sanitizeCardHtml', () => {
  it('keeps safe formatting, cloze spans, and local images', () => {
    const html = sanitizeCardHtml(
      '<p style="text-align: center"><b>Q</b> <span class="anki-cloze">mito</span></p><img src="cell.jpg" alt="cell">',
    );
    assert.match(html, /<b>Q<\/b>/);
    assert.match(html, /class="anki-cloze"/);
    assert.match(html, /src="cell.jpg"/);
    assert.match(html, /text-align: center/);
  });

  it('strips scripts, event handlers, javascript URLs, svg, and iframes', () => {
    const html = sanitizeCardHtml(
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><img src="x.jpg" onerror="alert(1)">'
      + '<a href="javascript:alert(1)">x</a><svg><script>alert(1)</script></svg><iframe src="https://evil"></iframe>',
    );
    assert.equal(html.includes('script'), false);
    assert.equal(html.includes('onclick'), false);
    assert.equal(html.includes('onerror'), false);
    assert.equal(html.includes('javascript'), false);
    assert.equal(html.includes('iframe'), false);
    assert.equal(html.includes('svg'), false);
    assert.match(html, /<p>Hi<\/p>/);
    assert.match(html, /src="x.jpg"/);
    assert.equal(html.includes('<a'), false);
  });

  it('drops editor-only image width and height so they are not stored', () => {
    const html = sanitizeCardHtml('<img src="cell.jpg" width="420" height="280" alt="cell">');
    assert.match(html, /src="cell.jpg"/);
    assert.equal(html.includes('width'), false);
    assert.equal(html.includes('height'), false);
  });

  it('rejects remote, data, and path-traversal image sources', () => {
    assert.equal(sanitizeCardHtml('<img src="https://evil.com/a.jpg">'), '');
    assert.equal(sanitizeCardHtml('<img src="data:image/png;base64,aaaa">'), '');
    assert.equal(sanitizeCardHtml('<img src="../../secret.jpg">'), '');
    assert.equal(sanitizeCardHtml('<img src="javascript:alert(1)">'), '');
  });

  it('decodes entities before checking URLs', () => {
    const html = sanitizeCardHtml('<a href="javascript&#58;alert(1)">x</a>');
    assert.equal(html.includes('javascript'), false);
    assert.equal(html.includes('<a'), false);
  });

  it('rejects oversized fields', () => {
    const huge = `<p>${'a'.repeat(MAX_CARD_FIELD_HTML_BYTES)}</p>`;
    assert.throws(() => sanitizeCardHtml(huge), CardHtmlTooLargeError);
  });
});

describe('cloze helpers', () => {
  it('round-trips editor spans to Anki markup and back', () => {
    const stored = editorHtmlToStored('<p>The <span class="anki-cloze">powerhouse</span></p>');
    assert.equal(stored, '<p>The {{c1::powerhouse}}</p>');
    assert.equal(storedHtmlToEditor(stored), '<p>The <span class="anki-cloze">powerhouse</span></p>');
  });

  it('collapses cloze ordinals to c1', () => {
    assert.equal(normalizeClozesToC1('{{c3::x}} {{c2::y}}'), '{{c1::x}} {{c1::y}}');
    assert.equal(containsClozeMarkup('{{c1::x}}'), true);
    assert.equal(noteModelIdForWebFields(['{{c1::x}}', '']), WEB_CLOZE_NOTE_MODEL_ID);
    assert.equal(noteModelIdForWebFields(['<p>Q</p>', '<p>A</p>']), WEB_QA_NOTE_MODEL_ID);
  });
});

describe('isLocalMediaFilename', () => {
  it('allows Anki basenames and rejects URLs', () => {
    assert.equal(isLocalMediaFilename('cell.png'), true);
    assert.equal(isLocalMediaFilename('paste.jpg'), true);
    assert.equal(isLocalMediaFilename('https://x/y.png'), false);
    assert.equal(isLocalMediaFilename('foo/bar.png'), false);
  });
});

describe('htmlLooksEmpty', () => {
  it('treats images and clozes as content', () => {
    assert.equal(htmlLooksEmpty('<p></p>'), true);
    assert.equal(htmlLooksEmpty('<p>Hi</p>'), false);
    assert.equal(htmlLooksEmpty('<p><img src="a.jpg"></p>'), false);
    assert.equal(htmlLooksEmpty('<p>{{c1::x}}</p>'), false);
  });
});
