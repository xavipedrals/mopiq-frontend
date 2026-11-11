import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4187);
const host = process.env.HOST || '127.0.0.1';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const server = createServer(async (req, res) => {
 try {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (path === '/') path = '/index.html';
  const file = resolve(root, '.' + path);
  if (!file.startsWith(root + sep) || path.split('/').some(p => p.startsWith('.') && p !== '.')) { res.writeHead(403); res.end(); return; }
  const info = await stat(file);
  if (!info.isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(req.method === 'HEAD' ? undefined : await readFile(file));
 } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, host, () => console.log(`PPTX browser lab: http://${host}:${port}`));
