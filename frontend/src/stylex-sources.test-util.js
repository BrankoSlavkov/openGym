// Fork: helpers for the tests that guard CSS rules, now that most styles are StyleX objects in
// .ts/.tsx/.jsx sources rather than .css files. Not a test file itself (no `.test.` + suffix match).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const SRC = resolve(process.cwd(), 'src')
const SKIP = new Set(['generated', 'exercise-desc', 'exercise-names', 'instr', 'locales'])

/** Every source file under src/ that calls stylex.create, with its text (comments stripped). */
export function stylexSources(dir = SRC) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (!SKIP.has(name)) out.push(...stylexSources(full))
      continue
    }
    if (!/\.(ts|tsx|jsx|js)$/.test(name) || /\.test\./.test(name)) continue
    const raw = readFileSync(full, 'utf8')
    if (!raw.includes('stylex.create(')) continue
    out.push({ file: relative(SRC, full), src: raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1') })
  }
  return out
}

/** The named style objects of a source (`name: { ... }` at any depth), each with its body. */
export function styleObjects(src) {
  const out = []
  const re = /([A-Za-z_$][\w$]*|'[^']+'): \{/g
  let m
  while ((m = re.exec(src))) {
    let depth = 0
    for (let j = m.index + m[0].length - 1; j < src.length; j++) {
      if (src[j] === '{') depth++
      else if (src[j] === '}' && --depth === 0) { out.push({ name: m[1], body: src.slice(m.index + m[0].length - 1, j + 1) }); break }
    }
  }
  return out
}
