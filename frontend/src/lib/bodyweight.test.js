import { describe, expect, it } from 'vitest'
import { weeklyWeights, weighInAt, logWeighIn, recentAverage, rollingAverage } from './bodyweight.js'

// Discord 'Weight': every weigh-in, week by week, with the week's mean.
describe('weeklyWeights', () => {
  // 2026-09-07 is a Monday, 2026-09-13 the Sunday after it.
  const log = [
    { d: '2026-09-01', w: 81 },
    { d: '2026-09-03', w: 80 },
    { d: '2026-09-07', w: 80.5 },
    { d: '2026-09-09', w: 79.5 },
    { d: '2026-09-13', w: 79 },
  ]

  it('groups by the profile\'s week, newest week and newest weigh-in first, with means and changes', () => {
    const weeks = weeklyWeights(log, 1)
    expect(weeks.map(w => w.key)).toEqual(['2026-09-07', '2026-08-31'])
    expect(weeks[0]).toMatchObject({ n: 3, avg: 79.66666666666667 })
    expect(weeks[0].entries.map(b => b.d)).toEqual(['2026-09-13', '2026-09-09', '2026-09-07'])
    expect(weeks[1]).toMatchObject({ n: 2, avg: 80.5, delta: null })
    expect(weeks[0].delta).toBeCloseTo(-0.8333, 3)
  })

  it('moves the boundary with a Sunday week start', () => {
    const weeks = weeklyWeights(log, 0)
    expect(weeks.map(w => [w.key, w.n])).toEqual([['2026-09-13', 1], ['2026-09-06', 2], ['2026-08-30', 2]])
  })

  it('compares with the last week that has weigh-ins, not the calendar week before', () => {
    const weeks = weeklyWeights([{ d: '2026-08-03', w: 82 }, { d: '2026-09-07', w: 80 }], 1)
    expect(weeks[0].delta).toBe(-2)
  })

  it('does not rely on the stored order and skips entries it cannot place', () => {
    const weeks = weeklyWeights([{ d: '2026-09-09', w: 79 }, { d: '2026-09-07', w: 81 }, { w: 70 }, { d: '2026-09-08', w: 0 }, null], 1)
    expect(weeks).toHaveLength(1)
    expect(weeks[0]).toMatchObject({ n: 2, avg: 80 })
    expect(weeks[0].entries.map(b => b.d)).toEqual(['2026-09-09', '2026-09-07'])
    expect(weeklyWeights(undefined, 1)).toEqual([])
  })
})

// A weigh-in logged for an earlier day is typed today, so its `t` is not on its day.
describe('weighInAt', () => {
  const at = iso => new Date(iso).getTime()

  it('keeps the time a weigh-in was typed on its own day', () => {
    expect(weighInAt({ d: '2026-09-09', w: 80, t: at('2026-09-09T07:30:00') })).toBe(at('2026-09-09T07:30:00'))
  })

  it('puts a weigh-in typed on a later day at noon of the day it is for', () => {
    expect(weighInAt({ d: '2026-03-02', w: 84, t: at('2026-09-09T07:30:00') })).toBe(at('2026-03-02T12:00:00'))
  })

  it('puts one with no time at noon of its day', () => {
    expect(weighInAt({ d: '2026-03-02', w: 84 })).toBe(at('2026-03-02T12:00:00'))
  })
})

// The Apple Watch's weigh-in goes through here: one per day, the later one a correction.
describe('logWeighIn', () => {
  const at = iso => new Date(iso).getTime()

  it('adds a weigh-in on the day it was made, rounded to 0.1, and keeps the list in date order', () => {
    const S = { bodyweight: [{ d: '2026-10-20', w: 80 }, { d: '2026-10-10', w: 82 }] }
    expect(logWeighIn(S, '81.26', at('2026-10-15T07:00:00'))).toBe(true)
    expect(S.bodyweight.map(b => [b.d, b.w])).toEqual([['2026-10-10', 82], ['2026-10-15', 81.3], ['2026-10-20', 80]])
    expect(S.bodyweight[1].t).toBe(at('2026-10-15T07:00:00'))
  })

  // #859: a second weigh-in the same day joins the first, at its time; the morning one stays the day's.
  it('adds a second weigh-in to that day at its time, the first staying the day\'s value', () => {
    const S = { bodyweight: [{ d: '2026-10-15', w: 82, t: 1, src: 'health' }] }
    logWeighIn(S, 81, at('2026-10-15T21:00:00'))
    expect(S.bodyweight).toHaveLength(1)
    expect(S.bodyweight[0].ins.map(r => [r.id, r.at, r.w, r.src || null])).toEqual([['0', null, 82, 'health'], [S.bodyweight[0].ins[1].id, '21:00', 81, null]])
    expect(S.bodyweight[0]).toMatchObject({ d: '2026-10-15', w: 82, t: at('2026-10-15T21:00:00') })
    expect(S.bodyweight[0].src).toBeUndefined()
  })

  it('corrects the weigh-in of the same minute instead of adding one', () => {
    const S = {}
    logWeighIn(S, 81, at('2026-10-15T07:00:00'))
    logWeighIn(S, 80.6, at('2026-10-15T07:00:30'))
    expect(S.bodyweight[0].ins.map(r => [r.at, r.w])).toEqual([['07:00', 80.6]])
  })

  it('starts the list on a profile that has none', () => {
    const S = {}
    expect(logWeighIn(S, 70, at('2026-10-15T07:00:00'))).toBe(true)
    expect(S.bodyweight).toHaveLength(1)
  })

  it('refuses a weight that is not a positive number, and changes nothing', () => {
    for (const w of [0, -5, 'abc', null, undefined, NaN, 0.04]) {
      const S = { bodyweight: [{ d: '2026-10-15', w: 82 }] }
      expect(logWeighIn(S, w, at('2026-10-15T07:00:00')), String(w)).toBe(false)
      expect(S.bodyweight).toEqual([{ d: '2026-10-15', w: 82 }])
    }
  })
})

// The Home card's average of the last few weigh-in days, each day's first reading.
describe('recentAverage', () => {
  it('averages the last five days that have a weigh-in, skipping days without one', () => {
    const log = [
      { d: '2026-11-01', w: 90 },
      { d: '2026-11-03', w: 81 },
      { d: '2026-11-04', w: 80 },
      { d: '2026-11-08', w: 80.5 },
      { d: '2026-11-09', w: 79.5 },
      { d: '2026-11-12', w: 79 },
    ]
    expect(recentAverage(log)).toEqual({ avg: 80, n: 5, from: '2026-11-03', to: '2026-11-12' })
  })

  it('takes the first reading of a day with several, whatever the day\'s value says', () => {
    const log = [
      { d: '2026-11-10', w: 80 },
      { d: '2026-11-11', w: 83, ins: [
        { id: 'c', at: '21:00', w: 83, t: 3 },
        { id: 'a', at: '07:00', w: 81, t: 1 },
        { id: 'b', at: '12:00', w: 82, t: 2 },
      ] },
    ]
    expect(recentAverage(log)).toMatchObject({ avg: 80.5, n: 2 })
  })

  it('does not rely on the stored order and honours a custom window', () => {
    const log = [{ d: '2026-11-12', w: 78 }, { d: '2026-11-10', w: 82 }, { d: '2026-11-11', w: 80 }]
    expect(recentAverage(log, 2)).toMatchObject({ avg: 79, n: 2, from: '2026-11-11', to: '2026-11-12' })
  })

  it('uses what there is below five days, and nothing below two', () => {
    expect(recentAverage([{ d: '2026-11-10', w: 80 }, { d: '2026-11-11', w: 81 }])).toMatchObject({ avg: 80.5, n: 2 })
    expect(recentAverage([{ d: '2026-11-10', w: 80 }])).toBeNull()
    expect(recentAverage([{ d: '2026-11-10', w: 80 }, { d: '2026-11-11', w: 0 }, { w: 81 }])).toBeNull()
    expect(recentAverage(undefined)).toBeNull()
  })
})

describe('rollingAverage', () => {
  it('gives every weigh-in day after the first the mean of it and up to four days before', () => {
    const log = [80, 81, 82, 83, 84, 85].map((w, i) => ({ d: '2026-11-0' + (i + 1), w }))
    expect(rollingAverage(log)).toEqual([
      { d: '2026-11-02', avg: 80.5, n: 2 },
      { d: '2026-11-03', avg: 81, n: 3 },
      { d: '2026-11-04', avg: 81.5, n: 4 },
      { d: '2026-11-05', avg: 82, n: 5 },
      { d: '2026-11-06', avg: 83, n: 5 },
    ])
  })

  it('ends on the same value as recentAverage, first readings and all', () => {
    const log = [
      { d: '2026-11-08', w: 79 },
      { d: '2026-11-10', w: 80 },
      { d: '2026-11-11', w: 83, ins: [{ id: 'b', at: '21:00', w: 83, t: 2 }, { id: 'a', at: '07:00', w: 81, t: 1 }] },
    ]
    const line = rollingAverage(log)
    expect(line[line.length - 1].avg).toBe(recentAverage(log).avg)
    expect(rollingAverage([{ d: '2026-11-10', w: 80 }])).toEqual([])
  })
})
