// POST /api/ask  { question }  ->  NDJSON stream of agent events (see lib/agents.js).
// Deployed as a Vercel Function. Needs ANTHROPIC_API_KEY in the project's environment variables.

import { runAsk } from '../lib/agents.js';

const MAX_QUESTION = 300;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map(); // best-effort, per function instance

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const limited = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
};

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Send JSON like {"question": "..."}' });
  }

  const question = String(body?.question ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION);
  if (!question) return json(400, { error: 'Ask a question first.' });

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (limited(ip)) return json(429, { error: 'Too many questions in a minute. Try again shortly.' });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await runAsk(question, emit);
      } catch (err) {
        console.error('[ask] failed:', err);
        emit({ type: 'error', message: 'The live agents are unavailable right now.' });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
