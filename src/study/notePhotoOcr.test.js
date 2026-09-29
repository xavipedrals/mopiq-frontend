import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractNotePhotoText,
  joinPhotoTranscripts,
  MAX_NOTE_PHOTOS,
  tesseractLanguages,
} from './notePhotoOcr.js';

describe('note photo transcripts', () => {
  it('joins each image with a page break and drops blank pages', () => {
    assert.equal(joinPhotoTranscripts([' Mitosis ', '', '  ', 'Meiosis']), 'Mitosis\n\n---\n\nMeiosis');
  });

  it('reads the app language plus English', () => {
    assert.deepEqual(tesseractLanguages('es-419'), ['eng', 'spa']);
    assert.deepEqual(tesseractLanguages('en'), ['eng']);
    assert.deepEqual(tesseractLanguages('ja'), ['eng', 'jpn']);
  });

  it('rejects an empty selection and more than 100 images', async () => {
    await assert.rejects(() => extractNotePhotoText([]), { code: 'photo_required' });
    await assert.rejects(
      () => extractNotePhotoText(Array.from({ length: MAX_NOTE_PHOTOS + 1 })),
      { code: 'photo_too_many' },
    );
  });

  it('reads each image in order', async () => {
    const seen = [];
    const text = await extractNotePhotoText(['a', 'b'], {
      createWorker: async () => ({
        recognize: async (file) => {
          seen.push(file);
          return { data: { text: String(file) } };
        },
        terminate: async () => {},
      }),
    });
    assert.deepEqual(seen, ['a', 'b']);
    assert.equal(text, 'a\n\n---\n\nb');
  });
});
