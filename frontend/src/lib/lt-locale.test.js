import { afterEach, describe, expect, test } from 'vitest'
import lt from '../locales/lt.js'
import pl from '../locales/pl.js'
import { DATE_LOCALES, LANGS, _setLangState, t, tn } from './i18n-core.js'

const placeholders = value => [...String(value).matchAll(/\{\d+\}/g)].map(match => match[0]).sort()

describe('Lithuanian locale', () => {
  afterEach(() => _setLangState('en', {}, null, null))

  test('matches the baseline key set and preserves interpolation placeholders', () => {
    expect(Object.keys(lt).sort()).toEqual(Object.keys(pl).sort())
    for (const [source, translated] of Object.entries(lt)) {
      const forms = translated && typeof translated === 'object' ? Object.values(translated) : [translated]
      for (const form of forms) expect(placeholders(form), source).toEqual(placeholders(source))
    }
  })

  test('provides all Lithuanian CLDR forms for every plural entry', () => {
    for (const [source, baseline] of Object.entries(pl)) {
      if (!baseline || typeof baseline !== 'object') continue
      const translated = lt[source]
      expect(typeof translated, source).toBe('object')
      expect(Object.keys(translated), source).toEqual(['one', 'few', 'many', 'other'])
      for (const form of Object.values(translated)) expect(form.trim(), source).not.toBe('')
    }
  })
})
