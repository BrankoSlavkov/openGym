import { describe, expect, it } from 'vitest'
import { LANGS, DATE_LOCALES, DERIVED_LOCALES } from './i18n-core.js'
import { matchLocale } from './default-lang.ts'
import id from '../locales/id.js'

describe('Indonesian (id) locale pack is wired up', () => {

  it('the Indonesian pack has no em dashes in what it shows', () => {
    const dashed = Object.entries(id).filter(([, v]) => String(v).includes('—')).map(([k]) => k)
    expect(dashed).toEqual([])
  })
})
