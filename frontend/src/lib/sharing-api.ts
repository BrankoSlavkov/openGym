// Trainer & gym sharing (docs/TRAINERS.md): the member's side of /api/sharing, plus the pure
// helpers the Settings page renders with. Only signed-in profiles on a server with TRAINERS on
// ever reach this (config.trainers), so nothing here runs for guests or phones on their own.
import { queryClient } from './query-client.ts'
import {
  getSharingOverviewQueryOptions, getSharingOverviewQueryKey, getSharingLogQueryKey,
  getSharingLogQueryOptions, getSharingExportQueryOptions, sharingCode,
  sharingConnect, sharingDecline, sharingDisconnect, sharingLeave, sharingUpdate,
} from '../generated/api.ts'
import type { GetConfig200, SharingConnectBody, SharingUpdateBody } from '../generated/models/index.ts'
import type { ApiError } from './api.ts'
import { t } from './i18n.js'
import { CATEGORIES, LEVELS, rank } from './sharing-scopes.ts'

async function changed<T>(request: Promise<T>): Promise<T> {
  const result = await request
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getSharingOverviewQueryKey() }),
    queryClient.invalidateQueries({ queryKey: getSharingLogQueryKey() }),
  ])
  return result
}

export const sharingOn = (config: GetConfig200 | null | undefined) => !!config?.trainers?.on
export const getSharing = () => queryClient.fetchQuery(getSharingOverviewQueryOptions())
export const checkCode = (code: string) => sharingCode({ code })
export const connectTrainer = ({ code, scopes, leadScopes, consent, lang }: SharingConnectBody & {
  consent: NonNullable<SharingConnectBody['consent']>
}) => changed(sharingConnect({ code, scopes, leadScopes, consent: { v: consent.v, hash: consent.hash }, lang }))
export const declineCode = (code: string) => changed(sharingDecline({ code }))
export const updateGrant = ({ id, scopes, consent, lang }: SharingUpdateBody & {
  consent: NonNullable<SharingUpdateBody['consent']>
}) => changed(sharingUpdate({ id, scopes, consent: { v: consent.v, hash: consent.hash }, lang }))
export const disconnectGrant = (id: string) => changed(sharingDisconnect({ id }))
export const leaveGym = (gymId: string) => changed(sharingLeave({ gymId }))
export const sharingLog = (before?: number | null) => queryClient.fetchQuery(getSharingLogQueryOptions({ limit: 50, ...(before ? { before } : {}) }))
export const sharingExport = () => queryClient.fetchQuery(getSharingExportQueryOptions())

// The words for each category and level. Keys are English source strings, like every t().
export const categoryLabel = (id: string): string => {
  const labels: Record<string, string> = {
  metrics: t('Key numbers'), workouts: t('Workouts'), plans: t('Plans & routines'), bodyweight: t('Body weight'),
  measurements: t('Body measurements'), photos: t('Progress photos'), notes: t('Notes'), nutrition: t('Nutrition'),
}
  return labels[id] || id
}
export const levelLabel = (level: string): string => {
  const labels: Record<string, string> = { off: t('Off'), view: t('See'), suggest: t('Suggest'), apply: t('Change directly') }
  return labels[level] || level
}

/** The levels one category can be set to, never past `cap` (the gym lead row: view). */
export function levelsFor(catId: string, cap = 'apply') {
  const max = CATEGORIES.find(c => c.id === catId)?.max || 'view'
  return LEVELS.filter(lv => rank(lv) <= Math.min(rank(max), rank(cap)))
}

/** "Workouts, Body weight": the categories at exactly `level` or (with `atLeast`) above it. */
export function summarize(scopes: Record<string, string> | null | undefined, level: string, atLeast = false) {
  return CATEGORIES.filter(c => atLeast ? rank(scopes?.[c.id]) >= rank(level) : scopes?.[c.id] === level).map(c => categoryLabel(c.id)).join(', ')
}

// The canonical consent text of api/consent.js as a t() key, so it can be shown translated. When
// the server's text is a newer one than this copy knows, the page shows the server's own words.
export const TRAINER_CONSENT = 'You are letting this trainer see the categories marked here, and change the ones marked suggest or apply. If the trainer works for a gym, its gym lead sees the categories in the gym lead row, never more than view. You can change this or disconnect any time, and it stops working the moment you do. Every look and every change is written to your sharing log, which only you can read.'
export const consentWords = (consent: { text?: string } | null | undefined) => (consent?.text === TRAINER_CONSENT ? t(TRAINER_CONSENT) : consent?.text || '')

/** One line of the sharing log as a sentence. A deleted trainer reads as "A former trainer". */
type LogPerson = { name?: string; kind?: string }
export type SharingLogEntry = { ev?: string; actor?: LogPerson; peer?: LogPerson; cat?: string }
export function logLine(e: SharingLogEntry | null | undefined): string {
  const who = (p: LogPerson | undefined) => (p?.name ? p.name : p?.kind === 'gym' ? t('a gym') : t('A former trainer'))
  switch (e?.ev) {
    case 'grant.create': return t('You connected {0}', who(e.peer))
    case 'grant.accept': return t('{0} said yes', who(e.actor))
    case 'grant.decline': return t('{0} said no', who(e.actor))
    case 'grant.update': return t('You changed what you share')
    case 'grant.end': return e.actor?.kind === 'self' ? t('You ended the connection with {0}', who(e.peer)) : t('{0} ended the connection', who(e.actor))
    case 'gym.lead': return t('You joined {0}', who(e.peer))
    case 'gym.leave': return t('You left {0}', who(e.peer))
    case 'invite.decline': return t('You said not now to {0}', who(e.peer))
    case 'access': return t('{0} looked at {1}', who(e.actor), categoryLabel(e.cat || ''))
    case 'data.admin-view': return t('An admin opened your training data')
    case 'gym.join': return t('You joined {0}', who(e.peer))
    case 'grant.private': return t('You kept {0} as a private trainer', who(e.peer))
    case 'trainer.left-gym': return t('{0} left {1}', who(e.actor), who(e.peer))
    case 'trainer.change': return t('{0} changed your training', who(e.actor))
    case 'trainer.undo': return t('You undid a change by {0}', who(e.peer))
    case 'trainer.comment': return t('{0} commented on a workout', who(e.actor))
    case 'suggest.new': return t('{0} sent you a suggestion', who(e.actor))
    case 'suggest.accept': return t('You took a suggestion from {0}', who(e.peer))
    case 'suggest.decline': return t('You turned down a suggestion from {0}', who(e.peer))
    // Scoped tokens (Settings → API tokens): a look reads like anyone's ("Claude looked at Workouts").
    case 'token.create': return t('You made the token {0}', who(e.peer))
    case 'token.end': return t('The token {0} was revoked', who(e.peer))
    case 'token.write': return t('The token {0} changed {1}', who(e.actor), categoryLabel(e.cat || ''))
    default: return e?.ev || ''
  }
}

/** Why a request came back refused, in the app's words. */
export function sharingError(e: Pick<ApiError, 'data' | 'message'> | null | undefined) {
  const code = e?.data?.code
  if (code === 'code-invalid') return t('That code is wrong, used up or expired.')
  if (code === 'code-paused' || code === 'rate-limited') return t('Too many tries. Give it a few minutes.')
  if (code === 'self') return t('That is your own code.')
  if (code === 'already-connected') return t('You are already connected to this trainer.')
  if (code === 'nothing-shared') return t('Share at least one thing, or tap Not now.')
  return e?.message || t('Something went wrong.')
}
