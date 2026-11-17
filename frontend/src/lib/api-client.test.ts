import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { api } from './api.ts'
import { getGetConfigQueryOptions, getConfig, getMedia, calendarFeed, getApiDocs, getShared } from '../generated/api.ts'

vi.mock('./api.ts', () => ({ api: vi.fn() }))
afterEach(() => vi.resetAllMocks())

describe('generated API client', () => {
  it('uses the existing transport and returns the response body directly', async () => {
    const config = { invite_only: false, allow_guest: true }
    vi.mocked(api).mockResolvedValue(config)
    await expect(getConfig()).resolves.toBe(config)
    expect(api).toHaveBeenCalledWith('/api/config', expect.objectContaining({ method: 'GET' }))
  })

  it('requests binary and text response decoding for non-JSON routes', async () => {
    const photo = new Blob(['image'], { type: 'image/png' })
    vi.mocked(api).mockResolvedValueOnce(photo).mockResolvedValueOnce('calendar').mockResolvedValueOnce('<html></html>')
    await expect(getMedia('abc')).resolves.toBe(photo)
    await expect(calendarFeed('token')).resolves.toBe('calendar')
    await expect(getApiDocs()).resolves.toBe('<html></html>')
    expect(api).toHaveBeenNthCalledWith(1, '/api/media/abc', expect.objectContaining({ responseType: 'blob' }))
    expect(api).toHaveBeenNthCalledWith(2, '/api/calendar/token.ics', expect.objectContaining({ responseType: 'text' }))
    expect(api).toHaveBeenNthCalledWith(3, '/api/docs', expect.objectContaining({ responseType: 'text' }))
  })

  it('encodes path identifiers so they remain one URL segment', async () => {
    vi.mocked(api).mockResolvedValue({})
    await getShared('item/with?reserved#characters')
    expect(api).toHaveBeenCalledWith('/api/shared/item%2Fwith%3Freserved%23characters', expect.any(Object))
  })

  it('keeps transport error status and conflict document intact', async () => {
    const error = Object.assign(new Error('conflict'), { status: 409, data: { rev: 4 } })
    vi.mocked(api).mockRejectedValue(error)
    await expect(getConfig()).rejects.toBe(error)
  })

  it('deduplicates concurrent config reads and forwards the cancellation signal', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    vi.mocked(api).mockImplementation(async () => ({ allow_guest: true }))
    const options = getGetConfigQueryOptions()
    await Promise.all([client.fetchQuery(options), client.fetchQuery(options)])
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith('/api/config', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    client.clear()
  })
})
