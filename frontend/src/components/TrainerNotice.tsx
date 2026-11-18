// Home's one line about a trainer or gym: the newest thing waiting in Trainer & gym (a note, a
// suggestion, a new connection, a changed sharing), one tap away. A trainer gets a line to their
// dashboard when someone wants to connect. Nothing at all without TRAINERS on and a session.
import type { CSSProperties } from 'react'
import type { SharingInbox200 } from '../generated/models/sharingInbox200.ts'
import { useEffect, useState } from 'react'
import { useNavigate } from '../router/hooks.tsx'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { getInbox, getOverview, showsDashboard, trainerRoles } from '../lib/trainer-api.ts'
import { noticeText } from '../lib/trainer-notice-text.ts'
import Icon from './Icon.tsx'

type Notice = {
  from?: { name?: string } | null
  kind?: string | null
  names?: string[] | null
  notice?: string | null
  status: string
  seen?: boolean | null
}
function isNotice(value: unknown): value is Notice {
  if (value === null || typeof value !== 'object') return false
  const { from, kind, names, notice, status, seen } = value as Record<string, unknown>
  return (
    typeof status === 'string' &&
    (from == null || (typeof from === 'object' && (!('name' in from) || typeof from.name === 'string'))) &&
    (kind == null || typeof kind === 'string') &&
    (names == null || (Array.isArray(names) && names.every((name) => typeof name === 'string'))) &&
    (notice == null || typeof notice === 'string') &&
    (seen == null || typeof seen === 'boolean')
  )
}

function lineFor(i: Notice) {
  const who = i.from?.name || ''
  if (i.kind === 'suggest') return t('{0} has an idea for you', who)
  if (i.kind === 'comment') return t('{0} left you a note', who)
  if (i.kind === 'offer') return t('{0} left {1}', i.names?.[0] || who, i.names?.[1] || '')
  return noticeText(i.notice, i.names || []).title
}

export default function TrainerNotice() {
  const config = useStore((s) => s.config)
  const user = useStore((s) => s.user)
  const nav = useNavigate()
  const on = !!config?.trainers?.on && !!user
  const [box, setBox] = useState<SharingInbox200 | null>(null)
  const [reqs, setReqs] = useState(0)
  useEffect(() => {
    if (!on) return
    let live = true
    getInbox()
      .then((r) => {
        if (live) setBox(r)
      })
      .catch(() => {})
    if (trainerRoles(config).trainer)
      getOverview()
        .then((r) => {
          if (live) setReqs(Array.isArray(r.requests) ? r.requests.length : 0)
        })
        .catch(() => {})
    return () => {
      live = false
    }
  }, [on])
  if (!on) return null
  const fresh = (Array.isArray(box?.items) ? box.items : [])
    .filter(isNotice)
    .filter((i) => i.status === 'open' && !i.seen)
  if (!fresh.length && !(reqs && showsDashboard(config))) return null
  const go = fresh.length ? () => nav('/settings/trainer') : () => nav('/trainer')
  const text = fresh.length
    ? lineFor(fresh[0]!) + (fresh.length > 1 ? ' ' + t('and {0} more', fresh.length - 1) : '')
    : t('{0} want to connect with you', reqs)
  return (
    <button className="tr-notice" onClick={go}>
      <span
        className="tr-inbox-i"
        style={{ '--tint': fresh.length ? 'var(--indigo)' : 'var(--orange)' } as CSSProperties}
      >
        <Icon name={fresh.length ? 'bell' : 'personCircle'} />
      </span>
      <span className="tr-notice-t">{text}</span>
      <Icon name="chevronRight" className="tr-row-c" />
    </button>
  )
}
