import type { WorkoutEntry } from '../lib/domain-types.ts'
import { useMemo } from 'react'
import BodyMap from './BodyMap.tsx'
import { loadOfRoutine } from '../lib/muscles.js'

// A thumbnail of what one or more routines hit, for list rows (Plan's routines, Home's Today).
// Decoration beside the name: the row itself is the button, so the map is hidden from screen
// readers and takes no taps. Nothing at all for a routine that hits nothing yet.
export default function MiniBodyMap({
  routines,
  body,
  tour,
}: {
  routines: ({ ex?: WorkoutEntry[] } | null | undefined)[]
  body?: string
  tour?: string
}) {
  const load: Record<string, number> = useMemo(
    () => loadOfRoutine({ ex: routines.flatMap((r) => r?.ex || []) }),
    [routines],
  )
  if (!Object.values(load).some((v) => v > 0)) return null
  return (
    <span className="bm-mini-wrap" aria-hidden="true" data-tour={tour}>
      <BodyMap className="bm-mini" load={load} body={body} />
    </span>
  )
}
