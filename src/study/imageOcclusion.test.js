import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WEB_OCCLUSION_NOTE_MODEL_ID } from './sanitizeCardHtml.js';
import {
  MAX_OCCLUSION_RECTS,
  OCCLUSION_NOTE_MODEL_NAME,
  buildOcclusionCards,
  cardHasImageOcclusion,
  formatRectToken,
  imageOcclusionNoteModel,
  isImageOcclusionMarkup,
  parseOcclusionShapes,
  renderOcclusionStudyHtml,
} from './imageOcclusion.js';

const rect = (left, top, width, height, rotation = 0) => ({
  left, top, width, height, rotation,
});

describe('formatRectToken', () => {
  it('matches the app token with four decimal places and oi=1', () => {
    assert.equal(
      formatRectToken(rect(0.1, 0.2, 0.3, 0.15, 12)),
      'image-occlusion:rect:left=0.1000:top=0.2000:width=0.3000:height=0.1500:rotation=12.00:oi=1',
    );
  });
});

describe('buildOcclusionCards', () => {
  function queuedIds(values) {
    const ids = values.slice();
    return () => ids.shift();
  }

  it('builds one note and one card per rectangle for hide all', () => {
    const cards = buildOcclusionCards({
      rectangles: [rect(0.1, 0.1, 0.2, 0.2), rect(0.4, 0.4, 0.2, 0.2, 15)],
      fileName: 'photo.jpg',
      mode: 'hideAll',
      createId: queuedIds(['n1', 'c1', 'c2']),
    });
    assert.equal(cards.length, 2);
    assert.equal(cards[0].noteId, 'n1');
    assert.equal(cards[1].noteId, 'n1');
    assert.equal(cards[0].noteGuid, 'n1');
    assert.equal(cards[0].templateIndex, 0);
    assert.equal(cards[1].templateIndex, 1);
    assert.equal(cards[0].noteModelId, WEB_OCCLUSION_NOTE_MODEL_ID);
    assert.equal(cards[0].fields[0], cards[1].fields[0]);
    assert.match(cards[0].fields[0], /\{\{c1::image-occlusion:rect:/);
    assert.match(cards[0].fields[0], /<br>\{\{c2::image-occlusion:rect:/);
    assert.match(cards[0].fields[0], /rotation=15\.00:oi=1/);
    assert.equal(cards[0].fields[1], '<img src="photo.jpg">');
    assert.equal(cards[0].cardId, 'c1');
    assert.equal(cards[1].cardId, 'c2');
  });

  it('builds one note per rectangle for hide one', () => {
    const cards = buildOcclusionCards({
      rectangles: [rect(0.1, 0.1, 0.2, 0.2), rect(0.5, 0.5, 0.1, 0.1)],
      fileName: 'photo.jpg',
      mode: 'hideOne',
      createId: queuedIds(['n2', 'c3', 'n3', 'c4']),
    });
    assert.equal(cards.length, 2);
    assert.equal(cards[0].noteId, 'n2');
    assert.equal(cards[1].noteId, 'n3');
    assert.notEqual(cards[0].noteId, cards[1].noteId);
    assert.equal(cards[0].templateIndex, 0);
    assert.equal(cards[1].templateIndex, 0);
    assert.match(cards[0].fields[0], /^\{\{c1::image-occlusion:rect:/);
    assert.equal(cards[0].fields[0].includes('{{c2::'), false);
    assert.equal(cards[1].fields[1], '<img src="photo.jpg">');
    assert.equal(cards[0].noteModelId, '777000003');
  });

  it('rejects an empty list and more than 100 rectangles', () => {
    assert.throws(
      () => buildOcclusionCards({ rectangles: [], fileName: 'a.jpg' }),
      (error) => error.code === 'no-rectangles',
    );
    assert.throws(
      () => buildOcclusionCards({
        rectangles: Array.from({ length: MAX_OCCLUSION_RECTS + 1 }, () => rect(0, 0, 0.1, 0.1)),
        fileName: 'a.jpg',
      }),
      (error) => error.code === 'too-many',
    );
  });
});

describe('occlusion study html', () => {
  const field = [
    '{{c1::image-occlusion:rect:left=0.1000:top=0.1000:width=0.2000:height=0.2000:oi=1}}',
    '{{c2::image-occlusion:rect:left=0.5000:top=0.4000:width=0.2000:height=0.1500:rotation=15.00:oi=1}}',
  ].join('<br>');

  it('highlights the template target on the question and hides it on the answer', () => {
    const front = renderOcclusionStudyHtml({
      occlusionField: field,
      imageHtml: '<img src="https://cdn.example/photo.jpg">',
      templateIndex: 1,
      reveal: false,
    });
    assert.match(front, /class="io-mask other"/);
    assert.match(front, /class="io-mask target"/);
    assert.match(front, /left:50\.0000%/);
    assert.match(front, /rotate\(15\.00deg\)/);
    assert.equal(front.includes('io-mask-toggle'), false);
    assert.match(front, /<img src="https:\/\/cdn\.example\/photo\.jpg">/);

    const back = renderOcclusionStudyHtml({
      occlusionField: field,
      imageHtml: '<img src="photo.jpg">',
      templateIndex: 1,
      reveal: true,
    });
    assert.match(back, /class="io-mask other"/);
    assert.equal(back.includes('io-mask target'), false);
    assert.equal(back.includes('left:50.0000%'), false);
    assert.match(back, /Hide Answers/);
    assert.match(back, /Show Answers/);
  });

  it('draws an ellipse from rx and ry and skips the toggle when oi is not 1', () => {
    const token = '{{c1::image-occlusion:ellipse:left=0.2000:top=0.1000:rx=0.1000:ry=0.1500:oi=0}}';
    const html = renderOcclusionStudyHtml({
      occlusionField: token,
      imageHtml: '<img src="photo.jpg">',
      templateIndex: 0,
      reveal: false,
    });
    assert.match(html, /class="io-mask target"/);
    assert.match(html, /width:20\.0000%/);
    assert.match(html, /height:30\.0000%/);
    assert.match(html, /border-radius:50%/);
    const answer = renderOcclusionStudyHtml({
      occlusionField: token,
      imageHtml: '<img src="photo.jpg">',
      templateIndex: 0,
      reveal: true,
    });
    assert.equal(answer.includes('io-mask-toggle'), false);
    assert.equal(parseOcclusionShapes(token)[0].shape, 'ellipse');
  });
});

describe('image occlusion note model', () => {
  it('uses the branded occlusion name and standard type', () => {
    const model = imageOcclusionNoteModel(42);
    assert.equal(model.id, 777000003);
    assert.equal(model.name, OCCLUSION_NOTE_MODEL_NAME);
    assert.equal(model.type, 0);
    assert.equal(model.did, 42);
    assert.equal(model.flds[0].name, 'Occlusion');
    assert.equal(model.flds[1].name, 'Image');
    assert.match(model.tmpls[0].qfmt, /\{\{cloze:Occlusion\}\}/);
    assert.match(model.tmpls[0].qfmt, /\{\{Image\}\}/);
    assert.match(model.tmpls[0].afmt, /id="toggle"/);
    assert.equal(model.tmpls[0].qfmt.includes('id="toggle"'), false);
  });
});

describe('detection', () => {
  it('recognizes occlusion fields and ignores ordinary cloze', () => {
    assert.equal(isImageOcclusionMarkup('{{c1::image-occlusion:rect:left=0.1}}'), true);
    assert.equal(isImageOcclusionMarkup('{{c1::powerhouse}}'), false);
    assert.equal(cardHasImageOcclusion({
      noteFields: ['{{c1::image-occlusion:rect:left=0.1:oi=1}}', '<img src="a.jpg">'],
    }), true);
    assert.equal(cardHasImageOcclusion({ noteFields: ['{{c1::powerhouse}}', 'cell'] }), false);
  });
});
