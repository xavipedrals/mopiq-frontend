import { tesseractLanguages } from './notePhotoOcr.js';

function lineBounds(line) {
  const words = line.words.filter((word) => {
    const length = word.text.match(/[\p{L}\p{N}]/gu)?.length || 0;
    // Short fragments from line art need stronger evidence than full words.
    return length > 0 && word.confidence >= (length <= 2 ? 85 : 55);
  });
  if (!words.length) return null;
  return {
    x0: Math.min(...words.map(({ bbox }) => bbox.x0)),
    y0: Math.min(...words.map(({ bbox }) => bbox.y0)),
    x1: Math.max(...words.map(({ bbox }) => bbox.x1)),
    y1: Math.max(...words.map(({ bbox }) => bbox.y1)),
  };
}

export function occlusionTextRegions(blocks, width, height) {
  const lines = (blocks || []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.lines.map(lineBounds).filter(Boolean)),
  ).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const labels = [];
  for (const line of lines) {
    const lineHeight = line.y1 - line.y0;
    const previous = labels.find((label) => {
      const tolerance = Math.min(lineHeight, label.lastHeight);
      const gap = line.y0 - label.y1;
      const overlap = Math.min(line.x1, label.x1) - Math.max(line.x0, label.x0);
      return gap >= 0 && gap <= tolerance * 0.35 &&
        overlap >= Math.min(line.x1 - line.x0, label.x1 - label.x0) * 0.7 &&
        Math.min(Math.abs(line.x0 - label.x0), Math.abs(line.x1 - label.x1)) <= tolerance * 0.4;
    });
    if (previous) {
      previous.x0 = Math.min(previous.x0, line.x0);
      previous.x1 = Math.max(previous.x1, line.x1);
      previous.y1 = line.y1;
      previous.lastHeight = lineHeight;
    } else {
      labels.push({ ...line, lastHeight: lineHeight });
    }
  }
  return labels.flatMap((box) => {
    const padding = box.lastHeight * 0.08;
    const left = Math.max(0, box.x0 - padding) / width;
    const top = Math.max(0, box.y0 - padding) / height;
    const right = Math.min(width, box.x1 + padding) / width;
    const bottom = Math.min(height, box.y1 + padding) / height;
    return right > left && bottom > top
      ? [{ left, top, width: right - left, height: bottom - top, rotation: 0 }]
      : [];
  });
}

export async function detectOcclusionText(image, { locale, signal }) {
  const { createWorker, OEM, PSM } = await import('tesseract.js');
  if (signal.aborted) throw signal.reason;
  let worker;
  let finished = false;
  let stop;
  const interrupted = new Promise((_, reject) => { stop = reject; });
  const cancel = () => stop(signal.reason);
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => stop(new Error('OCR timed out')), 60_000);

  const recognize = async () => {
    const loaded = await createWorker(tesseractLanguages(locale), OEM.LSTM_ONLY, { errorHandler: stop });
    if (finished) {
      await loaded.terminate();
      return [];
    }
    worker = loaded;
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(image, {}, { blocks: true });
    return occlusionTextRegions(data.blocks, image.naturalWidth, image.naturalHeight);
  };

  try {
    return await Promise.race([recognize(), interrupted]);
  } finally {
    finished = true;
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
    await worker?.terminate();
  }
}
