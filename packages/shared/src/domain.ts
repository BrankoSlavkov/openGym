// Shared shapes of the persisted profile document (store/useStore.js `S`) and the workouts in it.
// Type-only: nothing here exists at run time, so plain Node (api/, mcp/) strips it away.
//
// Grown as files are converted to TypeScript (FORK.md, migration phase 4). The JavaScript still
// writes these documents, and old backups and other devices carry older shapes, so fields stay
// optional and every type keeps an index signature until the code that writes it is typed too.

/** A logged set. Reps sets carry `w` and `r`; timed sets `sec`; cardio `min`/`speed`. */
export interface SetRow {
  w?: number | string | null
  r?: number | string | null
  rir?: number | null
  sec?: number
  min?: number
  speed?: number
  done?: boolean
  /** A unilateral set: one row per side. */
  sides?: { L?: SetRow; R?: SetRow }
  [key: string]: unknown
}

/** One exercise inside a workout. */
export interface WorkoutEntry {
  id?: string
  sets?: SetRow[]
  target?: { assisted?: boolean; [key: string]: unknown } | null
  [key: string]: unknown
}

/** A finished workout. `d` is its local date (YYYY-MM-DD). */
export interface Workout {
  d?: string
  entries?: WorkoutEntry[]
  [key: string]: unknown
}

/** The profile document. */
export interface AppState {
  workouts?: Workout[]
  oneRmFormula?: string
  [key: string]: unknown
}
