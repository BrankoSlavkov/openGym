// @vitest-environment happy-dom
// The router seam (router/hooks.tsx): what the shell relies on from react-router, kept on TanStack.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createHashHistory, createMemoryHistory } from '@tanstack/react-router'
import {
  AppRouterProvider,
  Navigate,
  PageProvider,
  createLocationStore,
  locationStoreFor,
  useLocation,
  useParams,
  useSearchParams,
} from './hooks.tsx'
import { createAppRouter, matchPath } from './routes.ts'
import { adoptLegacyEntry } from './app-router.ts'
import { createTestRouter, TestRouter } from './testing.tsx'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('the location store', () => {
  it('says how each navigation came about: PUSH, REPLACE, and POP for back', () => {
    const store = createLocationStore(createMemoryHistory({ initialEntries: ['/home'] }))
    expect(store.getSnapshot()).toMatchObject({ location: { pathname: '/home' }, navType: 'POP' })
    store.navigate('/plan')
    expect(store.getSnapshot()).toMatchObject({ location: { pathname: '/plan' }, navType: 'PUSH' })
    store.navigate('/stats?section=body', { replace: true, state: { from: '/plan' } })
    expect(store.getSnapshot()).toMatchObject({
      location: { pathname: '/stats', search: '?section=body', state: { from: '/plan' } },
      navType: 'REPLACE',
    })
    store.navigate(-1)
    expect(store.getSnapshot()).toMatchObject({ location: { pathname: '/home' }, navType: 'POP' })
  })

  it('does not move for a raw history call (a sheet pushing its own entry), as react-router did not', () => {
    window.history.replaceState(null, '', '#/workout')
    const history = createHashHistory()
    try {
      const store = createLocationStore(history)
      store.navigate('/stats')
      const before = store.getSnapshot()
      window.history.pushState({ openGymSheet: true, __TSR_index: 2 }, '')
      window.history.replaceState(window.history.state, '', '#/stats?section=body')
      expect(store.getSnapshot()).toBe(before)
      // ...while TanStack's history still numbers the entries right: the next page is one past the sheet.
      store.navigate('/settings')
      expect(window.history.state.__TSR_index).toBe(3)
    } finally {
      history.destroy()
    }
  })

  it('writes the entry at once, so location.href is the new page right after navigate()', () => {
    window.history.replaceState(null, '', '#/home')
    const history = createHashHistory()
    try {
      createLocationStore(history).navigate('/settings/workout')
      expect(window.location.hash).toBe('#/settings/workout')
    } finally {
      history.destroy()
    }
  })
})

describe('an entry left by react-router (a tab open across the update)', () => {
  it("keeps its number under TanStack's name", () => {
    window.history.replaceState({ usr: null, key: 'abc', idx: 4 }, '', '#/stats')
    adoptLegacyEntry()
    expect(window.history.state).toMatchObject({ idx: 4, __TSR_index: 4, key: 'abc', __TSR_key: 'abc' })
  })

  it('leaves a TanStack entry alone', () => {
    window.history.replaceState({ __TSR_index: 1, key: 'k', __TSR_key: 'k' }, '', '#/stats')
    adoptLegacyEntry()
    expect(window.history.state).toEqual({ __TSR_index: 1, key: 'k', __TSR_key: 'k' })
  })
})

describe('params', () => {
  function Id() {
    return <p>{useParams<{ id: string }>().id ?? 'none'}</p>
  }

  it("come from the address, matched against the app's routes", () => {
    act(() =>
      root.render(
        <TestRouter initialEntries={['/plan/r/r7']}>
          <Id />
        </TestRouter>,
      ),
    )
    expect(host.textContent).toBe('r7')
  })

  it("come from the page being drawn when it is not the address bar's (the edge swipe's preview)", () => {
    act(() =>
      root.render(
        <TestRouter initialEntries={['/plan/r/r7']}>
          <PageProvider pathname="/plan/prog/p2" params={{ id: 'p2' }}>
            <Id />
          </PageProvider>
        </TestRouter>,
      ),
    )
    expect(host.textContent).toBe('p2')
  })
})

describe('search params and <Navigate>', () => {
  it('reads and writes the query of the current page', async () => {
    let set: ReturnType<typeof useSearchParams>[1] = () => {}
    function Q() {
      const [params, setParams] = useSearchParams()
      set = setParams
      return <p>{params.get('gym') ?? '-'}</p>
    }
    act(() =>
      root.render(
        <TestRouter initialEntries={['/trainer?gym=g1']}>
          <Q />
        </TestRouter>,
      ),
    )
    expect(host.textContent).toBe('g1')
    await act(async () => set({ gym: 'g2' }))
    expect(host.textContent).toBe('g2')
  })

  it('<Navigate replace> goes once rendered, in place of the entry', async () => {
    const router = createTestRouter(['/coach/proposal'])
    function Where() {
      return <p>{useLocation().pathname}</p>
    }
    await act(async () =>
      root.render(
        <AppRouterProvider router={router}>
          <Navigate to="/coach" replace />
          <Where />
        </AppRouterProvider>,
      ),
    )
    expect(host.textContent).toBe('/coach')
    expect(locationStoreFor(router).getSnapshot().navType).toBe('REPLACE')
  })
})

describe('the route table', () => {
  const router = createAppRouter(createMemoryHistory())

  it('names the screen, its gate and its params', () => {
    expect(matchPath(router, '/plan/r/abc')).toMatchObject({ view: 'RoutineEdit', params: { id: 'abc' } })
    expect(matchPath(router, '/settings/workout')).toMatchObject({ view: 'Settings', params: { page: 'workout' } })
    expect(matchPath(router, '/community')).toMatchObject({ view: 'Community', gate: 'community' })
    expect(matchPath(router, '/admin')).toMatchObject({ view: 'Admin', gate: 'admin' })
    expect(matchPath(router, '/coach/proposal')).toMatchObject({ gate: 'coach', redirect: '/coach' })
  })

  it('matches nothing for an unknown address (the shell sends it Home)', () => {
    expect(matchPath(router, '/nope')).toBeNull()
    expect(matchPath(router, '/')).toBeNull()
  })
})
