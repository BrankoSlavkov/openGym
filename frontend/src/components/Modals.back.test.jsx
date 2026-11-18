// @vitest-environment happy-dom
// A page opened from a sheet (#/workout ⋯ > Workout settings > All settings) takes over the
// sheet's history entry (closeThenNav), and the router numbers the new page from that entry's
// state. The sheet's entry carried no number, so Settings read index 0, and its back button went
// up to the Settings root instead of back to the workout that Android's back returns to.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashHistory } from '@tanstack/react-router'
import { AppRouterProvider, useNavigate, useLocation } from '../router/hooks.tsx'
import { createAppRouter } from '../router/routes.ts'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Modals from './Modals.jsx'
import { useUI } from '../store/useUI.js'
import { closeThenNav, nav, setNav } from '../lib/nav.ts'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root, router
let here
function Shell() {
  setNav(useNavigate())
  here = useLocation().pathname
  return null
}

beforeEach(async () => {
  history.replaceState(null, '', '#/home')
  const el = document.createElement('div')
  document.body.appendChild(el)
  root = createRoot(el)
  await act(async () => {
    router = createAppRouter(createHashHistory())
    root.render(<AppRouterProvider router={router}><Shell /><Modals /></AppRouterProvider>)
  })
  await act(async () => { nav('/workout') })
})

afterEach(async () => {
  await act(async () => { root.unmount() })
  router.history.destroy()
  useUI.setState({ sheets: [] })
})

describe('a page that takes over a sheet\'s history entry', () => {
  // Settings' back goes back while the entry's number (__TSR_index) > 0, and up to its parent page otherwise.
  it('keeps its place in history, one past the page the sheet opened on', async () => {
    const workout = history.state.__TSR_index
    let close
    await act(async () => { useUI.getState().openSheet(c => { close = c; return null }) })
    await act(async () => { closeThenNav(close, '/settings/workout') })
    expect(here).toBe('/settings/workout')
    expect(history.state.__TSR_index).toBe(workout + 1)
  })

  it('a page pushed from under an open sheet is numbered after the sheet', async () => {
    const workout = history.state.__TSR_index
    await act(async () => { useUI.getState().openSheet(() => null) })
    await act(async () => { nav('/settings') })
    expect(history.state.__TSR_index).toBe(workout + 2)
  })
})
