import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { thumbnailPixelSize } from './pdfPages';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const THUMBNAIL_BATCH = 6;

function pdfError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

async function thumbnailUrl(page) {
  const base = page.getViewport({ scale: 1 });
  const size = thumbnailPixelSize(base.width, base.height);
  const viewport = page.getViewport({ scale: size.width / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw pdfError('pdf_invalid');
  await page.render({ canvasContext: context, viewport }).promise;
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.82);
  });
  if (!blob) return '';
  return URL.createObjectURL(blob);
}

export async function loadPdfPreviews(file, { onOpen, onThumbnails, isCancelled } = {}) {
  const data = new Uint8Array(await file.arrayBuffer());
  if (isCancelled?.()) return null;
  let doc;
  try {
    doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  } catch (error) {
    if (error?.code === 'pdf_invalid') throw error;
    throw pdfError('pdf_invalid');
  }
  try {
    if (isCancelled?.()) return null;
    const pageCount = doc.numPages || 0;
    if (pageCount < 1) throw pdfError('pdf_invalid');
    onOpen?.({ pageCount });
    const batch = [];
    for (let number = 1; number <= pageCount; number += 1) {
      if (isCancelled?.()) return null;
      const page = await doc.getPage(number);
      const thumbnail = await thumbnailUrl(page);
      page.cleanup?.();
      batch.push({ number, thumbnail });
      if (batch.length >= THUMBNAIL_BATCH) {
        onThumbnails?.(batch.splice(0, batch.length));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    if (batch.length) onThumbnails?.(batch);
    return { pageCount };
  } finally {
    await doc.destroy?.().catch(() => {});
  }
}
