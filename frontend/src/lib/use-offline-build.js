// The React side of lib/build-caps.ts: true in openGym Offline. It is decided before the first
// render, so this mostly reads a constant; the subscription covers a slow native answer.
import { useSyncExternalStore } from 'react'
import { offlineBuild, subscribeBuildCaps } from './build-caps.ts'

export const useOfflineBuild = () => useSyncExternalStore(subscribeBuildCaps, offlineBuild, offlineBuild)
