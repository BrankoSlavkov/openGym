import { describe, it, expect } from 'vitest'
import { decide, stampAfter, sameSession } from './live-session.js'

const W = (id, start = 1, sets = 0) => ({ id, start, entries: [{ id: 'bench', sets: Array.from({ length: sets }, () => ({ w: 60, r: 5, done: true })) }] })

describe('stampAfter', () => {
  it('is now when the clock is ahead of what was seen', () => expect(stampAfter(500, 100)).toBe(500))
  it('stays above the last copy seen when this clock runs behind', () => expect(stampAfter(500, 900)).toBe(901))
})

describe('sameSession', () => {
  it('treats missing and null as the same', () => expect(sameSession(undefined, null)).toBe(true))
  it('tells a ticked set apart', () => expect(sameSession(W('a', 1, 1), W('a', 1, 2))).toBe(false))
})

describe('decide', () => {
  it('takes a workout started on another device', () => {
    expect(decide({ active: null, at: 0, dirty: false }, { active: W('a'), at: 10 })).toBe('adopt')
  })
  it('takes a newer copy of the same workout (a set ticked on the phone)', () => {
    expect(decide({ active: W('a', 1, 1), at: 10, dirty: false }, { active: W('a', 1, 2), at: 20 })).toBe('adopt')
  })
  it('takes a finish from another device', () => {
    expect(decide({ active: W('a', 1, 3), at: 10, dirty: false }, { active: null, at: 30 })).toBe('adopt')
  })
  it('lets the newer stamp win over an unsent change here', () => {
    expect(decide({ active: W('a', 1, 1), at: 10, dirty: true }, { active: W('a', 1, 2), at: 20 })).toBe('adopt')
  })
  it('sends a change made here that the server has not got', () => {
    expect(decide({ active: W('a', 1, 2), at: 20, dirty: true }, { active: W('a', 1, 1), at: 10 })).toBe('push')
  })
  it('does nothing when both hold the same copy', () => {
    expect(decide({ active: W('a'), at: 20, dirty: false }, { active: W('a'), at: 20 })).toBe('none')
    expect(decide({ active: W('a'), at: 10, dirty: false }, { active: W('a'), at: 20 })).toBe('none')
  })
  it('sends a workout running here when the server has none yet', () => {
    expect(decide({ active: W('a'), at: 0, dirty: true }, { active: null, at: 0 })).toBe('push')
  })
  it('on first contact keeps the workout started last', () => {
    expect(decide({ active: W('mine', 200), at: 0, dirty: true }, { active: W('theirs', 100), at: 50 })).toBe('push')
    expect(decide({ active: W('mine', 100), at: 0, dirty: true }, { active: W('theirs', 200), at: 50 })).toBe('adopt')
  })
})
