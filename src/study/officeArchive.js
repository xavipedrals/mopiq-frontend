import { BlobReader, ZipReader, Uint8ArrayWriter, configure } from '@zip.js/zip.js';
import workerURI from '@zip.js/zip.js/dist/zip-web-worker.js?url';
import wasmURI from '@zip.js/zip.js/dist/zip-module.wasm?url';

configure({ workerURI, wasmURI, maxWorkers: 2 });

const MAX_TOTAL_XML_BYTES = 64 * 1024 * 1024;

function xmlDocument(bytes) {
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  if (/<!DOCTYPE/i.test(text)) throw new Error('Document types are not supported.');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Unreadable Office document XML.');
  return doc;
}
export async function openOfficeArchive(file, { signal, maxXmlBytes = 4 * 1024 * 1024 } = {}) {
  const metrics = { inputBytes: file.size, archiveReadBytes: 0, inflatedXmlBytes: 0, xmlReadMs: 0, xmlParseMs: 0 };
  class MeasuredBlobReader extends BlobReader {
    async readUint8Array(offset, length) {
      const bytes = await super.readUint8Array(offset, length);
      metrics.archiveReadBytes += bytes.length;
      return bytes;
    }
  }
  const reader = new ZipReader(new MeasuredBlobReader(file), { useWebWorkers: true, checkSignature: true, signal });
  try {
    const entries = new Map();
    for await (const entry of reader.getEntriesGenerator()) {
      signal?.throwIfAborted();
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
      if (entry.uncompressedSize > maxXmlBytes || metrics.inflatedXmlBytes + entry.uncompressedSize > MAX_TOTAL_XML_BYTES) throw new Error('Too much decompressed XML.');
      const beforeRead = performance.now();
      const bytes = await entry.getData(new Uint8ArrayWriter(), { signal, onprogress(size) {
        if (size > maxXmlBytes) throw new Error('Too much decompressed XML.');
      } });
      metrics.xmlReadMs += performance.now() - beforeRead;
      metrics.inflatedXmlBytes += bytes.length;
      if (bytes.length > maxXmlBytes || metrics.inflatedXmlBytes > MAX_TOTAL_XML_BYTES) throw new Error('Too much decompressed XML.');
      const beforeParse = performance.now();
      const doc = xmlDocument(bytes);
      metrics.xmlParseMs += performance.now() - beforeParse;
      return doc;
    }
    return { readXml, metrics, close: () => reader.close() };
  } catch (error) { await reader.close(); throw error; }
}
