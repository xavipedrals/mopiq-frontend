import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cardContainsImage, editorTextToHtml, htmlToEditorText, replaceFrontBackFields } from './cardFields.js';

describe('card field round-trip', () => {
  it('wraps plain text as paragraphs', () => {
    assert.equal(editorTextToHtml('Hello'), '<p>Hello</p>');
    assert.equal(htmlToEditorText('<p>Hello</p>'), 'Hello');
  });

  it('keeps cloze and media markup intact', () => {
    const cloze = '{{c1::mitochondria}} is the powerhouse';
    assert.equal(editorTextToHtml(cloze), cloze);
    const img = '<img src="cell.png">';
    assert.equal(htmlToEditorText(img), img);
  });
});

describe('replaceFrontBackFields', () => {
  it('keeps extra note fields when editing front and back', () => {
    const fields = replaceFrontBackFields(
      { noteFields: ['old front', 'old back', 'extra'] },
      '<p>New</p>',
      '<p>Back</p>',
    );
    assert.deepEqual(fields, ['<p>New</p>', '<p>Back</p>', 'extra']);
  });
});

describe('cardContainsImage', () => {
  it('uses the hasImage flag or an img tag', () => {
    assert.equal(cardContainsImage({ hasImage: true, question: 'Q', answer: 'A' }), true);
    assert.equal(cardContainsImage({ question: '<img src="x.png">', answer: 'A' }), true);
    assert.equal(cardContainsImage({ question: 'Q', answer: 'A' }), false);
  });
});
