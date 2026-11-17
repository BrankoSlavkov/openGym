#!/usr/bin/env bun
/* Fork: the one-time move of api/ from JavaScript to TypeScript (FORK.md, "The api on Bun and
 * Hono"). Kept for the record and for upstream files that arrive later as .js: run it on them.
 *
 *   bun scripts/ts-convert.ts                 every .js/.mjs under api/ (see SKIP)
 *   bun scripts/ts-convert.ts library/new.js  just these
 *
 * It renames each file to .ts and rewrites every quoted relative path that names a renamed file,
 * in the renamed files and in the rest of api/: import specifiers, dynamic imports, and the
 * string paths the tests spawn or read ('server.ts' with cwd api/, path.join(API, 'x.js')).
 * A path is rewritten when it resolves to a renamed file from the file's own folder or from api/.
 */
import fs from 'node:fs';
import path from 'node:path';

const API = path.resolve(import.meta.dir, '..');

// Shared with the frontend, which imports them as .js from files this fork does not own yet:
// api/coach/core/ converts with the frontend's TypeScript phase. scripts/check-core-loadable.mjs
// checks that core under plain node, so it stays a node script.
const SKIP = [/^node_modules\//, /^coach\/core\//, /^scripts\/check-core-loadable\.mjs$/];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(API, p);
    if (SKIP.some(r => r.test(rel + (e.isDirectory() ? '/' : '')))) continue;
    if (e.isDirectory()) walk(p, out);
    else out.push(rel);
  }
  return out;
}

const all = walk(API);
const picked = process.argv.slice(2).length ? process.argv.slice(2).map(f => path.relative(API, path.resolve(f))) : all;
const targets = picked.filter(f => /\.(m?js)$/.test(f) && !/\.d\.ts$/.test(f));
const renamed = new Map(targets.map(f => [f, f.replace(/\.m?js$/, '.ts')]));

const SOURCE = /\.(m?js|ts)$/;
const QUOTED = /(['"`])((?:\.{1,2}\/|[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.m?js)\1/g;

function rewrite(text: string, fileRel: string): string {
  const dir = path.dirname(fileRel);
  return text.replace(QUOTED, (whole, q: string, spec: string) => {
    for (const base of [dir, '.']) {
      const target = path.normalize(path.join(base, spec));
      const to = renamed.get(target);
      if (to) return q + spec.replace(/\.m?js$/, '.ts') + q;
    }
    return whole;
  });
}

// A plain rename, not git mv: the index is left alone (another change may be staged in this checkout).
for (const [from, to] of renamed) fs.renameSync(path.join(API, from), path.join(API, to));

const after = walk(API).filter(f => SOURCE.test(f));
let touched = 0;
for (const f of after) {
  const p = path.join(API, f);
  const text = fs.readFileSync(p, 'utf8');
  const next = rewrite(text, f);
  if (next !== text) { fs.writeFileSync(p, next); touched++; }
}
console.log(`renamed ${renamed.size} files, rewrote paths in ${touched}`);
