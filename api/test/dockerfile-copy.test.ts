/* Walk runtime imports against COPY coverage from the monorepo root. This catches a shared
 * dependency that works in the checkout but would be absent from the API image. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '../..');
const dockerfile = fs.readFileSync(path.join(ROOT, 'api/Dockerfile'), 'utf8');
const copied = [...dockerfile.matchAll(/^COPY\s+(?! --)([^\s]+)\s+([^\s]+)\s*$/gm)]
  .filter(([, source]) => !source.startsWith('--'))
  .map(([, source]) => source.replace(/\/$/, ''));
const covered = (file: string) => copied.some(source => file === source || file.startsWith(`${source}/`));
const imports = (source: string) => [...source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)['"](\.{1,2}\/[^'"]+)['"]/gm)].map(match => match[1]);

test('the API and shared workspace are copied from the repository root', () => {
  assert.ok(copied.includes('api'));
  assert.ok(copied.includes('packages'));
  assert.match(dockerfile, /CMD \["bun", "run", "start"\]/);
});

test('every relative runtime module is covered by the API image COPY instructions', () => {
  const queue = ['api/server.ts', 'scripts/start.ts'];
  const seen = new Set<string>();
  while (queue.length) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    assert.ok(covered(file), `Dockerfile must copy ${file}`);
    const absolute = path.join(ROOT, file);
    assert.ok(fs.existsSync(absolute), `${file} exists`);
    for (const specifier of imports(fs.readFileSync(absolute, 'utf8'))) {
      const relative = path.relative(ROOT, path.resolve(path.dirname(absolute), specifier));
      assert.ok(!relative.startsWith('..'), `${file} stays in the workspace`);
      if (/\.(?:ts|m?js)$/.test(relative)) queue.push(relative);
    }
  }
  assert.ok(seen.has('api/oidc/config.ts'));
  assert.ok(seen.has('api/coach/jobs.ts'));
  assert.ok([...seen].some(file => file.startsWith('packages/shared/')));
});
