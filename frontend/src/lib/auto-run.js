// Fork: the "Auto" button on a timed exercise's card (components/AutoRunButton.jsx).
//
// One tap turns on the auto-hold chain (lib/auto-holds.js) for the rest of this workout, without
// touching the profile's setting: you start the first hold, and when it ends its pause starts,
// then the next timed set counts in and starts by itself, into the next exercise too. "Stop auto",
// or the button again, turns it off (active.autoHoldsOff, which wins over this).
//
// While it is on, the pause between two holds is short: 15 seconds, unless the exercise (or the
// set) has a rest of its own. Into anything that is not a hold that starts by itself, the normal
// rest applies.

/** The pause between holds while the Auto button is on, in seconds. */
export const AUTO_RUN_REST_SEC = 15

/** Whether the Auto button is on for the running workout. */
export function autoRunOn (S) {
  const A = S && S.active
  return !!A && A.autoRun === true && A.autoHoldsOff !== true && !A.editingWorkoutId && !A.backfill
}

/** Whether any exercise of the unit set a rest of its own (between sets, or into the next exercise). */
export function unitOwnRest (entries, unit) {
  return (Array.isArray(unit) ? unit : []).some(idx => {
    const tg = entries?.[idx]?.target
    if (!tg) return false
    return Number(tg.restSec) > 0 || tg.restOff === true || Number(tg.nextRestSec) > 0 || tg.nextRestOff === true
  })
}

/**
 * The pause after a ticked set while the Auto button is on, or null for the normal rest.
 * `unit`: the entry indexes of the ticked set's exercise (or superset); `ownSetRest`: the set's
 * own rest (supersetFlow ownSetRest), null when it has none; `next`: the hold the chain starts
 * next (lib/auto-holds.js nextAutoHold), null when what follows is not one.
 */
export function autoRunRestSec (S, { unit, ownSetRest = null, next = null } = {}) {
  if (!autoRunOn(S) || !next || ownSetRest != null) return null
  if (unitOwnRest(S.active.entries, unit)) return null
  return AUTO_RUN_REST_SEC
}
