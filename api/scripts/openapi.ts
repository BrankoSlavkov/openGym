#!/usr/bin/env bun
/* Fork: writes api/openapi.json, the OpenAPI 3.2 document the route definitions (api/openapi/)
 * generate, for tools that read a file: the frontend's Orval client above all. The server serves
 * the same document at GET /api/openapi.json; test/openapi-routes.test.ts fails when this file is
 * stale.
 *
 *   bun run openapi            write it
 *   bun run openapi --check    exit 1 if it is stale
 */
import fs from 'node:fs';
import path from 'node:path';
import { openApiDocument } from '../openapi/document.ts';

const file = path.join(import.meta.dir, '..', 'openapi.json');
const text = JSON.stringify(openApiDocument(), null, 2) + '\n';
if (process.argv.includes('--check')) {
  const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text;
  if (!same) { console.error('api/openapi.json is stale: run `bun run openapi` in api/'); process.exit(1); }
  console.log('api/openapi.json is up to date');
} else {
  fs.writeFileSync(file, text);
  console.log(`wrote api/openapi.json (${Object.keys(openApiDocument().paths ?? {}).length} paths)`);
}
