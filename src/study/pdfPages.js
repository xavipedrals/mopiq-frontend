export const MAX_PDF_PAGES = 300;
export const PDF_THUMBNAIL_EDGE = 360;

export function thumbnailPixelSize(width, height, maxEdge = PDF_THUMBNAIL_EDGE) {
  if (!(width > 1) || !(height > 1)) {
    return { width: Math.round(maxEdge * 0.75), height: maxEdge };
  }
  const scale = Math.min(maxEdge / width, maxEdge / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function validatePdfPages(pages) {
  if (!Array.isArray(pages) || pages.length === 0) return 'pages_required';
  if (pages.length > MAX_PDF_PAGES) return 'too_many_pages';
  const seen = new Set();
  for (const page of pages) {
    if (!Number.isInteger(page) || page < 1) return 'pages';
    if (seen.has(page)) return 'pages';
    seen.add(page);
  }
  return '';
}

export function validatePdfPageSelection(pages, pageCount) {
  const count = Number(pageCount);
  if (!Number.isInteger(count) || count < 1) return 'pdf_invalid';
  const shape = validatePdfPages(pages);
  if (shape) return shape;
  if (pages.some((page) => page > count)) return 'pages';
  return '';
}

export function sortedPdfPages(pages) {
  return [...pages].sort((left, right) => left - right);
}
