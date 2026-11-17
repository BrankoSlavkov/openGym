import { queryClient } from './query-client.ts'

export interface QuerySessionState { user?: { id?: string } | null }
interface SessionStore {
  subscribe(listener: (state: QuerySessionState, previous: QuerySessionState) => void): () => void
}

/** Cached responses and in-flight reads belong to the account that started them. */
export function bindQuerySession(store: SessionStore): () => void {
  return store.subscribe((state, previous) => {
    if (state.user?.id !== previous.user?.id) queryClient.clear()
  })
}
