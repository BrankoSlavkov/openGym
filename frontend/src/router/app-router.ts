// The app's one router: hash history (#/home), as with react-router's HashRouter.
import { createHashHistory } from '@tanstack/react-router'
import { createAppRouter, type AppRouter } from './routes.ts'

/**
 * An entry written by react-router before this build (a tab left open across the update) carries
 * `{ usr, key, idx }`. TanStack numbers entries with `__TSR_index`; without it the next push would
 * be numbered NaN and every "can I go back?" check would be wrong. Same numbers, new names.
 */
export function adoptLegacyEntry(win: Window = window) {
  try {
    const st = win.history.state as Record<string, unknown> | null
    if (st && typeof st.idx === 'number' && typeof st.__TSR_index !== 'number') {
      const key = typeof st.key === 'string' ? st.key : Math.random().toString(36).slice(2, 10)
      win.history.replaceState({ ...st, __TSR_index: st.idx, key, __TSR_key: key }, '')
    }
  } catch {
    /* a sandboxed frame: start numbering afresh */
  }
}

/** The app's router, reading the address as it is now (App.jsx creates it once, on mount). */
export function createHashAppRouter(): AppRouter {
  adoptLegacyEntry()
  return createAppRouter(createHashHistory())
}
