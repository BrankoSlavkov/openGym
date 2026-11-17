#!/usr/bin/env node
// What upstream changed since our last port, and where each change lands in this fork
// (.claude/skills/port-upstream/SKILL.md). Read-only: it fetches and reports, it never merges.
//
//   node scripts/upstream-changes.mjs                 # base (.fork/upstream-base) .. upstream/main
//   node scripts/upstream-changes.mjs v1.4.7          # .. a tag or any upstream ref
//   node scripts/upstream-changes.mjs --no-fetch      # skip `git fetch upstream`
//   node scripts/upstream-changes.mjs --diff          # the whole diff, removed paths left out
//   node scripts/upstream-changes.mjs --diff <sha>    # one commit's diff, removed paths left out
//
// Each changed file is classified:
//   same     the fork has the file at the same path
//   moved    the fork has it elsewhere (.js -> .ts/.tsx, .jsx -> .tsx, or a .fork/path-map line)
//   removed  the path is in .fork/removed-paths: nothing to port
//   dropped  .fork/path-map maps it to "-": its job is gone here
//   new      upstream added it and the fork has no counterpart yet
//   missing  upstream changed a file the fork cannot find: look for where it went (and add a
//            .fork/path-map line once you know)
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })
const lines = f => existsSync(join(root, f))
  ? readFileSync(join(root, f), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  : []

const args = process.argv.slice(2)
const flag = n => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true }
const noFetch = flag('--no-fetch')
const diffAt = args.indexOf('--diff')
let diff = null
if (diffAt >= 0) {
  const next = args[diffAt + 1]
  diff = next && /^[0-9a-f]{6,40}$/i.test(next) ? next : 'all'
  args.splice(diffAt, diff === 'all' ? 1 : 2)
}
const target = args[0] || 'upstream/main'

const base = readFileSync(join(root, '.fork/upstream-base'), 'utf8').trim()
const removed = lines('.fork/removed-paths')
const pathMap = new Map(lines('.fork/path-map').map(l => l.split(/\t+/)).filter(p => p.length >= 2).map(([a, b]) => [a, b]))

if (!noFetch) execFileSync('git', ['fetch', '-q', 'upstream', '--tags'], { cwd: root, stdio: 'inherit' })

const isRemoved = p => removed.some(r => p === r || p.startsWith(r.replace(/\/$/, '') + '/'))
const here = p => existsSync(join(root, p))
function locate(p) {
  if (pathMap.has(p)) { const to = pathMap.get(p); return to === '-' ? ['dropped', null] : ['moved', to] }
  if (isRemoved(p)) return ['removed', null]
  if (here(p)) return ['same', p]
  const swaps = p.endsWith('.jsx') ? [p.replace(/\.jsx$/, '.tsx')]
    : p.endsWith('.js') ? [p.replace(/\.js$/, '.ts'), p.replace(/\.js$/, '.tsx')] : []
  const hit = swaps.find(here)
  return hit ? ['moved', hit] : [null, null]
}

const excludes = removed.map(r => `:(exclude)${r}`)
if (diff) {
  const out = diff === 'all'
    ? git('diff', '-M', base, target, '--', '.', ...excludes)
    : git('show', '-M', '--format=fuller', diff, '--', '.', ...excludes)
  process.stdout.write(out)
  process.exit(0)
}

const shas = git('rev-list', '--reverse', '--no-merges', `${base}..${target}`).split('\n').filter(Boolean)
const tip = git('rev-parse', target).trim()
console.log(`Upstream ${base.slice(0, 9)}..${tip.slice(0, 9)} (${target}): ${shas.length} commit(s)\n`)
if (!shas.length) { console.log('Nothing to port.'); process.exit(0) }

const totals = {}
let skippable = 0
for (const sha of shas) {
  const [subject, date] = git('show', '-s', '--format=%s%x00%as', sha).trim().split('\0')
  const files = git('diff-tree', '--no-commit-id', '-r', '-M', '--name-status', sha).split('\n').filter(Boolean)
  const rows = files.map(f => {
    const [st, a, b] = f.split('\t')
    const p = b || a
    let [kind, at] = locate(p)
    if (!kind && st.startsWith('R') && a) [kind, at] = locate(a)
    if (!kind) kind = st === 'A' || st.startsWith('C') ? 'new' : st === 'D' ? 'removed' : 'missing'
    totals[kind] = (totals[kind] || 0) + 1
    return { st: st[0], p, kind, at }
  })
  const allGone = rows.every(r => r.kind === 'removed' || r.kind === 'dropped')
  if (allGone) skippable++
  console.log(`${sha.slice(0, 9)} ${date} ${subject}${allGone ? '   [skip: removed paths only]' : ''}`)
  for (const r of rows) {
    if (allGone) continue
    const where = r.kind === 'moved' ? ` -> ${r.at}` : ''
    console.log(`    ${r.st} ${r.kind.padEnd(7)} ${r.p}${where}`)
  }
}
console.log(`\nFiles: ${Object.entries(totals).map(([k, n]) => `${n} ${k}`).join(', ')}. ` +
  `${skippable} of ${shas.length} commit(s) touch removed paths only.`)
console.log(`When done, write ${tip} to .fork/upstream-base.`)
