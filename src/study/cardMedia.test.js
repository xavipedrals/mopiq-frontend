import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EDITOR_IMAGE_MAX_HEIGHT,
  EDITOR_IMAGE_MAX_WIDTH,
  editorImageDisplaySize,
  rewriteSrcForEditor,
  rewriteSrcForStorage,
  sniffImageType,
} from './cardMedia.js';

describe('sniffImageType', () => {
  it('detects jpeg png gif webp and rejects html/svg', () => {
    assert.equal(sniffImageType(Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0])).ext, 'jpg');
    assert.equal(sniffImageType(Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])).ext, 'png');
    const gif = new TextEncoder().encode('GIF89aXXXXXX');
    assert.equal(sniffImageType(gif).ext, 'gif');
    const webp = new Uint8Array(12);
    webp.set(new TextEncoder().encode('RIFF'), 0);
    webp.set(new TextEncoder().encode('WEBP'), 8);
    assert.equal(sniffImageType(webp).ext, 'webp');
    assert.equal(sniffImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')), null);
    assert.equal(sniffImageType(new TextEncoder().encode('<html></html>XXXX')), null);
  });
});

describe('editorImageDisplaySize', () => {
  it('scales large images down to the editor preview cap', () => {
    assert.deepEqual(editorImageDisplaySize(1920, 1080), {
      width: EDITOR_IMAGE_MAX_WIDTH,
      height: Math.round(1080 * (EDITOR_IMAGE_MAX_WIDTH / 1920)),
    });
    assert.deepEqual(editorImageDisplaySize(400, 800), {
      width: Math.round(400 * (EDITOR_IMAGE_MAX_HEIGHT / 800)),
      height: EDITOR_IMAGE_MAX_HEIGHT,
    });
  });

  it('keeps small images at their natural size', () => {
    assert.deepEqual(editorImageDisplaySize(120, 80), { width: 120, height: 80 });
    assert.deepEqual(editorImageDisplaySize(0, 80), {});
  });
});

describe('media src rewrite', () => {
  it('swaps filenames and blob URLs for the editor and storage', () => {
    const pending = [{ fileName: 'a.jpg', blobUrl: 'blob:http://local/1' }];
    assert.equal(
      rewriteSrcForEditor('<img src="b.jpg">', { 'b.jpg': 'https://cdn/b.jpg' }),
      '<img src="https://cdn/b.jpg">',
    );
    const stored = rewriteSrcForStorage(
      '<img src="blob:http://local/1"><img src="https://cdn/b.jpg">',
      { 'b.jpg': 'https://cdn/b.jpg' },
      pending,
    );
    assert.equal(stored, '<img src="a.jpg"><img src="b.jpg">');
  });
});
