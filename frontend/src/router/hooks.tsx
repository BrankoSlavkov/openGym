// The router as the app's code sees it (FORK.md, migration phase 3).
//
// TanStack Router owns the routes (routes.ts), the history and the matching. These hooks keep the
// call shapes the views were written against, so ~150 navigation calls changed only their import:
//   useNavigate()          -> navigate('/plan/r/' + id), navigate(path, { replace, state }), navigate(-1)
//   useLocation()          -> { pathname, search ('?a=1'), hash, state, key }
//   useParams()            -> the params of the page being drawn (not always the address bar's:
//                             the page under an edge swipe back has its own location)
//   useSearchParams()      -> [URLSearchParams, setter]
//   useNavigationType()    -> 'POP' | 'PUSH' | 'REPLACE'
// A view converted to TypeScript can use TanStack's typed navigation instead
// (`router.navigate({ to: '/plan/r/$id', params: { id } })`, via useRouter()).
//
// Only navigations made here, and the browser's back and forward, move the app. A raw
// history.pushState / replaceState (a sheet's own entry in Modals.jsx, Stats writing ?section=)
// does not, exactly as with react-router: TanStack's history still records it, so the entry
// numbers (`__TSR_index`) stay right, but the page does not re-render for it.
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { RouterContextProvider, type HistoryLocation, type RouterHistory } from '@tanstack/react-router'
import { matchPath, type AppRouter } from './routes.ts'

export type NavigationType = 'POP' | 'PUSH' | 'REPLACE'

/** A location in react-router's shape. `state` is what navigate(to, { state }) passed. */
export interface AppLocation {
  pathname: string
  search: string
  hash: string
  state: any
  key: string
}

export interface NavigateOptions {
  replace?: boolean
  state?: unknown
}

export type NavigateFn = (to: string | number, opts?: NavigateOptions) => void

interface LocationSnapshot {
  location: AppLocation
  navType: NavigationType
}

const toAppLocation = (l: HistoryLocation): AppLocation => {
  const st = (l.state ?? {}) as unknown as Record<string, unknown>
  return {
    pathname: l.pathname,
    search: l.search || '',
    hash: l.hash || '',
    state: st.usr ?? null,
    key: typeof st.__TSR_key === 'string' ? st.__TSR_key : typeof st.key === 'string' ? st.key : 'default',
  }
}

/** The app's view of a history: the current location, how we got there, and navigate(). */
export function createLocationStore(history: RouterHistory) {
  let snap: LocationSnapshot = { location: toAppLocation(history.location), navType: 'POP' }
  const listeners = new Set<() => void>()
  let ours = false
  history.subscribe(({ location, action }) => {
    const type = action.type
    // A push or replace that did not come through navigate() is a raw history call: not ours to show.
    if ((type === 'PUSH' || type === 'REPLACE') && !ours) return
    snap = {
      location: toAppLocation(location),
      navType: type === 'PUSH' ? 'PUSH' : type === 'REPLACE' ? 'REPLACE' : 'POP',
    }
    listeners.forEach((l) => l())
  })
  const navigate: NavigateFn = (to, opts) => {
    if (typeof to === 'number') {
      history.go(to)
      return
    }
    const state = opts?.state === undefined ? {} : { usr: opts.state }
    ours = true
    try {
      if (opts?.replace) history.replace(to, state as any)
      else history.push(to, state as any)
      // TanStack writes to window.history in a microtask; the app reads location.href right after
      // a navigation (Modals.jsx: did the page move on under this sheet?), as it could with
      // react-router, so the entry is written now.
      history.flush()
    } finally {
      ours = false
    }
  }
  return {
    history,
    navigate,
    getSnapshot: () => snap,
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

type LocationStore = ReturnType<typeof createLocationStore>

const stores = new WeakMap<AppRouter, LocationStore>()
/** The one location store of a router (the provider's, and a test's handle on it). */
export function locationStoreFor(router: AppRouter): LocationStore {
  let s = stores.get(router)
  if (!s) stores.set(router, (s = createLocationStore(router.history)))
  return s
}

interface AppRouterValue {
  router: AppRouter
  store: LocationStore
}

const AppRouterContext = createContext<AppRouterValue | null>(null)

/** One router for the app (main.jsx) or a test (testing.tsx). */
export function AppRouterProvider({ router, children }: { router: AppRouter; children: ReactNode }) {
  const value = useMemo(() => ({ router, store: locationStoreFor(router) }), [router])
  return (
    <RouterContextProvider router={router}>
      <AppRouterContext.Provider value={value}>{children}</AppRouterContext.Provider>
    </RouterContextProvider>
  )
}

function useAppRouter(): AppRouterValue {
  const v = useContext(AppRouterContext)
  if (!v) throw new Error('useNavigate/useLocation outside <AppRouterProvider>')
  return v
}

function useSnapshot(): LocationSnapshot {
  const { store } = useAppRouter()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export const useLocation = (): AppLocation => useSnapshot().location
export const useNavigationType = (): NavigationType => useSnapshot().navType
export const useNavigate = (): NavigateFn => useAppRouter().store.navigate
export const useAppRouterInstance = (): AppRouter => useAppRouter().router

/** The page App.jsx is drawing, when it is not the address bar's (the edge swipe's preview). */
const PageContext = createContext<{ pathname: string; params: Record<string, string> } | null>(null)

export function PageProvider({
  pathname,
  params,
  children,
}: {
  pathname: string
  params: Record<string, string>
  children: ReactNode
}) {
  const value = useMemo(() => ({ pathname, params }), [pathname, JSON.stringify(params)])
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): Partial<T> {
  const page = useContext(PageContext)
  const { router } = useAppRouter()
  const { pathname } = useLocation()
  if (page) return page.params as Partial<T>
  return (matchPath(router, pathname)?.params ?? {}) as Partial<T>
}

export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | Record<string, string>, opts?: NavigateOptions) => void,
] {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const params = useMemo(() => new URLSearchParams(search), [search])
  const set = (next: URLSearchParams | Record<string, string>, opts?: NavigateOptions) => {
    const q = new URLSearchParams(next as Record<string, string>).toString()
    navigate(pathname + (q ? '?' + q : ''), opts)
  }
  return [params, set]
}

/** Goes to `to` once rendered (after paint, as react-router's <Navigate> did). */
export function Navigate({ to, replace = false, state }: { to: string; replace?: boolean; state?: unknown }) {
  const navigate = useNavigate()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    navigate(to, { replace, state })
  }, [])
  return null
}
