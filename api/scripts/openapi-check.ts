#!/usr/bin/env bun
/* Fork: runs the whole test suite with OPENAPI_RESPONSES=check (openapi/validate.ts) and fails if
 * any JSON answer did not match its route's documented response: a status the route does not
 * document, a field the schema does not name, or a value of another type. The frontend's Orval
 * client is typed from those schemas, so this is what keeps it honest.
 *
 *   bun run openapi:check
 *
 * Requests the check refused are listed too, but do not fail it: the tests send malformed requests
 * on purpose. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const report = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'openapi-check-')), 'report.txt');
const run = Bun.spawnSync(['bun', 'test', '--parallel', '--timeout', '120000', './test/'], {
  cwd: path.join(import.meta.dir, '..'),
  env: { ...process.env, OPENAPI_RESPONSES: 'check', OPENAPI_REPORT: report },
  stdout: 'inherit', stderr: 'inherit'
});
const lines = fs.existsSync(report) ? fs.readFileSync(report, 'utf8').split('\n').filter(Boolean) : [];
const count = (xs: string[]) => [...xs.reduce((m, l) => m.set(l, (m.get(l) || 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
const refused = lines.filter(l => l.includes(' request refused: '));
const wrong = lines.filter(l => !l.includes(' request refused: '));
if (refused.length) console.log(`\n${refused.length} request(s) refused by the check (the tests send these on purpose):`);
for (const [l, n] of count(refused)) console.log(`  ${n}× ${l}`);
if (wrong.length) {
  console.error(`\n${wrong.length} answer(s) the spec does not describe:`);
  for (const [l, n] of count(wrong)) console.error(`  ${n}× ${l}`);
}
if (run.exitCode !== 0) console.error('\nthe test suite itself failed');
process.exit(wrong.length || run.exitCode !== 0 ? 1 : 0);
