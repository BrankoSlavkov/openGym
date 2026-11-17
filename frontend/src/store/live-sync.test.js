// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { create } from 'zustand'

// One server for both devices, with the newest-stamp-wins rule of api/live-session.js.
const server = { doc: { active: null, unit: 'kg', at: 0 } }
vi.mock('../lib/api.ts', () => ({
  api: vi.fn(async (path, opts) => {
    if (path !== '/api/live') throw Object.assign(new Error('nope'), { status: 404 })
    if (!opts || !opts.method) return JSON.parse(JSON.stringify(server.doc))
    const body = JSON.parse(opts.body)
    if (body.at <= server.doc.at) { const e = new Error('conflict'); e.status = 409; e.data = JSON.parse(JSON.stringify(server.doc)); throw e }
    server.doc = { active: body.active, unit: body.unit, at: body.at }
    return { at: body.at }
  }),
}))

const { startLiveSync } = await import('./live-sync.js')

const device = (S = {}) => {
  const store = create((set, get) => ({
    user: { id: 'u1' }, ready: true, tourSandbox: false,
    S: { unit: 'kg', active: null, ...S },
    update(fn) { const next = JSON.parse(JSON.stringify(get().S)); fn(next); set({ S: next }) },
  }))
  startLiveSync(store)
  return store
}
const W = { id: 'w1', name: 'Push', start: 1000, entries: [{ id: 'bench', sets: [{ w: 60, r: 5, done: false }] }] }

describe('live-sync', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); server.doc = { active: null, unit: 'kg', at: 0 } })
  afterEach(() => vi.useRealTimers())

  it('a workout started on the phone shows on the laptop, and edits flow both ways', async () => {
    const phone = device()
    const laptop = device()
    await vi.advanceTimersByTimeAsync(50)

    phone.getState().update(S => { S.active = W })
    await vi.advanceTimersByTimeAsync(1000)           // the push
    expect(server.doc.active.id).toBe('w1')
    await vi.advanceTimersByTimeAsync(8000)           // the laptop's poll
    expect(laptop.getState().S.active).toEqual(W)

    laptop.getState().update(S => { S.active.entries[0].sets[0].done = true })
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(8000)
    expect(phone.getState().S.active.entries[0].sets[0].done).toBe(true)

    phone.getState().update(S => { S.active = null })   // finished on the phone
    await vi.advanceTimersByTimeAsync(9000)
    expect(laptop.getState().S.active).toBe(null)
  })

  it('converts a session pushed in kg for a profile shown in lb', async () => {
    server.doc = { active: { ...W, entries: [{ id: 'bench', sets: [{ w: 100, r: 5 }] }] }, unit: 'kg', at: 5 }
    const laptop = device({ unit: 'lb' })
    await vi.advanceTimersByTimeAsync(50)
    expect(laptop.getState().S.active.entries[0].sets[0].w).not.toBe(100)
  })
})
