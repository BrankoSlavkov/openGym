/* Every route the server registers has an OpenAPI definition, and nothing else has one.
 *
 * Upstream checked its hand-written openapi.yaml this way after sixteen routes (the whole AI Coach
 * surface) went undocumented with nothing noticing. Fork: the spec is code now (api/openapi/), and
 * the document is generated from it, so this compares the route table with those definitions. The
 * route table is one `'METHOD /path':` key per handler across a few files, read as text: importing
 * server.ts would start a server. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTE_BY_KEY, openApiDocument, OPENAPI_VERSION } from '../openapi/document.ts';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(API, f), 'utf8');

/** Every `'GET /api/x': ...` key in the route table. */
const routeKeys = src => [...src.matchAll(/^\s*'(GET|POST|PUT|PATCH|DELETE) (\/(?:api|\.well-known)\/[^']*)':/gm)].map(m => `${m[1]} ${m[2]}`);

const TABLE_FILES = [
  'server.ts', 'library/routes.ts', 'library/moderation.ts', 'coach/routes.ts', 'integrations/routes.ts',
  'oidc/routes.ts', 'live-session.ts', 'trainers/routes.ts', 'trainers/dashboard-routes.ts', 'openapi/serve.ts'
];

test('every route the server registers has an OpenAPI definition, and nothing else has one', () => {
  const routes = new Set(TABLE_FILES.flatMap(f => routeKeys(read(f))));
  const defined = new Set(ROUTE_BY_KEY.keys());
  assert.ok(routes.size > 40, `only found ${routes.size} routes — the route table moved`);
  assert.deepEqual([...routes].filter(r => !defined.has(r)).sort(), [], 'routes without a definition: add them to api/openapi/routes/');
  assert.deepEqual([...defined].filter(d => !routes.has(d)).sort(), [], 'definitions of routes the server does not serve');
  // The Coach surface in particular: upstream's test exists because all sixteen were missing.
  for (const r of ['GET /api/integrations', 'POST /api/integrations/connect', 'GET /api/coach/status', 'POST /api/coach/review', 'GET /api/admin/coach', 'POST /api/admin/coach/connect']) {
    assert.ok(defined.has(r), `${r} is missing from the spec`);
  }
});

test('the document is OpenAPI 3.2 with an operationId on every operation, none twice', () => {
  const doc = openApiDocument();
  assert.equal(doc.openapi, OPENAPI_VERSION);
  assert.equal(OPENAPI_VERSION, '3.2.0');
  const ids = Object.values(doc.paths ?? {}).flatMap(item => Object.values(item as Record<string, any>).map(op => op?.operationId).filter(Boolean));
  assert.equal(ids.length, ROUTE_BY_KEY.size, 'one operation per route');
  assert.equal(new Set(ids).size, ids.length, 'operationIds are unique (Orval names its functions after them)');
});

test('api/openapi.json is the document the code generates (run `bun run openapi`)', () => {
  const onDisk = JSON.parse(read('openapi.json'));
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(openApiDocument())), 'api/openapi.json is stale: run `bun run openapi` in api/');
});

test('every error code the e-mail and password signup routes return is in their spec entry', () => {
  const server = read('server.ts');
  const handler = key => {
    const start = server.indexOf(`  '${key}': async`);
    assert.ok(start >= 0, key);
    const next = server.slice(start + 1).search(/\n {2}'(GET|POST|PUT|DELETE) \//);
    return server.slice(start, next < 0 ? undefined : start + 1 + next);
  };
  const emailCodes = Object.fromEntries([...server.matchAll(/^\s{2}(\w+): \{ error: '[^']*', code: '([^']+)' \}/gm)].map(m => [m[1], m[2]]));
  const doc = openApiDocument();
  for (const [key, p, method] of [
    ['POST /api/register/password', '/api/register/password', 'post'],
    ['POST /api/account/email', '/api/account/email', 'post']
  ]) {
    const src = handler(key);
    const codes = new Set([
      ...[...src.matchAll(/code: '([^']+)'/g)].map(m => m[1]),
      ...[...src.matchAll(/EMAIL_ERRORS\.(\w+)/g)].map(m => emailCodes[m[1]])
    ]);
    assert.ok(codes.size > 1, key);
    const op = JSON.stringify(doc.paths?.[p]?.[method] ?? null);
    for (const c of codes) assert.ok(op.includes(c), `${key} returns "${c}" but its OpenAPI entry never mentions it`);
  }
});
