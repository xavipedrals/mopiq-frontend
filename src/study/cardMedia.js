export const MAX_CARD_IMAGE_BYTES = 2 * 1024 * 1024;
export const EDITOR_IMAGE_MAX_WIDTH = 420;
export const EDITOR_IMAGE_MAX_HEIGHT = 280;

export function editorImageDisplaySize(width, height, {
  maxWidth = EDITOR_IMAGE_MAX_WIDTH,
  maxHeight = EDITOR_IMAGE_MAX_HEIGHT,
} = {}) {
  const w = Math.max(0, Number(width) || 0);
  const h = Math.max(0, Number(height) || 0);
  if (!w || !h) return {};
  const scale = Math.min(1, maxWidth / w, maxHeight / h);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

export function sniffImageType(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (data.length < 12) return null;
  if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    return { ext: 'gif', mime: 'image/gif' };
  }
  const riff = String.fromCharCode(data[0], data[1], data[2], data[3]);
  const webp = String.fromCharCode(data[8], data[9], data[10], data[11]);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

export function rewriteSrcForEditor(html, mediaMap = {}, pending = []) {
  const names = { ...mediaMap };
  for (const item of pending) {
    if (item?.fileName && item?.blobUrl) names[item.fileName] = item.blobUrl;
  }
  return String(html || '').replace(/(src=["'])([^"']+)(["'])/gi, (full, pre, src, post) => {
    if (/^https?:|^data:|^blob:/i.test(src)) return full;
    const file = decodeURIComponent(String(src).split('/').pop() || '');
    const url = names[src] || names[file];
    return url ? `${pre}${url}${post}` : full;
  });
}

export function rewriteSrcForStorage(html, mediaMap = {}, pending = []) {
  const reverse = {};
  for (const [name, url] of Object.entries(mediaMap || {})) {
    if (url) reverse[url] = name;
  }
  for (const item of pending) {
    if (item?.blobUrl && item?.fileName) reverse[item.blobUrl] = item.fileName;
  }
  return String(html || '').replace(/(src=["'])([^"']+)(["'])/gi, (full, pre, src, post) => {
    if (reverse[src]) return `${pre}${reverse[src]}${post}`;
    if (/^https?:|^data:|^blob:/i.test(src)) {
      const file = decodeURIComponent(String(src).split('/').pop() || '').split('?')[0];
      return reverse[src] ? `${pre}${reverse[src]}${post}` : `${pre}${file}${post}`;
    }
    const file = decodeURIComponent(String(src).split('/').pop() || '');
    return file ? `${pre}${file}${post}` : full;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not compress this image'));
    }, type, quality);
  });
}

async function loadImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not read this image'));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareCardImage(file, {
  maxBytes = MAX_CARD_IMAGE_BYTES,
  maxDim = 1920,
} = {}) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(buffer);
  if (!sniffed) {
    const error = new Error('unsupported');
    error.code = 'unsupported';
    throw error;
  }
  if (sniffed.ext === 'gif') {
    if (buffer.byteLength > maxBytes) {
      const error = new Error('too-big');
      error.code = 'too-big';
      throw error;
    }
    const blob = new Blob([buffer], { type: sniffed.mime });
    let width;
    let height;
    try {
      const image = await loadImage(blob);
      width = image.naturalWidth || image.width;
      height = image.naturalHeight || image.height;
    } catch {
      width = undefined;
      height = undefined;
    }
    return {
      blob,
      fileName: `${crypto.randomUUID()}.gif`,
      contentType: sniffed.mime,
      width,
      height,
    };
  }

  const image = await loadImage(new Blob([buffer], { type: sniffed.mime }));
  let width = image.naturalWidth || image.width;
  let height = image.naturalHeight || image.height;
  if (!width || !height) {
    const error = new Error('unsupported');
    error.code = 'unsupported';
    throw error;
  }
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let quality = 0.85;
  let blob;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (blob.size <= maxBytes) break;
    if (quality > 0.45) quality -= 0.1;
    else {
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
  }
  if (!blob || blob.size > maxBytes) {
    const error = new Error('too-big');
    error.code = 'too-big';
    throw error;
  }
  return {
    blob,
    fileName: `${crypto.randomUUID()}.jpg`,
    contentType: 'image/jpeg',
    width,
    height,
  };
}
