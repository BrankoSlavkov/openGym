import { afterEach, describe, expect, it } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { bindQuerySession, type QuerySessionState } from './query-session.ts'
import { queryClient } from './query-client.ts'
import { setRemoteAuth } from './api.ts'

afterEach(() => { setRemoteAuth('', null); queryClient.clear() })

describe('server query session boundaries', () => {
  it('clears account data on sign-out and replacement, retaining it for same-account updates', () => {
    const store = createStore<QuerySessionState>(() => ({ user: { id: 'first' } }))
    const unsubscribe = bindQuerySession(store)
    queryClient.setQueryData(['/api/trainer/members'], { members: ['private'] })
    store.setState({ user: { id: 'first' } })
    expect(queryClient.getQueryData(['/api/trainer/members'])).toEqual({ members: ['private'] })
    store.setState({ user: { id: 'second' } })
    expect(queryClient.getQueryData(['/api/trainer/members'])).toBeUndefined()
    queryClient.setQueryData(['/api/tokens'], { tokens: ['private'] })
    store.setState({ user: null })
    expect(queryClient.getQueryData(['/api/tokens'])).toBeUndefined()
    unsubscribe()
  })

  it('aborts an in-flight account query so it cannot satisfy the next account', async () => {
    const store = createStore<QuerySessionState>(() => ({ user: { id: 'first' } }))
    const unsubscribe = bindQuerySession(store)
    let signal!: AbortSignal
    const previous = queryClient.fetchQuery({ queryKey: ['/api/trainer/members'], queryFn: context => {
      signal = context.signal
      return new Promise(() => {})
    } })
    // Attach the rejection handler before changing sessions.
    const cancelled = expect(previous).rejects.toThrow()
    store.setState({ user: { id: 'second' } })
    await cancelled
    expect(signal.aborted).toBe(true)
    expect(await queryClient.fetchQuery({ queryKey: ['/api/trainer/members'], queryFn: async () => ['second'] })).toEqual(['second'])
    unsubscribe()
  })

  it('clears queries when pairing credentials or server change', () => {
    setRemoteAuth('https://first.example', 'first-token')
    queryClient.setQueryData(['/api/config'], { server: 'first' })
    setRemoteAuth('https://first.example', 'first-token')
    expect(queryClient.getQueryData(['/api/config'])).toEqual({ server: 'first' })
    setRemoteAuth('https://second.example', 'second-token')
    expect(queryClient.getQueryData(['/api/config'])).toBeUndefined()
  })
})
