// A web app left open picks up a new deploy (the browser tab, and the app added to the home
// screen, which the phone keeps alive in the background for days).
//
// The data already follows you: the store pulls the account's state whenever the page comes back
// into view. The code did not. The service worker serves the newest build to the next fresh
// start, but an app that is only ever brought back from the background never starts fresh, so it
// kept showing the screens of the build it first loaded. Each time the page comes back into view
// (at most once a minute) this asks the server which build it serves now, and reloads onto it
// when that is not the build running here. Everything worth keeping survives a reload: the state,
// a session in progress included, lives in localStorage.
//
// Not in the phone apps: their screens are packaged in the app and change with an app update.

// The entry script a built index.html loads ("./assets/index-<hash>.js"), or null.
export function entryOf(html: unknown) {
  const m = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(String(html || ''))
    || /<script[^>]*src="([^"]+)"[^>]*type="module"/.exec(String(html || ''))
  if (!m?.[1]) return null
  return m[1].replace(/^\.?\//, '')
}

// True when the server's index.html loads a different entry script than this page does.
export function isNewBuild(running: string | null, served: string | null) {
  return !!running && !!served && running !== served
}

const CHECK_EVERY_MS = 60 * 1000

export function startAppRefresh({ fetchImpl = globalThis.fetch, reload = () => location.reload(), entry }: { fetchImpl?: typeof fetch; reload?: () => void; entry?: string | null } = {}) {
  if (typeof document === 'undefined') return () => {}
  const own = entry ?? document.querySelector('script[type="module"][src]')?.getAttribute('src')
  const running = own ? own.replace(/^\.?\//, '') : null
  if (!running || !/assets\//.test(running)) return () => {} // a dev server: nothing to compare
  let last = 0, busy = false
  const check = async () => {
    if (document.visibilityState === 'hidden' || busy || Date.now() - last < CHECK_EVERY_MS) return
    busy = true; last = Date.now()
    try {
      const res = await fetchImpl('index.html', { cache: 'no-store' })
      if (!res.ok || res.redirected) return
      if (isNewBuild(running, entryOf(await res.text()))) reload()
    } catch { /* offline: try again next time */ } finally { busy = false }
  }
  document.addEventListener('visibilitychange', check)
  window.addEventListener('focus', check)
  return () => { document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check) }
}
