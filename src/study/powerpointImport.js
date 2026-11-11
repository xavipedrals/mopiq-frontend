import { openOfficeArchive } from './officeArchive.js';
import { MAX_IMPORT_BYTES } from './magicImport.js';

const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const STRICT_P = 'http://purl.oclc.org/ooxml/presentationml/main';
const STRICT_A = 'http://purl.oclc.org/ooxml/drawingml/main';
const STRICT_R = 'http://purl.oclc.org/ooxml/officeDocument/relationships';
const PAGE_SEPARATOR = '\n\n---\n\n';
const pause = () => new Promise(resolve => setTimeout(resolve, 0));

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

/** Read slide text and speaker notes locally before submitting a generation job. */
export async function extractPowerPoint(file, { onProgress = () => {}, signal } = {}) {
  if (!file.name?.toLowerCase().endsWith('.pptx')) throw Object.assign(new Error('Choose a .pptx file.'), { code: 'file_type' });
  if (file.size > MAX_IMPORT_BYTES) throw Object.assign(new Error('File is too large.'), { code: 'file_too_large' });
  const start = performance.now();
  const archive = await openOfficeArchive(file, { signal });
  const { readXml, metrics } = archive;
  try {
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
    if (!pages.some(page => page.text.trim())) throw Object.assign(new Error('No readable presentation text.'), { code: 'pptx_empty' });
    const text = pages.map(page => page.text).join(PAGE_SEPARATOR);
    return { pages, text, metrics: { ...metrics, slides: pages.length, nonemptySlides: pages.filter(p => p.text).length,
      slidesWithNotes: pages.filter(p => p.notes).length, characters: text.length, textBytes: new TextEncoder().encode(text).length,
      durationMs: performance.now() - start } };
  } finally { await archive.close(); }
}

