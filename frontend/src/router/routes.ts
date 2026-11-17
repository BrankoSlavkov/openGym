// The app's routes (FORK.md, migration phase 3: TanStack Router in place of react-router-dom).
//
// One flat list under the root, hash history (#/home, as before). The tree carries paths and what
// to show, not components: App.jsx maps each `view` to its lazily loaded screen and renders the
// page itself, because the shell draws two pages at once while an edge swipe back is under way
// (the current one and the one underneath, each at its own location; App.jsx `Page`).
//
// `gate` is checked when a page renders, every render, so switching a module off in Settings takes
// its screens away at once and the address falls back to Home, as the old <Routes> did.
import { createRootRoute, createRoute, createRouter, type RouterHistory } from '@tanstack/react-router'

/** Who may see a route. Modules are Settings → Modules (lib/modules.js `isOn`). */
export type RouteGate = 'community' | 'body' | 'coach' | 'user' | 'admin'

/** The screens App.jsx knows how to draw. */
export type ViewName =
  | 'Home'
  | 'Plan'
  | 'RoutineEdit'
  | 'Programmes'
  | 'ProgrammeEdit'
  | 'Workout'
  | 'Stats'
  | 'History'
  | 'Library'
  | 'Muscles'
  | 'Community'
  | 'StructuralBalance'
  | 'Tools'
  | 'Journal'
  | 'ProgressPhotos'
  | 'Measurements'
  | 'Connect'
  | 'Assistants'
  | 'Settings'
  | 'CoachChat'
  | 'CoachIntake'
  | 'CoachSetup'
  | 'Admin'
  | 'Trainer'

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** The screen this route shows; absent on a redirect-only route. */
    view?: ViewName
    gate?: RouteGate
    /** A route that only forwards (an old address): replace it with this path. */
    redirect?: string
  }
}

const rootRoute = createRootRoute()

const route = <P extends string>(path: P, view: ViewName, gate?: RouteGate) =>
  createRoute({ getParentRoute: () => rootRoute, path, staticData: { view, gate } })

export const routeTree = rootRoute.addChildren([
  route('/home', 'Home'),
  route('/plan', 'Plan'),
  route('/plan/r/$id', 'RoutineEdit'),
  route('/plan/programmes', 'Programmes'),
  route('/plan/prog/$id', 'ProgrammeEdit'),
  route('/workout', 'Workout'),
  route('/stats', 'Stats'),
  route('/history', 'History'),
  route('/library', 'Library'),
  route('/muscles', 'Muscles'),
  route('/community', 'Community', 'community'),
  route('/structural-balance', 'StructuralBalance'),
  route('/tools', 'Tools'),
  route('/journal', 'Journal'),
  route('/progress-photos', 'ProgressPhotos', 'body'),
  route('/measurements', 'Measurements', 'body'),
  // The MCP connector's consent screen (api/oauth.js): an assistant sent the browser here.
  route('/connect/$id', 'Connect'),
  // Use your subscription: openGym as a connector in Claude, ChatGPT or Gemini (sub-connect-146).
  route('/assistants', 'Assistants'),
  route('/settings', 'Settings'),
  route('/settings/$page', 'Settings'),
  // The Coach screens gate themselves on the instance config; the routes exist whenever the AI
  // Coach module is on, so a deep link from a notification lands somewhere sane.
  route('/coach', 'CoachChat', 'coach'),
  route('/coach/intake', 'CoachIntake', 'coach'),
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/coach/proposal',
    staticData: { gate: 'coach', redirect: '/coach' },
  }),
  route('/coach/setup', 'CoachSetup', 'coach'),
  route('/admin', 'Admin', 'admin'),
  // The trainer dashboard decides for itself once the config is in, so a deep link survives the boot.
  route('/trainer', 'Trainer', 'user'),
  route('/trainer/m/$id', 'Trainer', 'user'),
])

export function createAppRouter(history: RouterHistory) {
  return createRouter({ routeTree, history })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter
  }
}

/** What a pathname shows: the route's static data and its params, or null when nothing matches. */
export function matchPath(router: AppRouter, pathname: string) {
  const [, params, found] = router.getMatchedRoutes(pathname)
  if (!found || found.id === rootRoute.id) return null
  return { routeId: found.id, params, ...found.options.staticData }
}
