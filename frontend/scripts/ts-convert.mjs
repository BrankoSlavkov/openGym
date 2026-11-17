#!/usr/bin/env node
// Converts frontend files to TypeScript, one rename at a time (FORK.md, migration phase 4).
//
//   node scripts/ts-convert.mjs src/lib/onerm.js src/lib/onerm.test.js
//   node scripts/ts-convert.mjs --dry src/lib/format.js
//
// For each file: `git mv` x.js -> x.ts (x.tsx when it holds JSX; .jsx -> .tsx), then every relative
// import of it anywhere in frontend/, api/ and mcp/ is rewritten to the new name. Imports always
// name the real file: api/ and mcp/ load frontend/src/lib under plain Node (type stripping, no
// resolver), so `./onerm.js` would not find onerm.ts there. Typing the converted file is then done
// by hand; `vp check` (tsc) says what is missing.
//
// Plain string mentions that are not imports (mcp/scripts/check-node-loadable.mjs's module list,
// comments) are reported at the end, not rewritten.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, join, relative, resolve, basename, extname } from 'node:path'

const frontend = resolve(new URL('..', import.meta.url).pathname)
const repo = resolve(frontend, '..')
const args = process.argv.slice(2)
const dry = args.includes('--dry')
const files = args.filter(a => a !== '--dry').map(f => resolve(process.cwd(), f))
if (!files.length) { console.error('usage: node scripts/ts-convert.mjs [--dry] <file.js|file.jsx>...'); process.exit(1) }

const SCAN_ROOTS = ['frontend/src', 'frontend/web-only', 'frontend/scripts', 'frontend/vite.config.ts', 'api', 'mcp'].map(p => join(repo, p))
const CODE = /\.(m?js|jsx|ts|tsx|mts)$/
function* walk(p) {
  if (!existsSync(p)) return
  if (statSync(p).isFile()) { if (CODE.test(p)) yield p; return }
  for (const e of readdirSync(p, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue
    yield* walk(join(p, e.name))
  }
}

const hasJsx = src => /<[A-Za-z][\w.]*[\s/>]|<>/.test(src.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""'))
const target = f => {
  const ext = extname(f)
  if (ext === '.jsx') return f.slice(0, -4) + '.tsx'
  if (ext === '.js') return f.slice(0, -3) + (hasJsx(readFileSync(f, 'utf8')) ? '.tsx' : '.ts')
  throw new Error(`not a .js/.jsx file: ${f}`)
}

const moves = new Map()
for (const f of files) {
  if (!existsSync(f)) { console.error(`missing: ${relative(repo, f)}`); process.exit(1) }
  moves.set(f, target(f))
}

// import ... from '<spec>', export ... from '<spec>', import('<spec>'), vi.mock('<spec>'),
// vi.importActual('<spec>'), new URL('<spec>', import.meta.url), import '<spec>'
const SPEC = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bvi\.(?:mock|doMock|importActual|unmock)\s*\(\s*|\bnew URL\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g
let edits = 0
const touched = []
for (const file of new Set([...SCAN_ROOTS.flatMap(r => [...walk(r)])])) {
  const src = readFileSync(file, 'utf8')
  const dir = dirname(file)
  const out = src.replace(SPEC, (m, pre, q, spec) => {
    const [path, query = ''] = spec.split(/(?=\?)/)
    const abs = resolve(dir, path)
    const to = moves.get(abs)
    if (!to) return m
    edits++
    return `${pre}${q}${path.slice(0, path.length - basename(abs).length)}${basename(to)}${query}${q}`
  })
  if (out !== src) { touched.push(relative(repo, file)); if (!dry) writeFileSync(file, out) }
}

for (const [from, to] of moves) {
  console.log(`${relative(repo, from)} -> ${relative(repo, to)}`)
  if (!dry) execFileSync('git', ['mv', from, to], { cwd: repo })
}
console.log(`${edits} import(s) rewritten in ${touched.length} file(s)${dry ? ' (dry run)' : ''}`)

// Mentions that are not import specifiers: worth a look (module lists, docs).
const names = [...moves.keys()].map(f => basename(f))
let grep = ''
try {
  grep = execFileSync('git', ['grep', '-n', '-I', '-F', ...names.flatMap(n => ['-e', `'${n}'`]), '--', 'frontend', 'api', 'mcp'], { cwd: repo, encoding: 'utf8' })
} catch { /* git grep exits 1 when nothing matches */ }
const isImport = l => new RegExp(SPEC.source).test(l.split(':').slice(2).join(':'))
const loose = grep.split('\n').filter(Boolean).filter(l => !isImport(l))
if (loose.length) { console.log('\nStill named as plain strings (check by hand):'); for (const l of loose.slice(0, 40)) console.log('  ' + l) }
