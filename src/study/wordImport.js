import { openOfficeArchive } from './officeArchive.js';
import { MAX_IMPORT_BYTES } from './magicImport.js';

const W = new Set([
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'http://purl.oclc.org/ooxml/wordprocessingml/main',
]);
const PAGE_SEPARATOR = '\n\n---\n\n';
const pause = () => new Promise(resolve => setTimeout(resolve, 0));
const local = node => W.has(node.namespaceURI) ? node.localName : '';
const attribute = (node, name) => [...node.attributes].find(attr => attr.localName === name)?.value || '';

// Swift counterpart: WordprocessingMLTextParser / OpenTable in WordTextExtractor.swift.
class WordTextParser {
  output = '';
  paragraph = '';
  listParagraph = false;
  deletionDepth = 0;
  tables = [];

  appendBlock(text) {
    const value = this.tables.length ? text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).join(' ') : text;
    if (!value) return;
    const table = this.tables.at(-1);
    if (table) {
      table.cell = table.cell ? table.cell + ' ' + value : value;
      return;
    }
    if (this.output && !this.output.endsWith('\n')) this.output += '\n';
    if (this.output && !this.output.endsWith('\n\n') && text.includes('\n')) this.output += '\n';
    this.output += value + '\n';
  }
  flushParagraph() {
    let text = this.paragraph.trim();
    this.paragraph = '';
    if (!text) return;
    if (this.listParagraph) text = '• ' + text;
    this.listParagraph = false;
    this.appendBlock(text);
  }
  endCell() {
    const table = this.tables.at(-1);
    if (!table?.cellOpen) return;
    table.row.push(table.cell.trim());
    table.cell = '';
    table.cellOpen = false;
  }
  endRow() {
    const table = this.tables.at(-1);
    if (!table) return;
    this.endCell();
    if (table.row.some(Boolean)) table.rows.push(table.row);
    table.row = [];
  }
  pageBreak() {
    this.flushParagraph();
    if (this.tables.length || !this.output.trim() || this.output.endsWith(PAGE_SEPARATOR)) return;
    if (!this.output.endsWith('\n')) this.output += '\n';
    this.output += PAGE_SEPARATOR;
  }
  open(node) {
    const tag = local(node);
    if (tag === 'del' || tag === 'moveFrom') { this.deletionDepth += 1; return; }
    if (this.deletionDepth) return;
    switch (tag) {
      case 'p': this.paragraph = ''; this.listParagraph = false; break;
      case 'numPr': this.listParagraph = true; break;
      case 't': this.paragraph += node.textContent || ''; break;
      case 'tab': this.paragraph += '\t'; break;
      case 'br': case 'cr':
        if (attribute(node, 'type') === 'page') this.pageBreak();
        else this.paragraph += '\n';
        break;
      case 'lastRenderedPageBreak': this.pageBreak(); break;
      case 'tbl': this.flushParagraph(); this.tables.push({rows:[],row:[],cell:'',cellOpen:false}); break;
      case 'tr': this.endRow(); break;
      case 'tc': {
        const table = this.tables.at(-1);
        if (table) { this.endCell(); table.cellOpen = true; }
        break;
      }
    }
  }
  close(node) {
    const tag = local(node);
    if (tag === 'del' || tag === 'moveFrom') { this.deletionDepth -= 1; return; }
    if (this.deletionDepth) return;
    switch (tag) {
      case 'p': this.flushParagraph(); break;
      case 'tc': this.endCell(); break;
      case 'tr': this.endRow(); break;
      case 'tbl': {
        this.endRow();
        const table = this.tables.pop();
        if (table) this.appendBlock(table.rows.map(row => row.join(' | ')).join('\n'));
        break;
      }
    }
  }
}

// Iterative traversal avoids call-stack limits on nested Word XML. Progress is
// actual document processing, not estimated page numbers or a simulated timer.
export async function extractWordDocumentText(doc, { signal, onProgress = () => {} } = {}) {
  if (local(doc.documentElement) !== 'document') throw new Error('Not a Word document.');
  const body = [...doc.documentElement.children].find(node => local(node) === 'body');
  if (!body) throw new Error('Missing Word document body.');
  const total = body.getElementsByTagName('*').length * 2;
  const parser = new WordTextParser();
  const stack = [...body.children].reverse().map(node => ({node, closing:false}));
  let current = 0, lastYield = performance.now();
  onProgress(0, total);
  while (stack.length) {
    signal?.throwIfAborted();
    const {node, closing} = stack.pop();
    if (closing) parser.close(node);
    else {
      parser.open(node);
      stack.push({node, closing:true});
      for (let index = node.children.length - 1; index >= 0; index--) stack.push({node:node.children[index],closing:false});
    }
    current += 1;
    if (current % 2048 === 0 || performance.now() - lastYield >= 8) {
      onProgress(current, total);
      await pause();
      lastYield = performance.now();
    }
  }
  onProgress(total, total);
  const text = parser.output.trim();
  if (!text) throw Object.assign(new Error('No readable document text.'), {code:'docx_empty'});
  return text;
}

export async function extractWord(file, { signal, onProgress } = {}) {
  if (!file.name?.toLowerCase().endsWith('.docx')) throw Object.assign(new Error('Choose a .docx file.'), {code:'file_type'});
  if (file.size > MAX_IMPORT_BYTES) throw Object.assign(new Error('File is too large.'), {code:'file_too_large'});
  // A Word file contains its document body in one XML part, unlike PPTX slides.
  const archive = await openOfficeArchive(file, {signal, maxXmlBytes:32 * 1024 * 1024});
  try {
    const relationships = await archive.readXml('_rels/.rels');
    const relation = [...relationships.getElementsByTagNameNS('*','Relationship')].find(node => node.getAttribute('Type')?.endsWith('/officeDocument'));
    if (!relation || relation.getAttribute('TargetMode') === 'External') throw new Error('Missing internal Word document.');
    const target = decodeURIComponent(relation.getAttribute('Target') || '').replace(/^\//,'');
    if (!target || target.split('/').some(part => part === '..' || part === '.') || /[\\:#?]/.test(target)) throw new Error('Invalid Word document path.');
    const doc = await archive.readXml(target);
    const text = await extractWordDocumentText(doc, {signal,onProgress});
    return {text};
  } finally { await archive.close(); }
}
