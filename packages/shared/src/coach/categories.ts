/* The data categories the consent screen names (FR-09/10).
 *
 * Its own tiny module so a screen that only needs to *say* what would leave — the mobile setup
 * screen, before anything AI-related has been loaded — can import five strings without pulling
 * the payload builder and the exercise catalogue behind it. payload.js re-exports it, and
 * builds from it, so the screen cannot drift from the payload. */
export const DATA_CATEGORIES = Object.freeze([
  'plan',        // routines, exercises, sets/reps, schedule, progression settings
  'training',    // logged sets, targets, effort ratings, durations, PRs, session notes in the review window
  'bodyweight',  // weigh-ins in the window and your goal weight
  'profile',     // the intake answers you gave the Coach, including any limitations
  'prefs'        // unit, language, effort scale
]);

/* What else the Coach may read, each with its own switch under "What the Coach sees" (stored in
 * S.coach.share). `on` is the default for a profile that never touched the switch. Health is off
 * until asked for: sleep, heart rate and how you feel are more personal than a set of squats. */
export const OPTIONAL_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'records' as const, on: true }),       // estimated 1RMs and their 12-week trend
  Object.freeze({ id: 'measurements' as const, on: true }),  // body measurements, latest and eight weeks before
  Object.freeze({ id: 'health' as const, on: false })        // daily check-ins, phone vitals, blood pressure
]);

/** The switches as they stand for a profile: { records, measurements, health }. */
export interface CoachSharingState {
  coach?: { share?: Record<string, unknown> }
}
export type CoachSharing = Record<'records' | 'measurements' | 'health', boolean>
export function shareOf(S?: CoachSharingState | null): CoachSharing {
  const set = S && S.coach && S.coach.share && typeof S.coach.share === 'object' ? S.coach.share : {};
  const out: CoachSharing = { records: true, measurements: true, health: false };
  for (const c of OPTIONAL_CATEGORIES) {
    const value = set[c.id];
    out[c.id] = typeof value === 'boolean' ? value : c.on;
  }
  return out;
}
