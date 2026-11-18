import { afterEach, describe, expect, test } from 'vitest'
import da from '../locales/da.js'
import { DATE_LOCALES, LANGS, _setLangState, t, tn } from './i18n-core.js'
import { matchLocale } from './default-lang.ts'

// #1039: Danish, started by a native speaker, the rest filled in at merge time.
describe('Danish locale', () => {
  afterEach(() => _setLangState('en', {}, null, null))

  test('carries no leftover keys that no other pack has (the old exercise list)', () => {
    expect(Object.keys(da).some(k => / variation \d+$/.test(k))).toBe(false)
  })
})
