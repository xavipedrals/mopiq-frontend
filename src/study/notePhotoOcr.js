export const MAX_NOTE_PHOTOS = 100;
export const PHOTO_PAGE_SEPARATOR = '\n\n---\n\n';

const TESSERACT_LANG = {
  en: 'eng',
  es: 'spa',
  fr: 'fra',
  de: 'deu',
  it: 'ita',
  pt: 'por',
  ja: 'jpn',
};

export function tesseractLanguages(locale) {
  const code = String(locale || 'en').toLowerCase().split(/[-_]/)[0];
  const lang = TESSERACT_LANG[code] || 'eng';
  return lang === 'eng' ? ['eng'] : ['eng', lang];
}

export function joinPhotoTranscripts(parts) {
  return (Array.isArray(parts) ? parts : [])
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(PHOTO_PAGE_SEPARATOR);
}

export async function extractNotePhotoText(files, { locale = 'en', onProgress, createWorker } = {}) {
  const list = [...(files || [])];
  if (list.length < 1) {
    const error = new Error('Add at least one image.');
    error.code = 'photo_required';
    throw error;
  }
  if (list.length > MAX_NOTE_PHOTOS) {
    const error = new Error('You can add a maximum of 100 images.');
    error.code = 'photo_too_many';
    throw error;
  }
  const factory = createWorker || (await import('tesseract.js')).createWorker;
  const worker = await factory(tesseractLanguages(locale));
  const parts = [];
  try {
    for (let index = 0; index < list.length; index += 1) {
      onProgress?.(index / list.length);
      const result = await worker.recognize(list[index]);
      parts.push(result?.data?.text || '');
      onProgress?.((index + 1) / list.length);
    }
  } finally {
    await worker.terminate?.();
  }
  return joinPhotoTranscripts(parts);
}
