import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api.ts'
import { createToken, getCalendar, listTokens, revokeToken, setCalendar, stopCalendar } from './api-tokens.ts'
import { queryClient } from './query-client.ts'
import { getCalendarGetQueryKey, getTokensListQueryKey } from '../generated/api.ts'

vi.mock('./api.ts', () => ({ api: vi.fn(), appBase: () => '/', remoteAuth: () => null }))
afterEach(() => { queryClient.clear(); vi.resetAllMocks() })

describe('generated token and calendar queries', () => {
  it('shares an in-flight token request between consumers', async () => {
    let answer!: (value: { tokens: [] }) => void
    vi.mocked(api).mockImplementation(() => new Promise(resolve => { answer = resolve }))
    const first = listTokens()
    const second = listTokens()
    expect(api).toHaveBeenCalledTimes(1)
    answer({ tokens: [] })
    expect(await first).toEqual(await second)
    expect(api).toHaveBeenCalledWith('/api/tokens', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })

  it('invalidates the token list after successful create and revoke, retaining a one-time secret', async () => {
    queryClient.setQueryData(getTokensListQueryKey(), { tokens: [] })
    vi.mocked(api).mockResolvedValueOnce({ token: 'one-time-secret' }).mockResolvedValueOnce({ ok: true })
    const created = await createToken({ name: 'Assistant', days: 7, scopes: { plans: 'view' } })
    expect(created).toEqual({ token: 'one-time-secret' })
    expect(queryClient.getQueryState(getTokensListQueryKey())?.isInvalidated).toBe(true)
    queryClient.setQueryData(getTokensListQueryKey(), { tokens: [] })
    await revokeToken('token-1')
    expect(queryClient.getQueryState(getTokensListQueryKey())?.isInvalidated).toBe(true)
    expect(queryClient.getQueryData(getTokensListQueryKey())).toEqual({ tokens: [] })
  })

  it('keeps failed writes from invalidating the list or replaying a creation', async () => {
    queryClient.setQueryData(getTokensListQueryKey(), { tokens: [] })
    const refused = Object.assign(new Error('refused'), { status: 403 })
    vi.mocked(api).mockRejectedValue(refused)
    await expect(createToken({ name: 'Assistant' })).rejects.toBe(refused)
    expect(api).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryState(getTokensListQueryKey())?.isInvalidated).toBe(false)
  })

  it('invalidates calendar subscription state after changes and revocation', async () => {
    vi.mocked(api).mockResolvedValueOnce({ on: true }).mockResolvedValueOnce({ on: true }).mockResolvedValueOnce({ on: false })
    await getCalendar()
    queryClient.setQueryData(getCalendarGetQueryKey(), { on: true })
    await setCalendar({ done: true, renew: true })
    expect(queryClient.getQueryState(getCalendarGetQueryKey())?.isInvalidated).toBe(true)
    queryClient.setQueryData(getCalendarGetQueryKey(), { on: true })
    await stopCalendar()
    expect(queryClient.getQueryState(getCalendarGetQueryKey())?.isInvalidated).toBe(true)
  })
})
