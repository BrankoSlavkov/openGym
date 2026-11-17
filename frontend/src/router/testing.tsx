// A router for tests: in-memory history at `initialEntries` (the last one is current), the app's
// routes, rendered synchronously. Replaces react-router's <MemoryRouter>.
//
//   root.render(<TestRouter initialEntries={['/plan/r/r1']}><RoutineEdit /></TestRouter>)
//
// useParams() reads the params from the address, matched against the app's routes, so a test no
// longer declares <Routes><Route path=...> around the screen.
import { useState, type ReactNode } from 'react'
import { createMemoryHistory } from '@tanstack/react-router'
import { AppRouterProvider } from './hooks.tsx'
import { createAppRouter, type AppRouter } from './routes.ts'

export function createTestRouter(initialEntries: string[] = ['/']): AppRouter {
  return createAppRouter(createMemoryHistory({ initialEntries, initialIndex: initialEntries.length - 1 }))
}

export function TestRouter({
  initialEntries,
  router,
  children,
}: {
  initialEntries?: string[]
  router?: AppRouter
  children: ReactNode
}) {
  const [r] = useState(() => router ?? createTestRouter(initialEntries))
  return <AppRouterProvider router={r}>{children}</AppRouterProvider>
}
