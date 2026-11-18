// Missed-workout nudge — the server half. Hand-copied (not imported) from
// frontend/src/lib/nudge.js, as queue.js is from lib/queue.js: see there for the three rules
// (WHEN 20:00, or 2 h after the reminder, until 21:30; WHICH day counts as missed; the back-off
// after 3 missed days in a row). Kept out of server.js so it can be unit-tested without booting
// the server; the tick in server.js adds what only it knows (the push subscription, a session
// on screen right now, the once-a-day mark in db.json).
import { effectiveRoutineId, queueLiveOn } from './queue.ts';
import type { QueueState } from './queue.ts';

export const NUDGE_TONES = ['friendly', 'guilt', 'drill'] as const;
export const NUDGE_MAX_MISSES = 3;
export const NUDGE_LOOKBACK_DAYS = 14;
const EVENING = 20 * 60, LATEST = 21 * 60 + 30, AFTER_REMINDER = 120;

export const toneOf = (reminder?: { tone?: unknown } | null) =>
  NUDGE_TONES.find(tone => tone === reminder?.tone) ?? 'friendly';

const hhmmToMin = (v: string | null | undefined) => {
  const m = /^(\d{2}):(\d{2})$/.exec(v || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

/** Minutes after midnight the nudge is owed from, or null when that would be after 21:30. */
export function nudgeMinute(reminderTime: string | null | undefined) {
  const r = hhmmToMin(reminderTime);
  const at = Math.max(EVENING, Number.isNaN(r) ? 0 : r + AFTER_REMINDER);
  return at > LATEST ? null : at;
}

/** Is `hhmm` inside today's nudge window for a reminder set at `reminderTime`? */
export function nudgeWindowOpen(reminderTime: string | null | undefined, hhmm: string) {
  const at = nudgeMinute(reminderTime);
  const now = hhmmToMin(hhmm);
  return at != null && now >= at && now <= LATEST;
}

// Calendar arithmetic on ISO dates at UTC noon: no zone or DST edge can move the day.
const dayBefore = (iso: string) => new Date(Date.parse(iso + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
interface NudgeState {
  workouts?: unknown;
  routines?: unknown;
  [field: string]: unknown;
}
type RecordRow = Record<string, unknown>;
const records = (value: unknown): RecordRow[] => Array.isArray(value)
  ? value.filter((item): item is RecordRow => !!item && typeof item === 'object')
  : [];
const logged = (state: { workouts: RecordRow[] }, iso: string) =>
  state.workouts.some(workout => workout.d === iso);
// A day with a note on it (frontend lib/day-notes.js: a quick pick or a line of text) is excused:
// never a missed day, never nudged or reminded about.
const DAY_NOTE_TAGS = ['sick', 'travel', 'rest', 'injured'];
export function excusedOn(state: unknown, iso: string) {
  const notes = state && typeof state === 'object' && 'dayNotes' in state ? state.dayNotes : null;
  const e = notes && typeof notes === 'object' ? (notes as RecordRow)[iso] : null;
  if (!e || typeof e !== 'object' || Array.isArray(e)) return false;
  return ('tag' in e && DAY_NOTE_TAGS.some(tag => tag === e.tag))
    || ('text' in e && typeof e.text === 'string' && e.text.trim() !== '');
}

function missed(S: QueueState & { dayNotes?: unknown; workouts: RecordRow[] }, iso: string) {
  if (logged(S, iso) || excusedOn(S, iso)) return null;
  const rid = effectiveRoutineId(S, iso);
  if (!rid) return null;
  if (queueLiveOn(S, iso) && logged(S, dayBefore(iso))) return null;
  return rid;
}

/**
 * The routine id to nudge about on `iso`, or null: not a missed day, or 3 missed days in a row
 * already since the last workout (back-off). Workouts dated after `iso` are not looked at.
 */
export function nudgeFor(state: NudgeState | null | undefined, iso: string) {
  const S = { ...state, workouts: records(state?.workouts), routines: records(state?.routines) };
  const rid = missed(S, iso);
  if (!rid) return null;
  const last = S.workouts.reduce((m, w) => (typeof w.d === 'string' && w.d < iso && w.d > m ? w.d : m), '');
  let misses = 0;
  let d = dayBefore(iso);
  for (let i = 0; i < NUDGE_LOOKBACK_DAYS && d > last; i++, d = dayBefore(d)) {
    if (missed(S, d) && ++misses >= NUDGE_MAX_MISSES) return null;
  }
  return rid;
}

/** The day's line index: by date, so a day keeps its line and consecutive days rotate. */
export const lineIndex = (iso: string, n: number) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000) % n;
