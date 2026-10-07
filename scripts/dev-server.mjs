// Local preview: serves the static site and the /api/ask agents endpoint.
//   npm run dev        -> live agents (uses ANTHROPIC_API_KEY or your `ant auth login` profile)
//   npm run dev:mock   -> same UI and event stream, answered from local data, no API calls

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POST as ask } from '../api/ask.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveApi(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: 'POST',
    headers: req.headers,
    body: Buffer.concat(chunks),
  });
  const response = await ask(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  for await (const chunk of response.body) res.write(chunk);
  res.end();
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}

http
  .createServer((req, res) => {
    const route = req.method === 'POST' && req.url.startsWith('/api/ask') ? serveApi : serveStatic;
    route(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  })
  .listen(port, () => {
    const mode = process.env.AGENTS_MOCK === '1' ? 'mock agents' : 'live agents';
    console.log(`Portfolio running at http://localhost:${port} (${mode})`);
  });
