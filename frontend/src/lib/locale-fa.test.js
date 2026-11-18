// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { autoLang, matchLocale } from './default-lang.ts'
import {
  DATE_LOCALES, EXERCISE_NAME_LANGS, INSTR_LANGS, LANGS, RTL_LANGS,
  dateLocale, descFor, exerciseNameFor, exerciseNameSearchText, getLang,
  instrFor, instrTranslated, setLang, t, tn,
} from './i18n.js'
import { _setDetails } from './i18n-core.js'
import { EXDB } from './exercises-data.js'
import { printShell } from './print-doc.js'
import fa from '../locales/fa.js'
import persianCatalogue from '../../../catalogue/i18n/fa.json'
import arabicCatalogue from '../../../catalogue/i18n/ar.json'
import names from '../exercise-names/fa.js'
import steps from '../instr/fa.js'
import englishSteps from '../instr/en.js'
import englishDescriptions from '../exercise-desc/en.js'

const idsWith = (rows, field) => Object.keys(rows).filter(id => rows[id][field]).sort()

afterEach(async () => { await setLang('en') })

describe('Persian exercise catalogue', () => {
  it('matches Arabic name and instruction coverage and generates the source text faithfully', () => {
    const source = persianCatalogue, arabic = arabicCatalogue
    expect(EXERCISE_NAME_LANGS).toContain('fa')
    expect(INSTR_LANGS).toContain('fa')
    expect(idsWith(source, 'name')).toEqual(idsWith(arabic, 'name'))
    expect(idsWith(source, 'instructions')).toEqual(idsWith(arabic, 'instructions'))
    expect(Object.keys(names).sort()).toEqual(idsWith(source, 'name'))
    expect(Object.keys(steps).sort()).toEqual(idsWith(source, 'instructions'))
    for (const [id, row] of Object.entries(source)) {
      expect(names[id], id).toBe(row.name)
      expect(row.description, id).toBeUndefined()
      expect(row.name, id).toMatch(/[پچژگکییء-غف-ي]/u)
      if (row.instructions) {
        expect(steps[id], id).toEqual(row.instructions)
        expect(row.instructions.length, id).toBe(englishSteps[id].length)
        for (const step of row.instructions) expect(step, id).toMatch(/[پچژگکییء-غف-ي]/u)
      }
    }
  })

  it('preserves equipment and identity-changing qualifiers in translated exercise names', () => {
    const qualifiers = [
      [/\bbarbell\b/, /هالتر/], [/\bdumbbells?\b/, /دمبل/],
      [/\bcable\b/, /سیم‌کش/], [/\bkettlebell\b/, /کتل/],
      // دراز کشیده contains کش as a substring but does not name a resistance band.
      [/\b(?:band|banded)\b/, /(?:^|[\s(])کش(?:[\s)‌]|$)/u], [/^lever\b/, /دستگاه/],
      [/\bweighted\b/, /وزن|وزنه/], [/\bassisted\b/, /کمک/],
      [/\b(?:single|one) leg\b/, /(?:تک|یک)[‌ -]?(?:پا|ساق)|پای (?:واحد|یک)/],
      [/\b(?:single|one) arm\b/, /(?:تک|یک)[‌ -]?(?:دست|بازو)|بازوی (?:واحد|یک)/],
      [/\bseated\b/, /نشسته/], [/\bstanding\b/, /ایستاده/],
      [/\blying\b/, /خوابیده|دراز|دمر/],
      [/\bincline\b/, /شیب|بالاسینه/], [/\bdecline\b/, /شیب|زیرسینه/],
      [/\bsplit squats?\b/, /اسپلیت/],
      [/\bsissy\b/, /سیسی/], [/\bjerk\b/, /جرک/],
      [/\bclean\b/, /کلین/], [/\bsnatch\b/, /اسنچ/],
      [/\bdeadlift\b/, /ددلیفت/], [/\bsquat\b/, /اسکات|اسکوات/],
      [/\bpress\b/, /پرس|فشار/], [/\b(?:biceps?|arm) curl\b/, /جلو بازو/],
      [/\brow\b/, /قایقی|زیربغل|روئینگ|کول/], [/\blunge\b/, /لانج|لانژ|لانگز/],
      [/\bplank\b/, /پلانک|تخته/], [/\bdip\b/, /دیپ|پارالل/],
      [/\bfly\b/, /فلای/], [/\bcrunch\b/, /کرانچ/],
    ]
    for (const ex of EXDB) {
      if (!names[ex.id]) continue
      for (const [source, translated] of qualifiers) {
        if (source.test(ex.n)) expect(names[ex.id], `${ex.id}: ${ex.n}`).toMatch(translated)
      }
    }
  })

  it('distinguishes different squat, press, raise and shrug movements', () => {
    const groups = [
      ['1100', '1101'],               // split squat / single-leg squat
      ['1197', '4256', '0786', '1489'], // squat / stepdown / jerk / sissy squat
      ['4349', '0099'],               // barbell single-leg squat / split squat
      ['3018', '3929'],               // calf raise / side leg raise
      ['2928', '5224', '0095'],       // overhead / wide-grip / regular shrug
      ['1438', '0553'],               // seated / standing kettlebell press
      ['0754', '0758', '0764'],       // decline / incline / regular Smith press
      ['8618', '8620'],               // chest press / decline chest press
      ['10116', '0751'],              // incline / regular close-grip press
      ['2870', '3812', '0662'],       // Pilates swimming / elevated / regular push-up
    ]
    for (const ids of groups) expect(new Set(ids.map(id => names[id])).size, ids.join(', ')).toBe(ids.length)
    expect(names['1100']).toContain('اسپلیت')
    expect(names['4256']).toContain('استپ‌داون')
    expect(names['0786']).toContain('جرک')
    expect(names['0754']).toContain('زیرسینه')
    expect(names['0758']).toContain('بالاسینه')
  })

  it('keeps the reviewed concentration, pass-through, pike and leg-curl names distinct', () => {
    expect(names['1631']).toBe('جلو بازو تمرکزی با سیم‌کش')
    expect(names['5856']).toBe('جلو بازو تمرکزی با کتل‌بل')
    expect(names['1586']).toContain('پشت پا تک‌پا نشسته')
    expect(names['5497']).toContain('زیر بدن در حالت پلانک')
    expect(names['4607']).toContain('لوله PVC')
    expect(names['1081']).toContain('پایک')
    expect(names['1082']).toContain('جمع کردن زانو')
    for (const name of Object.values(names)) expect(name).not.toMatch(/غلظت|باخت‌آپ|عبور می کند/)
  })

  it('retains English instructions, descriptions, and custom names when untranslated', async () => {
    await setLang('fa')
    _setDetails(englishSteps, englishDescriptions, null)
    const untranslated = EXDB.find(e => !steps[e.id] && englishSteps[e.id])
    expect(instrFor(untranslated)).toEqual(englishSteps[untranslated.id])
    expect(instrTranslated(untranslated)).toBe(false)
    const described = EXDB.find(e => englishDescriptions[e.id])
    expect(descFor(described)).toBe(englishDescriptions[described.id])
    const custom = { id: 'custom-persian', n: 'تمرین من', st: ['راهنمای شخصی'] }
    expect(exerciseNameFor(custom)).toBe('تمرین من')
    expect(instrFor(custom)).toEqual(custom.st)
  })
})
