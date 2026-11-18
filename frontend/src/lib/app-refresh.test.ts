// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { entryOf, isNewBuild, startAppRefresh } from './app-refresh.ts'

const html = (src: string) => `<html><head><script>boot()</script><script type="module" crossorigin src="${src}"></script></head></html>`

describe('entryOf', () => {
  it('reads the built entry script', () => {
    expect(entryOf(html('./assets/index-DILFDCiy.js'))).toBe('assets/index-DILFDCiy.js')
    expect(entryOf(html('/assets/index-A.js'))).toBe('assets/index-A.js')
  })
  it('null without one', () => { expect(entryOf('<html></html>')).toBeNull(); expect(entryOf(null)).toBeNull() })
})

describe('isNewBuild', () => {
  it('only a different, known build counts', () => {
    expect(isNewBuild('assets/index-A.js', 'assets/index-B.js')).toBe(true)
    expect(isNewBuild('assets/index-A.js', 'assets/index-A.js')).toBe(false)
    expect(isNewBuild('assets/index-A.js', null)).toBe(false)
  })
})

describe('startAppRefresh', () => {
  let stop: (() => void) | undefined
  afterEach(() => { stop?.() })
  let entry: string
  const page = (src: string) => { entry = src }
  const flush = () => new Promise<void>(r => setTimeout(r, 0))

  it('reloads when the server serves another build', async () => {
    page('./assets/index-A.js')
    const reload = vi.fn()
    stop = startAppRefresh({ entry, reload, fetchImpl: async () => new Response(html('./assets/index-B.js')) })
    window.dispatchEvent(new Event('focus')); await flush(); await flush()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('stays when it is the same build, or the server cannot be reached', async () => {
    page('./assets/index-A.js')
    const reload = vi.fn()
    stop = startAppRefresh({ entry, reload, fetchImpl: async () => new Response(html('./assets/index-A.js')) })
    window.dispatchEvent(new Event('focus')); await flush(); await flush()
    stop()
    stop = startAppRefresh({ entry, reload, fetchImpl: async () => { throw new Error('offline') } })
    window.dispatchEvent(new Event('focus')); await flush(); await flush()
    expect(reload).not.toHaveBeenCalled()
  })

  it('does nothing on a dev server', async () => {
    page('/src/main.tsx')
    const fetchImpl = vi.fn()
    stop = startAppRefresh({ entry, fetchImpl })
    window.dispatchEvent(new Event('focus')); await flush()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
