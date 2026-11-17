import { describe, it, expect } from 'vitest'
import { AUTO_RUN_REST_SEC, autoRunOn, autoRunRestSec, unitOwnRest } from './auto-run.js'
import { autoHoldsFor } from './auto-holds.js'

const plank = (target = {}) => ({ id: 'plank', target: { mode: 'time', sec: 45, ...target }, sets: [{ sec: 45 }, { sec: 45 }] })
const state = (active = {}, entries = [plank()]) => ({ autoHolds: false, active: { entries, cur: 0, ...active } })
const next = { idx: 0, i: 1, id: 'plank', plan: 45 }

describe('autoRunOn', () => {
  it('is on only with the session flag', () => {
    expect(autoRunOn(state())).toBe(false)
    expect(autoRunOn(state({ autoRun: true }))).toBe(true)
  })
  it('"Stop auto", an edited workout and a backfill turn it off', () => {
    expect(autoRunOn(state({ autoRun: true, autoHoldsOff: true }))).toBe(false)
    expect(autoRunOn(state({ autoRun: true, editingWorkoutId: 'w1' }))).toBe(false)
    expect(autoRunOn(state({ autoRun: true, backfill: true }))).toBe(false)
    expect(autoRunOn({ active: null })).toBe(false)
  })
})

describe('autoHoldsFor with the Auto button', () => {
  it('runs holds for every exercise, over the profile and the exercise saying no', () => {
    const S = state({ autoRun: true })
    expect(autoHoldsFor(S, {})).toBe(true)
    expect(autoHoldsFor(S, { autoHold: false })).toBe(true)
  })
  it('"Stop auto" still wins', () => {
    expect(autoHoldsFor(state({ autoRun: true, autoHoldsOff: true }), {})).toBe(false)
  })
})

describe('autoRunRestSec', () => {
  it('pauses 15 s between holds', () => {
    expect(autoRunRestSec(state({ autoRun: true }), { unit: [0], next })).toBe(AUTO_RUN_REST_SEC)
    expect(AUTO_RUN_REST_SEC).toBe(15)
  })
  it('leaves the normal rest when off, or when no hold starts next', () => {
    expect(autoRunRestSec(state(), { unit: [0], next })).toBe(null)
    expect(autoRunRestSec(state({ autoRun: true }), { unit: [0], next: null })).toBe(null)
  })
  it('keeps a rest the set or the exercise set itself', () => {
    expect(autoRunRestSec(state({ autoRun: true }), { unit: [0], ownSetRest: 30, next })).toBe(null)
    expect(autoRunRestSec(state({ autoRun: true }, [plank({ restSec: 60 })]), { unit: [0], next })).toBe(null)
    expect(autoRunRestSec(state({ autoRun: true }, [plank({ restOff: true })]), { unit: [0], next })).toBe(null)
    expect(autoRunRestSec(state({ autoRun: true }, [plank({ nextRestSec: 90 })]), { unit: [0], next })).toBe(null)
  })
})

describe('unitOwnRest', () => {
  it('reads every member of a superset', () => {
    const entries = [plank(), plank({ restSec: 40 })]
    expect(unitOwnRest(entries, [0])).toBe(false)
    expect(unitOwnRest(entries, [0, 1])).toBe(true)
    expect(unitOwnRest(entries, null)).toBe(false)
  })
})
