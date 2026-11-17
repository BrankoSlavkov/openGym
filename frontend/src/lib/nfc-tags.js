// NFC stickers (v1.4.4): what an openGym sticker says, and what a tap on one does.
//
// The app writes plain NDEF URI records itself (lib/nfc.js, NfcTagsPlugin on the phones, Web NFC
// in Chrome on Android). Two kinds:
//
//   https://opengym.ch/nfc?do=start            start today's workout (or open the one running)
//   https://opengym.ch/nfc?ex=ID               a machine: jump to that exercise in the workout
//
// Upstream also writes do=checkin stickers (show the gym membership code). This fork has no gym
// check-in, so one of those reads as { kind: 'open' }: it opens the workout or the Start screen
// and starts nothing (with start=1 it is a start sticker).
//
// An https link and not only our own scheme, because that is what a phone reads with the app
// closed: Android hands the tag to the app through the NDEF_DISCOVERED filter in the manifest,
// and iOS background tag reading only routes web links (custom schemes are not supported there);
// until opengym.ch is an associated domain of the iPhone app, the link opens opengym.ch/nfc in
// Safari, which hands it on as opengym://nfc?... A phone without openGym lands on that page too.
// The short opengym:// forms (opengym://start, opengym://exercise/ID) are read as well.
//
// Only our own stickers: nothing here reads, copies or emulates a gym's access card.
import { effectiveRoutineIds, effectiveRoutines } from './history.js'
import { canonicalExId } from './exercises.js'

export const TAG_HOST = 'opengym.ch'
export const TAG_PATH = '/nfc'
export const SCHEME = 'opengym'
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const cleanId = v => (typeof v === 'string' && ID_RE.test(v) ? v : null)

/** The link a sticker gets: { kind: 'start' } or { kind: 'exercise', id }. */
export function tagUrl(tag) {
  const q = new URLSearchParams()
  if (tag?.kind === 'exercise') {
    const id = cleanId(String(tag.id ?? ''))
    if (!id) throw new Error('bad exercise id')
    q.set('ex', id)
  } else if (tag?.kind === 'start') {
    q.set('do', 'start')
  } else {
    throw new Error('unknown tag')
  }
  return `https://${TAG_HOST}${TAG_PATH}?${q}`
}

const fromQuery = q => {
  const ex = q.get('ex')
  if (ex != null) { const id = cleanId(ex); return id ? { kind: 'exercise', id } : null }
  const what = q.get('do')
  if (what === 'start') return { kind: 'start' }
  if (what === 'checkin') return { kind: q.get('start') === '1' ? 'start' : 'open' }
  return null
}

/**
 * What a link read from a sticker (or handed over by opengym.ch/nfc) asks for, or null for
 * anything that is not one of ours. Never throws.
 */
export function parseTagUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 512) return null
  let u
  try { u = new URL(raw.trim()) } catch { return null }
  const proto = u.protocol.toLowerCase()
  if (proto === 'https:' || proto === 'http:') {
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (host !== TAG_HOST) return null
    if (u.pathname.replace(/\.html$/, '').replace(/\/+$/, '') !== TAG_PATH) return null
    return fromQuery(u.searchParams)
  }
  if (proto !== SCHEME + ':') return null
  // opengym://nfc?…, opengym://checkin?start=1, opengym://start, opengym://exercise/<id>
  const host = (u.hostname || '').toLowerCase()
  const rest = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  if (host === 'nfc' && !rest) return fromQuery(u.searchParams)
  if (host === 'start' && !rest) return { kind: 'start' }
  if (host === 'checkin' && !rest) return { kind: u.searchParams.get('start') === '1' ? 'start' : 'open' }
  if (host === 'exercise') { const id = cleanId(rest); return id ? { kind: 'exercise', id } : null }
  return null
}

const liveSession = S => !!S?.active && !S.active.editingWorkoutId && !S.active.backfill

/**
 * What the app does for a tag, decided from the state alone (the screens act on it, nfc-run.js):
 *   { do: 'start', ids }       today's planned session, through the usual Start (weigh-in first)
 *   { do: 'open-workout' }     a workout is running already: open it, never start a second one
 *   { do: 'open-start' }       nothing planned today: the Start screen to pick from
 *   { do: 'jump', idx }        a machine whose exercise is in the running session
 *   { do: 'offer-add', id }    a machine whose exercise is not in it: ask before adding
 *   { do: 'details', id }      a machine outside a workout: the exercise's details
 *   { do: 'unknown-exercise' } an exercise this profile does not have (a deleted own one)
 *   { do: 'ignore' }           not one of ours
 * `hasExercise(id)` says whether the library knows the id (catalogue or the user's own).
 */
export function routeTag(S, tag, { today, hasExercise = () => false } = {}) {
  if (!tag || !S) return { do: 'ignore' }
  // An upstream check-in sticker: the same as a start sticker, minus starting anything on its own.
  if (tag.kind === 'open') return { do: S.active ? 'open-workout' : 'open-start' }
  if (tag.kind === 'start') {
    if (S.active) return { do: 'open-workout' }
    // The Start tab's rule (TabBar): a day whose routines have no exercises is no session.
    const st = { ...S, routines: S.routines || [], week: S.week || {}, dayPlan: S.dayPlan || {} }
    let ids = []
    try {
      if (effectiveRoutines(st, today).some(r => r.ex && r.ex.length)) ids = effectiveRoutineIds(st, today)
    } catch { ids = [] }
    return ids.length ? { do: 'start', ids } : { do: 'open-start' }
  }
  if (tag.kind === 'exercise') {
    const id = canonicalExId(tag.id)
    if (liveSession(S)) {
      const idx = (S.active.entries || []).findIndex(e => e && (e.id === id || e.id === tag.id))
      if (idx >= 0) return { do: 'jump', idx }
      return hasExercise(id) ? { do: 'offer-add', id } : { do: 'unknown-exercise' }
    }
    return hasExercise(id) ? { do: 'details', id } : { do: 'unknown-exercise' }
  }
  return { do: 'ignore' }
}

/**
 * Drops repeats: the same sticker read again within `sameMs` (a phone held on it, or Android
 * delivering one tap twice), and any tag within `anyMs` of the last one handled.
 * Returns a function (url, now) => true when this one should be handled.
 */
export function tagDebouncer({ sameMs = 4000, anyMs = 1200 } = {}) {
  let lastUrl = null, lastAt = -Infinity
  return (url, now = Date.now()) => {
    const gap = now - lastAt
    if (gap >= 0 && gap < anyMs) return false
    if (url === lastUrl && gap >= 0 && gap < sameMs) return false
    lastUrl = url
    lastAt = now
    return true
  }
}
