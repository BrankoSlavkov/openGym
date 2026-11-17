import type { SetRow, WorkoutEntry } from './domain-types.ts'

export type ExerciseProgress = 'done' | 'partial' | 'todo'
export interface ExerciseChip {
  key: string
  unit: number[]
  n: number
  state: ExerciseProgress
  fill: number
  current: boolean
}
// The chip row at the top of a running workout (#323, the "coloured dots" of #163): one chip per
// unit (a superset is one chip), saying how far along it is. It needs no new data, only the
// session's own rows, so it lives here as a plain function the view and the tests share.
import { supersetUnits } from './history.js'
import { isWarmupRow, isSideSet } from './workout-model.js'

// Anything ticked counts as a start, one side of a per-side set included.
const touched = (s: SetRow) => !!(s.done || (isSideSet(s) && (s.sides?.L?.done || s.sides?.R?.done)))

/** How far one exercise is: 'done' once every work set is ticked (a warm-up you skipped does not
 *  hold the chip back), 'partial' once anything is ticked, else 'todo'. An exercise with no rows
 *  yet has nothing done. */
export function entryProgress(entry: WorkoutEntry | null | undefined): ExerciseProgress {
  const sets = entry?.sets || []
  const work = sets.filter((s) => !isWarmupRow(s))
  if (work.length && work.every((s) => s.done)) return 'done'
  return sets.some(touched) ? 'partial' : 'todo'
}

/** One chip per unit: { key, unit, n, state, fill, current }. A superset is done when all of its
 *  members are, and started when any of them is. `fill` is 0..1, the ticked work sets over all
 *  the unit's work sets (warm-ups left out), for the chip's fill. `cur` is the session's marker
 *  (s.active.cur). */
export function exerciseChips(entries: WorkoutEntry[], cur: number): ExerciseChip[] {
  const list = Array.isArray(entries) ? entries : []
  const units: number[][] = supersetUnits(list)
  return units.map((unit, k) => {
    const states = unit.map((idx) => entryProgress(list[idx]))
    const state = states.every((s) => s === 'done') ? 'done' : states.some((s) => s !== 'todo') ? 'partial' : 'todo'
    const work = unit.flatMap((idx) => (list[idx]?.sets || []).filter((s) => !isWarmupRow(s)))
    const fill = work.length ? work.filter((s) => s.done).length / work.length : 0
    return { key: unit.join('-'), unit, n: k + 1, state, fill, current: unit.includes(cur) }
  })
}
