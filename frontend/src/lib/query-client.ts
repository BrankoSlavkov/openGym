import { QueryClient } from '@tanstack/react-query'

// Mutations must never be replayed automatically: some routes create workouts or invitations.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})
