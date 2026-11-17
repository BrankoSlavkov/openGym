export type NewExDefaults = { sets: number; reps: number; sec: number }
export const NEW_EX_DEFAULTS: NewExDefaults = { sets: 3, reps: 10, sec: 45 }
const LIMITS: Record<keyof NewExDefaults, readonly [number, number]> = { sets: [1, 10], reps: [1, 50], sec: [5, 600] }

/** Read and clamp persisted preferences, including older or malformed profile data. */
export function newExDefaultsOf(state: unknown): NewExDefaults {
  const raw = state && typeof state === 'object' && 'newExDefaults' in state ? state.newExDefaults : undefined
  const own = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const result = { ...NEW_EX_DEFAULTS }
  for (const key of Object.keys(LIMITS) as (keyof NewExDefaults)[]) {
    const [lo, hi] = LIMITS[key]
    const value = Math.round(Number(own[key]))
    result[key] = Number.isFinite(value) && value >= lo ? Math.min(hi, value) : NEW_EX_DEFAULTS[key]
  }
  return result
}
