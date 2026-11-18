/* What a trainer or gym lead gets to read of a member: one projection per category, built from the
 * member's state document on the server and never the document itself (docs/TRAINERS.md,
 * "What a trainer sees"). Pure functions, no node imports, so they test without a server.
 *
 *   summarize(S, levels, opts)   one row of the member list: last workout, streak, this week, flags
 *   project(S, levels, opts)     the member detail: only the categories `levels` lets through
 *
 * `levels` is permissions.js levelsFor(): { metrics: 'view', workouts: 'off', ... }. A category at
 * 'off' is simply absent from the answer, so nothing here can leak what was not granted. Media
 * references, photo hashes and notes are stripped from workouts unless their own category is on. */
import { effectiveRoutineId } from '../queue.ts';
import { excusedOn } from '../nudge.ts';
import { streakWalk, type StreakState } from '../coach/core/streak.ts';

const DAY = 86400000;
type Document = Record<string, unknown>;
type Profile = Document & StreakState;
type Levels = Readonly<Record<string, string | undefined>> | null | undefined;
type Dated = Document & { d: string };

const isRecord = (value: unknown): value is Document => !!value && typeof value === 'object' && !Array.isArray(value);
const records = (v: unknown): Document[] => Array.isArray(v) ? v.filter(isRecord) : [];
const props = (value: unknown): Document => value && typeof value === 'object' ? value as Document : {};
const datedRecords = (value: unknown): Dated[] => records(value).filter((row): row is Dated => isISO(row.d));
const isISO = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const num = (v: unknown): number => {
  const n = +(v as number);
  return Number.isFinite(n) ? n : 0;
};
const on = (levels: Levels, cat: string): boolean => !!levels?.[cat] && levels[cat] !== 'off';
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');

// Calendar maths on ISO dates at UTC noon, like nudge.js: no zone or DST edge moves a day.
const ms = (iso: string) => Date.parse(iso + 'T12:00:00Z');
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => iso(ms(d) + n * DAY);
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);
/** The first day of the week `d` falls in: Monday, or Sunday for a profile that starts weeks then. */
export function weekOf(d: string, S: Profile | null | undefined) {
  const start = S?.weekStart === 0 ? 0 : 1;
  const wd = new Date(ms(d)).getUTCDay();
  return addDays(d, -((wd - start + 7) % 7));
}

/* ---------- workouts, the numbers ---------- */
const isWarm = (s: Document) => s?.phase === 'warmup' || (s?.phase == null && s?.warmup === true);
const sideVol = (side: unknown) => {
  const x = props(side);
  return x.done ? num(x.w) * num(x.r) : 0;
};
const setVolume = (s: Document) => (isWarm(s) ? 0 : s.sides ? sideVol(props(s.sides).L) + sideVol(props(s.sides).R) : s.done ? num(s.w) * num(s.r) : 0);
const setDone = (s: Document) => (isWarm(s) ? 0 : s.sides ? (props(props(s.sides).L).done ? 1 : 0) + (props(props(s.sides).R).done ? 1 : 0) : s.done ? 1 : 0);
const entriesOf = (w: Document): (Document & { sets: Document[] })[] => records(w.entries).map(e => ({ ...e, sets: records(e.sets) }));
export const workoutVolume = (w: Document) => Math.round(entriesOf(w).reduce((v, e) => v + e.sets.reduce((a, s) => a + setVolume(s), 0), 0));
export const workoutSets = (w: Document) => entriesOf(w).reduce((n, e) => n + e.sets.reduce((a, s) => a + setDone(s), 0), 0);
const minutes = (w: Document) => (num(w.end) > num(w.start) && num(w.start) > 0 ? Math.round((num(w.end) - num(w.start)) / 60000) : null);
// Epley, the same estimate everywhere a single number is wanted (lib/onerm.js has the rest).
const e1rm = (w: number, r: number) => (r > 0 && w > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0);

const dated = (S: Profile | null | undefined) => datedRecords(S?.workouts).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : num(b.start) - num(a.start)));

/* ---------- the streak ---------- */
// The app's own walk (coach/core/streak.ts, which lib/streak.js runs too): the freeze rule with its
// history, so the trainer's number matches the member's phone week for week.
export const streakWeeks = (S: StreakState | null | undefined, today: string) => streakWalk(S, today).current;

/** Planned days in the last `days` (today left out: it is not over) without a workout or a note. */
export function missedDays(S: Profile | null | undefined, today: string, days = 7) {
  const doc = { ...S, workouts: records(S?.workouts), routines: records(S?.routines) };
  const out: string[] = [];
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, -i);
    if (doc.workouts.some(w => w.d === d) || excusedOn(doc, d)) continue;
    let rid = null;
    try { rid = effectiveRoutineId(doc, d); } catch { rid = null; }
    if (rid) out.push(d);
  }
  return out;
}

/** How many sessions this week, against how many days the plan has in it. */
function weekCount(S: Profile, today: string) {
  const start = weekOf(today, S);
  const done = datedRecords(S?.workouts).filter(w => w.d >= start && w.d <= addDays(start, 6)).length;
  const doc = { ...S, workouts: records(S?.workouts), routines: records(S?.routines) };
  let planned = 0;
  for (let i = 0; i < 7; i++) { try { if (effectiveRoutineId(doc, addDays(start, i))) planned++; } catch { /* unreadable plan: not counted */ } }
  return { done, planned };
}

function weightTrend(S: Profile, today: string, days = 14) {
  const bw = datedRecords(S?.bodyweight).filter(e => num(e.w) > 0).sort((a, b) => (a.d < b.d ? -1 : 1));
  const last = bw.at(-1);
  if (!last) return null;
  const from = bw.filter(e => e.d >= addDays(today, -days) && e.d < last.d);
  return { last: num(last.w), d: last.d, delta: from[0] ? Math.round((num(last.w) - num(from[0].w)) * 10) / 10 : null, days };
}

type MemberFlag =
  | { kind: 'missed'; n: number; days: string[] }
  | { kind: 'pr'; n: number; ex?: string[] }
  | { kind: 'inactive'; days: number }
  | { kind: 'weight'; delta: number; days: number }
  | { kind: 'pending'; n: number };

export interface MemberSummary {
  shares: string[];
  flags: MemberFlag[];
  lastWorkout?: string | null;
  streak?: number;
  week?: ReturnType<typeof weekCount>;
  perWeek?: number;
  idleDays?: number | null;
  weight?: NonNullable<ReturnType<typeof weightTrend>>;
  unit?: 'lb' | 'kg';
}

/* ---------- one row of the member list ---------- */
/** Last workout, streak, this week and the flags, each only where its category is shared.
 *  `pending` is how many suggestions the member has not answered yet. */
export function summarize(S: Profile | null | undefined, levels: Levels, { today, inactiveDays = 7, pending = 0 }: { today: string; inactiveDays?: number; pending?: number }): MemberSummary {
  const out: MemberSummary = { shares: Object.keys(levels || {}).filter(c => on(levels, c)), flags: [] };
  if (!S || typeof S !== 'object') return out;
  if (on(levels, 'metrics')) {
    const ws = dated(S);
    const last = ws[0] || null;
    out.lastWorkout = last ? last.d : null;
    out.streak = streakWeeks(S, today);
    out.week = weekCount(S, today);
    const since4 = addDays(today, -27);
    out.perWeek = Math.round(ws.filter(w => w.d >= since4 && w.d <= today).length / 4 * 10) / 10;
    const missed = missedDays(S, today);
    if (missed.length) out.flags.push({ kind: 'missed', n: missed.length, days: missed });
    const prDays = ws.filter((w): w is Dated & { prs: unknown[] } => w.d >= addDays(today, -6) && Array.isArray(w.prs) && w.prs.length > 0);
    const prs = [...new Set(prDays.flatMap(w => w.prs.filter(x => typeof x === 'string' || typeof x === 'number').map(String)))];
    if (prs.length) out.flags.push({ kind: 'pr', n: prs.length, ...(on(levels, 'workouts') ? { ex: prs.slice(0, 5) } : {}) });
    const idle = last ? daysBetween(last.d, today) : null;
    if (idle != null && idle >= inactiveDays) out.flags.push({ kind: 'inactive', days: idle });
    out.idleDays = idle;
  }
  if (on(levels, 'bodyweight')) {
    const tr = weightTrend(S, today);
    if (tr) {
      out.weight = tr;
      if (tr.delta != null && Math.abs(tr.delta) >= 1) out.flags.push({ kind: 'weight', delta: tr.delta, days: tr.days });
    }
  }
  if (pending > 0) out.flags.push({ kind: 'pending', n: pending });
  out.unit = S.unit === 'lb' ? 'lb' : 'kg';
  return out;
}

/* ---------- the detail ---------- */
const SET_KEYS = ['w', 'r', 'done', 'phase', 'warmup', 'rpe', 'rir', 't', 'dist', 'kind'];
function cleanSet(s: Document) {
  const o: Document = {};
  for (const k of SET_KEYS) if (s[k] !== undefined && (typeof s[k] !== 'object' || s[k] === null)) o[k] = s[k];
  if (s.sides && typeof s.sides === 'object') {
    const sides: Partial<Record<'L' | 'R', { w: unknown; r: unknown; done: boolean }>> = {};
    for (const side of ['L', 'R'] as const) {
      const x = props(s.sides)[side];
      if (x && typeof x === 'object') {
        const row = props(x);
        sides[side] = { w: row.w, r: row.r, done: !!row.done };
      }
    }
    o.sides = sides;
  }
  return o;
}
const byOf = (value: unknown) => {
  const b = props(value);
  return b.kind === 'trainer' ? { kind: 'trainer' as const, id: str(b.id, 64), name: str(b.name, 60), at: num(b.at) } : null;
};
/** A workout without media, photos and (unless notes are shared) notes. */
export function cleanWorkout(w: Document, { notes = false }: { notes?: boolean } = {}) {
  const entries = entriesOf(w).map(e => ({
    id: e.id, sets: e.sets.map(cleanSet),
    ...(e.topW ? { topW: e.topW } : {}), ...(e.sg ? { sg: e.sg } : {}),
    ...(notes && typeof e.note === 'string' && e.note ? { note: str(e.note, 500) } : {}),
  }));
  const by = byOf(w._by);
  return {
    id: w.id ?? `${w.d}|${w.start}`, d: w.d, start: num(w.start) || null, end: num(w.end) || null, name: str(w.name, 80),
    routineId: w.routineId ?? null, entries, prs: Array.isArray(w.prs) ? w.prs.map(String).slice(0, 40) : [],
    volume: workoutVolume(w), sets: workoutSets(w), mins: minutes(w),
    ...(notes && typeof w.note === 'string' && w.note ? { note: str(w.note, 1000) } : {}),
    ...(by ? { _by: by } : {}), ...(byOf(w._edit) ? { _edit: byOf(w._edit) } : {}),
  };
}

const ROUTINE_DROP = new Set(['photo', 'photos', 'media', 'video', 'img', 'sound', 'sounds', '_f', '_u']);
function cleanRoutine(r: Document) {
  const o: Document = {};
  for (const [k, v] of Object.entries(r)) if (!ROUTINE_DROP.has(k)) o[k] = v;
  const ex = records(r.ex).map(e => { const x: Document = {}; for (const [k, v] of Object.entries(e)) if (!ROUTINE_DROP.has(k)) x[k] = v; return x; });
  // Replacing an existing property keeps its position for serialized projections.
  return { ...o, ex };
}
// A custom exercise's name and muscles, never its photo or video.
const cleanCustom = (c: Document) => ({ id: c.id, name: str(c.name, 80), ...(Array.isArray(c.muscles) ? { muscles: c.muscles.slice(0, 12) } : {}), ...(c.equip ? { equip: c.equip } : {}) });

/** Names for the custom exercises a projection mentions, so the trainer sees words, not ids. */
export function customNames(S: Profile | null | undefined, ids: readonly unknown[]) {
  const want = new Set(ids.map(String));
  return records(S?.customEx).filter(c => want.has(String(c.id))).map(cleanCustom);
}

/** Weekly numbers for the overview: sessions (metrics) and, with workouts, volume and the best e1RM lifts. */
function stats(S: Profile, levels: Levels, today: string, weeks = 8) {
  const ws = dated(S);
  const first = weekOf(addDays(today, -7 * (weeks - 1)), S);
  const rows: { week: string; sessions: number; volume?: number }[] = Array.from({ length: weeks }, (_, i) => ({ week: addDays(first, 7 * i), sessions: 0, volume: 0 }));
  for (const w of ws) {
    if (w.d < first || w.d > today) continue;
    const i = Math.floor(daysBetween(first, weekOf(w.d, S)) / 7);
    const row = rows[i];
    if (!row) continue;
    row.sessions++;
    if (on(levels, 'workouts')) row.volume = (row.volume ?? 0) + workoutVolume(w);
  }
  if (!on(levels, 'workouts')) for (const r of rows) delete r.volume;
  const out: { weeks: typeof rows; lifts?: { id: unknown; e1rm: number; before: number | null }[] } = { weeks: rows };
  if (on(levels, 'workouts')) {
    // Best estimated 1RM per exercise in the last 120 days against the 120 before.
    const best = new Map<unknown, { id: unknown; now: number; before: number; n: number }>();
    const cut = addDays(today, -120), cut2 = addDays(today, -240);
    for (const w of ws) {
      if (w.d < cut2) continue;
      for (const e of entriesOf(w)) {
        for (const s of e.sets) {
          if (isWarm(s) || !s.done) continue;
          const v = e1rm(num(s.w), num(s.r));
          if (!v) continue;
          const b = best.get(e.id) || { id: e.id, now: 0, before: 0, n: 0 };
          if (w.d >= cut) { b.now = Math.max(b.now, v); b.n++; } else b.before = Math.max(b.before, v);
          best.set(e.id, b);
        }
      }
    }
    out.lifts = [...best.values()].filter(b => b.now > 0).sort((a, b) => b.n - a.n).slice(0, 6)
      .map(b => ({ id: b.id, e1rm: Math.round(b.now * 10) / 10, before: b.before ? Math.round(b.before * 10) / 10 : null }));
  }
  return out;
}

/* ---------- progress photos ---------- */
const HASH = /^[0-9a-f]{64}$/;
const STILL = new Set(['image/jpeg', 'image/png', 'image/webp']);
type Still = Document & { hash: string; mime: string };
const stillRef = (value: unknown): value is Still => {
  const m = props(value);
  return typeof m.hash === 'string' && HASH.test(m.hash) && typeof m.mime === 'string' && STILL.has(m.mime);
};
const dims = (m: Still) => ({ ...(num(m.width) > 0 ? { width: num(m.width) } : {}), ...(num(m.height) > 0 ? { height: num(m.height) } : {}) });
/**
 * What the `photos` category covers, oldest first: stills filed under a day (dayPhotos, keyed by
 * hash) and stills on a workout. Never a form video, a custom exercise's picture, a sound or the
 * profile picture: those are not progress photos and stay the member's own.
 */
type ProgressPhoto = { hash: string; d: string; width?: number; height?: number; workoutId?: string };
export function progressPhotos(S: Profile | null | undefined) {
  const out: ProgressPhoto[] = [], seen = new Set<string>();
  const add = (m: Still, d: string, extra: { workoutId?: string }) => { if (!seen.has(m.hash)) { seen.add(m.hash); out.push({ hash: m.hash, d, ...dims(m), ...extra }); } };
  const map = S?.dayPhotos && typeof S.dayPhotos === 'object' && !Array.isArray(S.dayPhotos) ? S.dayPhotos : {};
  for (const [h, value] of Object.entries(map)) {
    const e = props(value);
    if (isISO(e.d) && stillRef(e.m) && e.m.hash === h) add(e.m, e.d, {});
  }
  for (const w of records(S?.workouts)) {
    if (!isISO(w.d)) continue;
    for (const m of records(w.media)) if (stillRef(m)) add(m, w.d, { workoutId: String(w.id ?? `${w.d}|${w.start}`) });
  }
  return out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}

export interface MemberProjection {
  shared: string[];
  unit: 'lb' | 'kg';
  metrics?: MemberSummary & { stats: ReturnType<typeof stats> };
  workouts?: { list: ReturnType<typeof cleanWorkout>[]; next: string | null };
  plans?: {
    routines: ReturnType<typeof cleanRoutine>[];
    week: object;
    dayPlan: Document;
    queue?: unknown;
    rotation?: unknown;
    schedule?: unknown;
    weekStart: 0 | 1;
  };
  bodyweight?: { entries: { d: string; w: number; _by?: ReturnType<typeof byOf> }[]; targetW?: number; rateGoal?: object };
  measurements?: { entries: Document[]; custom: { id: unknown; name: string; unit?: unknown }[] };
  notes?: { days: Record<string, { tag?: string; text?: string }> };
  photos?: { count: number; last: string | null; items: ProgressPhoto[] };
  nutrition?: unknown;
  customEx?: ReturnType<typeof customNames>;
}

/**
 * The member detail. `opts.before` pages the workouts (an ISO date, exclusive), `opts.limit` caps
 * them (default 20). Every key in the answer is one category; `shared` lists them.
 */
export function project(S: Profile | null | undefined, levels: Levels, { today, before = null, limit = 20, nutrition = null }: { today: string; before?: string | null; limit?: number; nutrition?: unknown }): MemberProjection {
  const out: MemberProjection = { shared: Object.keys(levels || {}).filter(c => on(levels, c)), unit: S?.unit === 'lb' ? 'lb' : 'kg' };
  if (!S || typeof S !== 'object') return out;
  const exIds = new Set<unknown>();
  if (on(levels, 'metrics')) out.metrics = { ...summarize(S, levels, { today }), stats: stats(S, levels, today) };
  if (on(levels, 'workouts')) {
    const all = dated(S).filter(w => !before || w.d < before);
    const page = all.slice(0, Math.max(1, Math.min(100, limit)));
    const notes = on(levels, 'notes');
    out.workouts = { list: page.map(w => cleanWorkout(w, { notes })), next: all.length > page.length ? page.at(-1)!.d : null };
    for (const w of page) for (const e of records(w.entries)) exIds.add(e.id);
    for (const l of out.metrics?.stats?.lifts || []) exIds.add(l.id);
  }
  if (on(levels, 'plans')) {
    const routines = records(S.routines).filter(r => r.id != null).map(cleanRoutine);
    for (const r of routines) for (const e of r.ex) exIds.add(e.id);
    const horizon = addDays(today, 28);
    const dayPlan: Document = {};
    for (const [d, v] of Object.entries(S.dayPlan && typeof S.dayPlan === 'object' ? S.dayPlan : {})) if (isISO(d) && d >= addDays(today, -7) && d <= horizon) dayPlan[d] = v;
    out.plans = {
      routines, week: S.week && typeof S.week === 'object' ? S.week : {}, dayPlan,
      ...(S.queue ? { queue: S.queue } : {}), ...(S.rotation ? { rotation: S.rotation } : {}),
      ...(S.schedule ? { schedule: S.schedule } : {}), weekStart: S.weekStart === 0 ? 0 : 1,
    };
  }
  if (on(levels, 'bodyweight')) {
    out.bodyweight = {
      entries: datedRecords(S.bodyweight).sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-400)
        .map(e => ({ d: e.d, w: num(e.w), ...(byOf(e._by) ? { _by: byOf(e._by) } : {}) })),
      ...(num(S.targetW) ? { targetW: num(S.targetW) } : {}), ...(S.rateGoal && typeof S.rateGoal === 'object' ? { rateGoal: S.rateGoal } : {}),
    };
  }
  if (on(levels, 'measurements')) {
    out.measurements = {
      entries: datedRecords(S.measurements).sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-200)
        // A check-in's own note (v1.4.5) is a note: it goes along only when notes are shared.
        .map(e => { const { t, _ts, _f, _u, note, ...rest } = e; return on(levels, 'notes') && typeof note === 'string' && note ? { ...rest, note: str(note, 500) } : rest; }),
      custom: records(S.customMeasurements).map(c => ({ id: c.id, name: str(c.name, 60), ...(c.unit ? { unit: c.unit } : {}) })),
    };
  }
  if (on(levels, 'notes')) {
    const days: Record<string, { tag?: string; text?: string }> = {};
    for (const [d, value] of Object.entries(props(S.dayNotes))) {
      const v = props(value);
      if (isISO(d) && d >= addDays(today, -90) && value && typeof value === 'object') days[d] = { ...(v.tag ? { tag: str(v.tag, 20) } : {}), ...(v.text ? { text: str(v.text, 500) } : {}) };
    }
    out.notes = { days };
  }
  if (on(levels, 'photos')) {
    // The newest 60, as references only: the bytes come through GET /api/trainer/member/photo,
    // which checks the same grant again for every single file.
    const ph = progressPhotos(S);
    out.photos = { count: ph.length, last: ph.at(-1)?.d ?? null, items: ph.slice(-60).reverse() };
  }
  if (on(levels, 'nutrition')) out.nutrition = nutrition || { status: 'not-linked' };
  out.customEx = customNames(S, [...exIds]);
  return out;
}
