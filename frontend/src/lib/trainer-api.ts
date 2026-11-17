// The trainer dashboard's side of the API (docs/TRAINERS.md) and the pure helpers its screens
// render with: sorting, filtering, the flags in words, a change in words. Member data fetched here
// is held in component state only, never in the store or localStorage: it is someone else's.
import { apiBlob } from './api.ts'
import type { ApiError } from './api.ts'
import { queryClient } from './query-client.ts'
import {
  getTrainerOverviewQueryOptions, getTrainerMembersQueryOptions, getTrainerMemberQueryOptions,
  getGymOverviewQueryOptions, getSharingInboxQueryOptions, getSharingPreviewQueryOptions,
  trainerOps, trainerAssign, trainerComment, trainerCode, trainerCodeRevoke, trainerAnswer,
  trainerDisconnect, trainerLeaveGym, gymCode, gymStaff, sharingInboxAnswer, sharingInboxSeen, sharingUndo,
} from '../generated/api.ts'
import type { GetConfig200, TrainerOpsBody, TrainerAssignBody, TrainerCodeBody, SharingInboxAnswerBody } from '../generated/models/index.ts'
import { t } from './i18n.js'
import { todayISO, exerciseNameText, DAYN } from './format.js'
import { exOr } from './exercises.js'

const q = (values: Record<string, string | number | null | undefined>) => Object.entries(values)
  .filter(([, value]) => value != null && value !== '')
  .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')

// Trainer mutations can change dashboard summaries, member projections, inboxes and grants.
async function changed<T>(request: Promise<T>): Promise<T> {
  const result = await request
  await queryClient.invalidateQueries({ predicate: query => {
    const url = query.queryKey[0]
    return typeof url === 'string' && ['/api/trainer', '/api/gym', '/api/sharing'].some(prefix => url.startsWith(prefix))
  } })
  return result
}

export const trainerRoles = (config: GetConfig200 | null | undefined) => (config?.trainers?.on ? config.trainers.roles || { trainer: false, lead: false } : { trainer: false, lead: false })
export const showsDashboard = (config: GetConfig200 | null | undefined) => { const roles = trainerRoles(config); return !!(roles.trainer || roles.lead) }

/* ---------- the trainer ---------- */
export const getOverview = () => queryClient.fetchQuery(getTrainerOverviewQueryOptions())
export const getMembers = () => queryClient.fetchQuery(getTrainerMembersQueryOptions({ today: todayISO() }))
/** A photo retains the transport's download cap and grant check on every request. */
export const photoBlob = (memberId: string, hash: string) => apiBlob('/api/trainer/member/photo?' + q({ id: memberId, hash }), { expectSize: 25 * 1048576 })
export const getMember = (id: string, before?: string) => queryClient.fetchQuery(getTrainerMemberQueryOptions({ id, before, today: todayISO() }))
export const sendOps = (memberId: string, ops: TrainerOpsBody['ops'], message?: string) => changed(trainerOps({ memberId, ops, message }))
export const assignRoutine = (body: TrainerAssignBody) => changed(trainerAssign(body))
export const commentOn = (memberId: string, workoutId: string, text: string) => changed(trainerComment({ memberId, workoutId, text }))
export const makeCode = (body: TrainerCodeBody) => changed(trainerCode(body))
export const revokeCode = (id: string) => changed(trainerCodeRevoke({ id }))
export const answerRequest = (id: string, accept: boolean) => changed(trainerAnswer({ id, accept }))
export const dropMember = (id: string) => changed(trainerDisconnect({ id }))
export const leaveGymAsTrainer = (gymId: string) => changed(trainerLeaveGym({ gymId }))

/* ---------- the gym lead ---------- */
export const getGym = (id: string) => queryClient.fetchQuery(getGymOverviewQueryOptions({ id, today: todayISO() }))
export const makeGymCode = (gymId: string) => changed(gymCode({ gymId }))
export const setGymTrainer = (gymId: string, user: string, on: boolean) => changed(gymStaff({ gymId, user, on }))

/* ---------- the member ---------- */
export const getInbox = () => queryClient.fetchQuery(getSharingInboxQueryOptions())
export const answerItem = (id: string, accept: boolean, extra?: Omit<SharingInboxAnswerBody, 'id' | 'accept'>) => changed(sharingInboxAnswer({ id, accept, ...(extra || {}) }))
export const markSeen = (ids?: string[]) => changed(sharingInboxSeen(ids ? { ids } : {}))
export const undoChange = (id: string, force?: boolean) => changed(sharingUndo({ id, force: !!force }))
export const previewGrant = (id: string) => queryClient.fetchQuery(getSharingPreviewQueryOptions({ grant: id, today: todayISO() }))

export interface CustomExerciseName { id?: string | number; name?: string }
export interface MemberFlag { kind: string; n?: number; days?: number; delta?: number; ex?: string[] }
export interface MemberRow {
  paused?: boolean
  member?: { name?: string }
  summary?: { flags?: MemberFlag[]; lastWorkout?: string | null; streak?: number }
}
export interface ChangeSummary {
  kind?: string; isNew?: boolean; name?: string; day?: string | number; kept?: boolean; w?: number; d?: string
}

/* ---------- helpers ---------- */
/** An exercise's name: the member's own custom exercise from the projection, else the catalogue. */
export function exName(id: string | number, customEx?: CustomExerciseName[] | null) {
  const c = (customEx || []).find(x => String(x.id) === String(id))
  if (c?.name) return c.name
  const e = exOr(id)
  return e.missing ? t('Unknown exercise') : exerciseNameText(e)
}

export const initials = (name: string | null | undefined) => {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1]?.[0] : '')).toUpperCase()
}
// A stable tint per person, from the app's own palette, so a face is easy to find again.
const TINTS = ['var(--blue)', 'var(--green)', 'var(--orange)', 'var(--teal)', 'var(--indigo)', 'var(--pink)', 'var(--purple)', 'var(--mint)']
export const tintOf = (id: string | number | null | undefined) => { let h = 0; for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TINTS[h % TINTS.length] }

// Flags that ask for the trainer's attention, most urgent first; a PR is good news, not a worry.
const ATTENTION: Record<string, number> = { missed: 3, inactive: 4, pending: 1, weight: 1, pr: 0 }
export const attentionOf = (m: MemberRow) => (m.paused ? -1 : (m.summary?.flags || []).reduce((n, f) => n + (ATTENTION[f.kind] || 0), 0))

/** The list as the search field and the sort menu say. Paused connections always sink. */
export function sortMembers<T extends MemberRow>(list: T[], sort = 'attention', query = '', filter = 'all'): T[] {
  const needle = String(query || '').trim().toLowerCase()
  const hit = (m: T) => !needle || String(m.member?.name || '').toLowerCase().includes(needle)
  const has = (m: T, k: string) => (m.summary?.flags || []).some(f => f.kind === k)
  const keep = (m: T) => filter === 'all' ? true
    : filter === 'attention' ? attentionOf(m) > 0
    : filter === 'pr' ? has(m, 'pr')
    : filter === 'inactive' ? has(m, 'inactive') || (m.summary?.lastWorkout === null)
    : true
  const last = (m: T) => m.summary?.lastWorkout || ''
  const comparators: Record<string, (a: T, b: T) => number> = {
    name: (a, b) => String(a.member?.name || '').localeCompare(String(b.member?.name || '')),
    last: (a, b) => (last(a) < last(b) ? 1 : last(a) > last(b) ? -1 : 0),
    streak: (a, b) => (b.summary?.streak ?? -1) - (a.summary?.streak ?? -1),
    attention: (a, b) => attentionOf(b) - attentionOf(a) || (last(a) < last(b) ? -1 : last(a) > last(b) ? 1 : 0),
  }
  const by = comparators[sort] || (() => 0)
  return list.filter(m => hit(m) && keep(m)).sort((a, b) => (Number(!!a.paused) - Number(!!b.paused)) || by(a, b) || comparators.name!(a, b))
}

/** One flag as a short pill: { kind, text, tone }. */
export function flagText(f: MemberFlag, exNames?: CustomExerciseName[]) {
  switch (f.kind) {
    case 'missed': return { kind: f.kind, tone: 'warn', icon: 'calendar', text: t('Missed {0} planned', f.n) }
    case 'inactive': return { kind: f.kind, tone: 'warn', icon: 'moon', text: t('Quiet for {0} days', f.days) }
    case 'pr': {
      const one = f.n === 1 && f.ex?.[0] ? exName(f.ex[0], exNames) : null
      return { kind: f.kind, tone: 'good', icon: 'trophy', text: one ? t('PR: {0}', one) : t('{0} new PRs', f.n) }
    }
    case 'weight': return { kind: f.kind, tone: 'info', icon: 'scale', text: t('{0} kg in 2 weeks', ((f.delta ?? 0) > 0 ? '+' : '') + f.delta) }
    case 'pending': return { kind: f.kind, tone: 'info', icon: 'envelope', text: t('{0} waiting for an answer', f.n) }
    default: return { kind: f.kind, tone: 'info', icon: 'info', text: f.kind }
  }
}

export const weekdayName = (d: string | number | undefined) => t(DAYN[Number(d)] || '')

/** A change or suggestion in words: "New routine: Full body", "Weigh-in: 68.1 on 5 Nov". */
export function changeText(s: ChangeSummary | null | undefined, unit = 'kg') {
  switch (s?.kind) {
    case 'routine.put': return s.isNew ? t('New routine: {0}', s.name) : t('Routine updated: {0}', s.name)
    case 'routine.remove': return t('Routine removed: {0}', s.name)
    case 'week.set': return s.name ? t('{0}: {1}', weekdayName(s.day), s.name) : t('{0}: rest day', weekdayName(s.day))
    case 'week.add': return t('On {0}s: {1}', weekdayName(s.day), s.name)
    case 'custom.put': return s.kept ? null : t('Exercise added: {0}', s.name)
    case 'bodyweight.put': return t('Weigh-in: {0} {1} on {2}', s.w, unit, s.d)
    case 'measurement.put': return t('Check-in on {0}', s.d)
    case 'workout.add': return t('Workout logged: {0}', s.name)
    case 'workout.edit': return t('Workout corrected: {0}', s.name)
    default: return s?.kind || ''
  }
}
export const changeLines = (summary: ChangeSummary[] | null | undefined, unit?: string) => (summary || []).map(s => changeText(s, unit)).filter(Boolean)

/** What came back from an assignment, as one toast. */
export function assignResult(r: { applied?: number; suggested?: number; skipped?: number }) {
  const parts = []
  if (r.applied) parts.push(t('{0} added directly', r.applied))
  if (r.suggested) parts.push(t('{0} sent as a suggestion', r.suggested))
  if (r.skipped) parts.push(t('{0} skipped', r.skipped))
  return parts.join(', ') || t('Nothing to do.')
}

/** How an assignment will land for one member, from what they share: before anything is sent. */
export const assignOutcome = (levels: { plans?: string } | null | undefined) => (levels?.plans === 'apply' ? 'applied' : levels?.plans === 'suggest' ? 'suggested' : 'skipped')

/** Why a trainer request came back refused, in the app's words. */
export function trainerError(e: Pick<ApiError, 'data' | 'message'> | null | undefined) {
  const code = e?.data?.code
  if (code === 'not-shared') return t('They do not share that with you any more.')
  if (code === 'level') return t('They did not let you change that.')
  if (code === 'not-synced') return t('They have not synced with the server yet.')
  if (code === 'rate-limited') return t('Too many tries. Give it a few minutes.')
  if (code === 'changed-since') return t('You changed it since. Undo anyway?')
  if (code === 'expired' || code === 'not-open') return t('That one is not open any more.')
  if (code === 'no-user') return t('No account with that id.')
  if (code === 'not-free') return t('They can’t train people privately on this server, so there’s nothing to keep.')
  return e?.message || t('Something went wrong.')
}
