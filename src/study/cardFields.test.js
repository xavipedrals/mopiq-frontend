import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cardContainsImage,
  cardEditorHtmlFields,
  cardSyncFields,
  cardWebEditLock,
  editorTextToHtml,
  extractMediaFilenames,
  htmlToEditorText,
  replaceFrontBackFields,
} from './cardFields.js';

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

describe('cardSyncFields', () => {
  it('prefers note fields and falls back to question and answer', () => {
    assert.deepEqual(cardSyncFields({ noteFields: ['Q', 'A', 'extra'] }), ['Q', 'A', 'extra']);
    assert.deepEqual(cardSyncFields({ question: 'Front', answer: 'Back' }), ['Front', 'Back']);
  });
});

describe('extractMediaFilenames', () => {
  it('collects local image and sound filenames', () => {
    assert.deepEqual(
      extractMediaFilenames({
        noteFields: ['<img src="cell.png">', '[sound:voice.mp3]'],
        question: '<img src="https://example.com/skip.png">',
      }),
      ['cell.png', 'voice.mp3'],
    );
  });
});

describe('cardWebEditLock', () => {
  it('locks audio and occlusion cards', () => {
    assert.equal(cardWebEditLock({ hasAudio: true, question: 'Q', answer: 'A' }), 'audio');
    assert.equal(cardWebEditLock({ question: '[sound:a.mp3]', answer: 'A' }), 'audio');
    assert.equal(cardWebEditLock({ question: '{{c1::image-occlusion:rect:1}}', answer: '' }), 'occlusion');
    assert.equal(cardWebEditLock({ question: '<p>Q</p>', answer: '<p>A</p>', hasImage: true }), '');
  });
});

describe('cardEditorHtmlFields', () => {
  it('turns stored cloze markup into editor spans', () => {
    assert.equal(
      cardEditorHtmlFields({ noteFields: ['The {{c1::x}}', 'A'] }).front,
      'The <span class="anki-cloze">x</span>',
    );
  });
});
