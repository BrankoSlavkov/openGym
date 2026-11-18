import { describe, it, expect, afterEach } from 'vitest'
import { t, tn, _setLangState } from './i18n-core.js'
import ru from '../locales/ru.js'
import de from '../locales/de.js'
import uk from '../locales/uk.js'
import pl from '../locales/pl.js'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Every plural key the app actually asks tn() for, read off the source.
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])
const tnKeys = () => {
  const keys = new Set()
  const re = /\btn\(\s*(['"`])((?:\\.|(?!\1).)*)\1\s*,\s*(['"`])((?:\\.|(?!\3).)*)\3/gs
  for (const f of walk(SRC)) {
    if (!/\.(jsx?|mjs)$/.test(f) || /\.test\./.test(f) || /[\\/]locales[\\/]/.test(f)) continue
    const s = readFileSync(f, 'utf8')
    let m
    while ((m = re.exec(s))) keys.add(m[4])
  }
  return [...keys]
}

describe('tn() — plural forms from the pack', () => {
  afterEach(() => _setLangState('en', {}, null, null))

  it('falls back to the English two-form split with no pack', () => {
    _setLangState('en', {}, null, null)
    expect(tn('{0} exercise', '{0} exercises', 1)).toBe('1 exercise')
    expect(tn('{0} exercise', '{0} exercises', 2)).toBe('2 exercises')
    expect(tn('{0} exercise', '{0} exercises', 0)).toBe('0 exercises')
  })

  it('has a form for every plural key the Russian pack declares', () => {
    for (const [key, value] of Object.entries(ru)) {
      if (!value || typeof value !== 'object') continue
      expect(Object.keys(value), key).toEqual(expect.arrayContaining(['one', 'few', 'many']))
      for (const form of Object.values(value)) expect(typeof form, key).toBe('string')
    }
  })

})
