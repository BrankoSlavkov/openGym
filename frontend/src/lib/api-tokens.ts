// Settings → API tokens (docs/API_TOKENS.md): the profile's side of /api/tokens, plus the pure
// helpers the page renders with. The categories mirror api/tokens.js TOKEN_CATEGORIES.
import { appBase, remoteAuth } from './api.ts'
import { queryClient } from './query-client.ts'
import {
  getTokensListQueryOptions, getTokensListQueryKey, tokensCreate, tokensRevoke,
  getCalendarGetQueryOptions, getCalendarGetQueryKey, calendarSet, calendarRevoke,
} from '../generated/api.ts'
import type { GetConfig200, TokensCreateBody, TokenScopes, CalendarSetBody } from '../generated/models/index.ts'
import { t } from './i18n.js'
import { fmtDate } from './format.js'
import { categoryLabel } from './sharing-api.ts'

export const TOKEN_CATEGORIES = [
  { id: 'workouts', max: 'apply' }, { id: 'plans', max: 'apply' }, { id: 'bodyweight', max: 'apply' },
  { id: 'measurements', max: 'apply' }, { id: 'notes', max: 'view' },
] as const
export const TOKEN_DAYS = [7, 30, 90, 365, 0]

export const tokensOn = (config: GetConfig200 | null | undefined, user: unknown, demo?: boolean) => !!config?.api_tokens && !!user && !demo
export const listTokens = () => queryClient.fetchQuery(getTokensListQueryOptions())
export const createToken = async ({ name, scopes, days }: TokensCreateBody) => {
  const result = await tokensCreate({ name, scopes, days })
  await queryClient.invalidateQueries({ queryKey: getTokensListQueryKey() })
  return result
}
export const revokeToken = async (id?: string) => {
  const result = await tokensRevoke(id ? { id } : {})
  await queryClient.invalidateQueries({ queryKey: getTokensListQueryKey() })
  return result
}

/** Where the MCP endpoint is: the server's address plus /mcp (a paired phone's server, else the
 *  address this page is served at). */
export function mcpAddress(remote: ReturnType<typeof remoteAuth> = remoteAuth(), loc: Pick<Location, 'origin' | 'pathname'> | null = typeof location !== 'undefined' ? location : null) {
  const base = remote?.base || ((loc?.origin || '') + appBase(loc))
  return String(base).replace(/\/+$/, '') + '/mcp'
}

/** "Sees: Workouts, Plans & routines. May change: Plans & routines" for a token's scopes. */
export function tokenLine(scopes: TokenScopes | null | undefined) {
  const at = (lv: 'view' | 'apply') => TOKEN_CATEGORIES.filter(c => (lv === 'view' ? ['view', 'apply'].some(level => level === scopes?.[c.id]) : scopes?.[c.id] === lv)).map(c => categoryLabel(c.id)).join(', ')
  const parts = []
  const sees = at('view'), changes = at('apply')
  if (sees) parts.push(t('Sees: {0}', sees))
  if (changes) parts.push(t('May change: {0}', changes))
  return parts.join('. ') || t('Sees nothing right now')
}

/** When a token stops working, in words. */
export const endsLabel = (exp: number | null | undefined, now = Date.now()) => {
  if (!exp) return t('When you revoke it')
  const d = new Date(exp)
  const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  return fmtDate(iso, false, d.getFullYear() !== new Date(now).getFullYear())
}

// The calendar feed (api/integrations/calendar.js, docs/CALENDAR.md): a private ICS address of the
// plan, made of a token of its own kind. Settings → Integrations → Calendar feed.
export const getCalendar = () => queryClient.fetchQuery(getCalendarGetQueryOptions())
export const setCalendar = async ({ done, renew = false }: CalendarSetBody) => {
  const result = await calendarSet({ done: !!done, ...(renew ? { renew: true } : {}) })
  await queryClient.invalidateQueries({ queryKey: getCalendarGetQueryKey() })
  return result
}
export const stopCalendar = async () => {
  const result = await calendarRevoke()
  await queryClient.invalidateQueries({ queryKey: getCalendarGetQueryKey() })
  return result
}
/** The address a calendar app opens straight away: the same feed as webcal://. */
export const webcalUrl = (url: string | null | undefined) => String(url || '').replace(/^https?:\/\//, 'webcal://')
