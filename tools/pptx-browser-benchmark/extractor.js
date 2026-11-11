import { BlobReader, ZipReader, Uint8ArrayWriter } from './node_modules/@zip.js/zip.js/index.js';

const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const STRICT_P = 'http://purl.oclc.org/ooxml/presentationml/main';
const STRICT_A = 'http://purl.oclc.org/ooxml/drawingml/main';
const STRICT_R = 'http://purl.oclc.org/ooxml/officeDocument/relationships';
const MAX_XML_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_XML_BYTES = 64 * 1024 * 1024;
const PAGE_SEPARATOR = '\n\n---\n\n';
const pause = () => new Promise(resolve => setTimeout(resolve, 0));

function xmlDocument(bytes) {
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  if (/<!DOCTYPE/i.test(text)) throw new Error('Document types are not supported.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Unreadable PowerPoint XML.');
  return doc;
}
function isDrawing(node, local) {
  return node.localName === local && [A, STRICT_A].includes(node.namespaceURI);
}
function drawingText(root) {
  let text = '';
  const walk = node => {
    if (isDrawing(node, 't')) { text += node.textContent; return; }
    if (isDrawing(node, 'br')) text += '\n';
    for (const child of node.children || []) walk(child);
    if (isDrawing(node, 'p') && text && !text.endsWith('\n')) text += '\n';
  };
  walk(root);
  return text.trim();
}
function notesText(doc) {
  const shapes = [...doc.getElementsByTagNameNS('*', 'sp')].filter(shape =>
    [...shape.getElementsByTagNameNS('*', 'ph')].some(ph => ph.getAttribute('type') === 'body'));
  return shapes.map(drawingText).filter(Boolean).join('\n').trim() || drawingText(doc.documentElement);
}
function relations(doc) {
  return [...doc.getElementsByTagNameNS('*', 'Relationship')].map(el => ({
    id: el.getAttribute('Id'), type: el.getAttribute('Type'),
    target: el.getAttribute('Target'), external: el.getAttribute('TargetMode') === 'External',
  }));
}
function resolvePart(owner, relation) {
  if (relation.external) throw new Error('External presentation parts are not supported.');
  const target = decodeURIComponent(relation.target || '');
  if (!target || /[\\:#?]/.test(target)) throw new Error('Invalid presentation relationship.');
  const parts = target.startsWith('/') ? [] : owner.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') { if (!parts.length) throw new Error('Part is outside the presentation.'); parts.pop(); }
    else parts.push(part);
  }
  return parts.join('/');
}
function relationshipPath(part) {
  const segments = part.split('/');
  const file = segments.pop();
  return [...segments, '_rels', file + '.rels'].join('/');
}

/** Standalone experiment: no Supabase, uploads, AI calls, or production imports. */
export async function extractPowerPoint(file, { onProgress = () => {}, signal } = {}) {
  if (!file.name?.toLowerCase().endsWith('.pptx')) throw new Error('Choose a .pptx file.');
  if (file.size > 150 * 1024 * 1024) throw new Error('This experiment allows files up to 150 MiB.');
  const metrics = { inputBytes: file.size, archiveReadBytes: 0, inflatedXmlBytes: 0, xmlReadMs: 0, xmlParseMs: 0 };
  class MeasuredBlobReader extends BlobReader {
    async readUint8Array(offset, length) {
      const bytes = await super.readUint8Array(offset, length);
      metrics.archiveReadBytes += bytes.length;
      return bytes;
    }
  }
  const start = performance.now();
  const reader = new ZipReader(new MeasuredBlobReader(file), { useWebWorkers: true, checkSignature: true, signal });
  try {
    const entries = new Map();
    for await (const entry of reader.getEntriesGenerator()) {
      if (entries.size >= 20_000 || entries.has(entry.filename)) throw new Error('Too many or duplicate ZIP entries.');
      entries.set(entry.filename, entry);
    }
    metrics.archiveEntries = entries.size;
    metrics.mediaEntriesSkipped = [...entries.keys()].filter(path => /\/media\//.test(path)).length;
    async function readXml(path, optional = false) {
      signal?.throwIfAborted();
      const entry = entries.get(path);
      if (!entry && optional) return null;
      if (!entry) throw new Error('Missing document part: ' + path);
      if (entry.uncompressedSize > MAX_XML_BYTES || metrics.inflatedXmlBytes + entry.uncompressedSize > MAX_TOTAL_XML_BYTES) throw new Error('Too much decompressed XML.');
      const beforeRead = performance.now();
      const bytes = await entry.getData(new Uint8ArrayWriter(), { signal, onprogress(size) {
        if (size > MAX_XML_BYTES) throw new Error('Too much decompressed XML.');
      } });
      metrics.xmlReadMs += performance.now() - beforeRead;
      metrics.inflatedXmlBytes += bytes.length;
      if (bytes.length > MAX_XML_BYTES || metrics.inflatedXmlBytes > MAX_TOTAL_XML_BYTES) throw new Error('Too much decompressed XML.');
      const beforeParse = performance.now();
      const doc = xmlDocument(bytes);
      metrics.xmlParseMs += performance.now() - beforeParse;
      return doc;
    }
    // OPC root relationships identify the presentation part rather than assuming its path.
    const root = relations(await readXml('_rels/.rels'));
    const office = root.find(rel => rel.type?.endsWith('/officeDocument'));
    if (!office) throw new Error('This is not a PowerPoint presentation.');
    const presentation = resolvePart('', office);
    const doc = await readXml(presentation);
    const ids = [...doc.getElementsByTagNameNS('*', 'sldId')].filter(el => [P, STRICT_P].includes(el.namespaceURI))
      .map(el => el.getAttributeNS(R, 'id') || el.getAttributeNS(STRICT_R, 'id'));
    if (!ids.length || ids.length > 1000) throw new Error('Choose a presentation with 1–1,000 slides.');
    const slideRels = relations(await readXml(relationshipPath(presentation)));
    const pages = [];
    for (const id of ids) {
      const relation = slideRels.find(rel => rel.id === id && rel.type?.endsWith('/slide'));
      if (!relation) throw new Error('Missing slide relationship.');
      const path = resolvePart(presentation, relation);
      const slide = await readXml(path);
      const slideText = drawingText(slide.documentElement);
      let notes = '';
      const relDoc = await readXml(relationshipPath(path), true);
      const noteRel = relDoc && relations(relDoc).find(rel => rel.type?.endsWith('/notesSlide'));
      if (noteRel) notes = notesText(await readXml(resolvePart(path, noteRel)));
      pages.push({ page: pages.length + 1, slideText, notes, text: slideText + (notes ? (slideText ? '\n\n' : '') + 'Notes:\n' + notes : '') });
      onProgress(pages.length, ids.length);
      if (pages.length % 5 === 0) await pause();
    }
    const text = pages.map(page => page.text).join(PAGE_SEPARATOR);
    return { pages, text, metrics: { ...metrics, slides: pages.length, nonemptySlides: pages.filter(p => p.text).length,
      slidesWithNotes: pages.filter(p => p.notes).length, characters: text.length, textBytes: new TextEncoder().encode(text).length,
      durationMs: performance.now() - start } };
  } finally { await reader.close(); }
}

export async function benchmarkFile(file, options = {}) {
  let lastTick = performance.now(), maxTimerGapMs = 0, peakHeap = performance.memory?.usedJSHeapSize || null;
  const initialHeap = peakHeap;
  const timer = setInterval(() => {
    const now = performance.now();
    maxTimerGapMs = Math.max(maxTimerGapMs, now - lastTick);
    lastTick = now;
    if (performance.memory) peakHeap = Math.max(peakHeap || 0, performance.memory.usedJSHeapSize);
  }, 16);
  const longTasks = [];
  const supported = PerformanceObserver.supportedEntryTypes.includes('longtask');
  const observer = supported ? new PerformanceObserver(list => longTasks.push(...list.getEntries())) : null;
  observer?.observe({ type: 'longtask' });
  try {
    const result = await extractPowerPoint(file, options);
    await pause();
    longTasks.push(...(observer?.takeRecords() || []));
    const digest = globalThis.crypto?.subtle ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(result.text)) : null;
    return { ...result, metrics: { ...result.metrics, maxTimerGapMs, longTasks: supported ? longTasks.length : null,
      maxLongTaskMs: supported ? Math.max(0, ...longTasks.map(t => t.duration)) : null,
      approximatePeakJsHeapBytes: peakHeap, approximateJsHeapGrowthBytes: initialHeap == null ? null : Math.max(0, peakHeap - initialHeap),
      textSha256: digest == null ? null : [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('') } };
  } finally { clearInterval(timer); observer?.disconnect(); }
}
