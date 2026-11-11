import { MAX_NOTES_CHARS, MIN_NOTES_CHARS } from './magicImport.js';

// Reuse existing text-source contracts. The original Office file never needs uploading.
export function preparedOfficeSubmission(payload, text, shared = false) {
  const code = payload.source === 'word' ? 'docx' : 'pptx';
  const content = String(text || '').trim();
  if (!content) throw Object.assign(new Error('No readable text.'), { code: `${code}_empty` });
  if (!shared && content.length < MIN_NOTES_CHARS) {
    throw Object.assign(new Error('Not enough presentation text.'), { code: `${code}_too_short` });
  }
  if (content.length > (shared ? 4_000_000 : MAX_NOTES_CHARS)) {
    throw Object.assign(new Error('Too much presentation text.'), { code: `${code}_too_long` });
  }
  return { ...payload, source: shared ? payload.source : 'paste', text: content, file: null, pages: null };
}
