import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { usesPdfPagePicker } from './magicImport.js';
import {
  MAX_PDF_PAGES,
  sortedPdfPages,
  thumbnailPixelSize,
  validatePdfPageSelection,
  validatePdfPages,
} from './pdfPages.js';

describe('pdf page picker', () => {
  it('only sends PDFs through the page picker', () => {
    assert.equal(usesPdfPagePicker('pdf'), true);
    assert.equal(usesPdfPagePicker('powerpoint'), false);
    assert.equal(usesPdfPagePicker('word'), false);
    assert.equal(usesPdfPagePicker('photo'), false);
    assert.equal(usesPdfPagePicker('aiPrompt'), false);
  });

  it('rejects an empty selection, duplicates, pages outside the file, and more than 300 pages', () => {
    assert.equal(validatePdfPages([]), 'pages_required');
    assert.equal(validatePdfPages([1, 1]), 'pages');
    assert.equal(validatePdfPages([0, 2]), 'pages');
    assert.equal(validatePdfPages([1.5]), 'pages');
    assert.equal(validatePdfPages(Array.from({ length: MAX_PDF_PAGES + 1 }, (_, index) => index + 1)), 'too_many_pages');
    assert.equal(validatePdfPageSelection([1, 4], 3), 'pages');
    assert.equal(validatePdfPageSelection([2, 1], 4), '');
    assert.equal(validatePdfPageSelection([1], MAX_PDF_PAGES + 1), '');
    assert.equal(validatePdfPageSelection(
      Array.from({ length: MAX_PDF_PAGES + 1 }, (_, index) => index + 1),
      MAX_PDF_PAGES + 1,
    ), 'too_many_pages');
    assert.equal(validatePdfPageSelection([1], 0), 'pdf_invalid');
    assert.deepEqual(sortedPdfPages([4, 1, 2]), [1, 2, 4]);
  });

  it('fits a thumbnail inside the same max edge iOS uses', () => {
    assert.deepEqual(thumbnailPixelSize(2400, 3200), { width: 270, height: 360 });
    assert.deepEqual(thumbnailPixelSize(1080, 1920).height <= 360, true);
    assert.deepEqual(thumbnailPixelSize(0, 0), { width: 270, height: 360 });
  });
});
