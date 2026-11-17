/* The server-side fetch must outlast the provider's slowest legitimate answer: a local model
 * that needs six minutes must not fail as "could not reach" at five, which is how upstream's
 * first staging run died on Node's undici defaults. Fork: on Bun there is no dispatcher; the
 * budget is an abort signal derived from the job timeout (coach/node-fetch.js). */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const { fetchFor, budgetFor } = await import('../coach/node-fetch.ts');

function slowServer(delayMs) {
  const server = http.createServer((req, res) => setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end('{"ok":true}'); }, delayMs));
  return new Promise<{ url: string; close: () => void }>(r => server.listen(0, '127.0.0.1', () => r({ url: `http://127.0.0.1:${(server.address() as { port: number }).port}/`, close: () => server.close() })));
}

test('the job fetch waits for a slow provider', async () => {
  const s: any = await slowServer(2500);
  try {
    const r = await fetchFor(60000)(s.url);
    assert.equal((await r.json()).ok, true);
  } finally { s.close(); }
});

test('the transport budget follows the job timeout and never drops below a minute plus grace', () => {
  assert.ok(budgetFor(25 * 60000) >= 25 * 60000);
  assert.ok(budgetFor(1000) >= 60000);
  assert.ok(budgetFor(300000) > 300000, 'longer than the job timeout, so the job aborts first');
});

test('an AbortController still wins over the transport budget', async () => {
  const s: any = await slowServer(1500);
  try {
    const ctl = new AbortController();
    setTimeout(() => ctl.abort(), 100);
    await assert.rejects(fetchFor(60000)(s.url, { signal: ctl.signal }), (e: any) => e.name === 'AbortError');
  } finally { s.close(); }
});
