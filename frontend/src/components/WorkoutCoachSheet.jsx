// "Ask the Coach" on an exercise in the middle of a workout (the `adapt` job): say what is going
// on (it hurts, the rack is taken, short on time, feeling great, running on empty), and the Coach
// suggests a few changes to what is left of the session, as cards you tick. Nothing changes until
// you apply them; logged sets and the routine are never touched (lib/coach-adapt.js).
//
// It goes through the same door as every Coach job (lib/coach-api.ts): the data-sharing question
// first, the same polling, the same failures in the app's voice.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, tn } from '../lib/i18n.js'
import { fmtRest } from '../lib/duration.js'
import { exTitle, appendLog } from '../lib/coach.js'
import { useCoachStatus, requestAdapt, resolvePending, jobErrorText, isDeclined } from '../lib/coach-api.ts'
import { adaptFor, markAdaptStale, applyAdapt, adaptLogEntry } from '../lib/coach-adapt.js'
import Icon from './Icon.tsx'
import { Button, Check, TextField } from './ui.tsx'
import * as stylex from '@stylexjs/stylex'
import { sx } from '../lib/sx.ts'
import { bubble, pcard } from '../coach.styles.ts'

// "Ask the Coach" mid-workout (was in coach.css); the card and bubble are ../coach.styles.ts.
const w = stylex.create({
  sheet: { padding: '4px 16px 16px' },
  eyebrow: { display: 'flex', alignItems: 'center', gap: 6 },
  reasons: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  reason: { display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'none' },
  text: { width: '100%', marginBottom: 8 },
  wait: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '8px 0' },
  ended: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 },
})


export const ADAPT_REASONS = ['pain', 'busy', 'short', 'great', 'tired', 'other']
const REASON = {
  pain: () => ['warning', t('It hurts')],
  busy: () => ['clock', t('Machine’s taken')],
  short: () => ['timer', t('Short on time')],
  great: () => ['bolt', t('Feeling great')],
  tired: () => ['moon', t('Running on empty')],
  other: () => ['chat', t('Something else')],
}

/** One change as a line a tired person reads between sets. */
export function adaptTitle(c) {
  const ex = c.exId ? exTitle(c.exId) : ''
  switch (c.type) {
    case 'swap': return t('Swap {0} for {1}', ex, exTitle(c.to))
    case 'sets': return c.sets === 0 ? t('{0}: no more sets today', ex) : t('{0}: {1} sets left instead of {2}', ex, c.sets, c.before ?? '?')
    case 'reps': return t('{0}: {1} reps a set', ex, c.reps)
    case 'weight': return t('{0}: weight {1}', ex, (c.pct > 0 ? '+' : '−') + Math.abs(c.pct) + '%')
    case 'add': return t('Add {0}', exTitle(c.to)) + ' · ' + (c.sec ? t('{0} × {1} s', c.sets, c.sec) : t('{0} × {1}', c.sets, c.reps))
    case 'skip': return t('Skip the rest of {0}', ex)
    case 'move': return c.place === 'next' ? t('Do {0} next', ex) : t('Do {0} last', ex)
    case 'rest': return c.rest > 0 ? t('{0}: rest {1}', ex, fmtRest(c.rest)) : t('{0}: no rest timer', ex)
    default: return c.type
  }
}

/** The proposal as tickable cards: in the sheet during the workout, and in the Coach's chat. */
export function AdaptProposal({ p, onDone }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const live = adaptFor(S, p)
  const marked = useMemo(() => markAdaptStale(S, p), [S, p])
  const [accepted, setAccepted] = useState(() => new Set(marked.filter(c => !c.stale).map(c => c.id)))
  const toggle = id => setAccepted(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const ids = [...accepted].filter(id => marked.some(c => c.id === id && !c.stale))

  const finish = () => { try { onDone?.() } catch { /* the sheet may be gone */ } }
  const apply = () => {
    if (!ids.length) { dismiss(); return }
    const ui = useUI.getState()
    ui.stopWork?.()
    // A running rest belongs to an exercise (timer.forIdx); a skip or a move shifts the indexes.
    const rest = ui.timer
    const owner = rest?.forIdx != null ? S.active?.entries?.[rest.forIdx]?.id : null
    let applied = []
    update(s => {
      applied = applyAdapt(s, p, ids).applied
      if (applied.length) appendLog(s, adaptLogEntry(p, applied))
    })
    if (owner) {
      const at = (useStore.getState().S.active?.entries || []).findIndex(e => e.id === owner)
      if (at >= 0 && useUI.getState().timer) useUI.setState({ timer: { ...useUI.getState().timer, forIdx: at } })
    }
    resolvePending({ accepted: applied, rejected: marked.filter(c => !applied.includes(c.id)).map(c => c.id) }).catch(() => {})
    toast(applied.length ? tn('{0} change made to this workout', '{0} changes made to this workout', applied.length) : t('Nothing could be applied any more.'))
    finish()
  }
  const dismiss = () => {
    update(s => { appendLog(s, adaptLogEntry(p, [], { dismissed: true })) })
    resolvePending({ dismissed: true }).catch(() => {})
    finish()
  }

  return <div {...sx(null, pcard.card)}>
    <div {...sx(null, pcard.hd)}>
      <div {...sx(null, pcard.eyebrow)}>{t('For this workout')}</div>
      <h2 {...sx(null, pcard.h)}>{tn('{0} suggestion', '{0} suggestions', marked.length)}</h2>
      {!!p.summary && <p {...sx(null, pcard.sum)}>{p.summary}</p>}
      {!live && <p {...sx(null, pcard.sum)} style={{ fontSize: 'var(--fs-footnote)', color: 'var(--gold-ink)' }}>{t('That workout is over, so these can’t be applied any more.')}</p>}
    </div>
    {marked.map(c => <div key={c.id} {...sx('pcard-chg', pcard.chg, c.stale && pcard.chgStale)}>
      <div {...sx(null, pcard.chgBody)}>
        <div {...sx(null, pcard.chgTitle)}>{adaptTitle(c)}</div>
        <div {...sx(null, pcard.chgWhy)}>{c.why}</div>
        {c.stale && live && <div {...sx(null, pcard.chgStaleNote)}>{t('Your workout moved on, so this one no longer fits.')}</div>}
      </div>
      {!c.stale && <Check checked={accepted.has(c.id)} onChange={() => toggle(c.id)} label={adaptTitle(c)} />}
    </div>)}
    <div {...sx(null, pcard.note)}>{t('Logged sets and your routine stay as they are. The Coach is not a doctor or a physiotherapist. If something hurts, ask a professional.')}</div>
    <div {...sx(null, pcard.ft)}>
      {live && <Button {...sx(null, pcard.ftBtn)} variant="primary" icon="check" onClick={apply} disabled={!ids.length}>
        {ids.length ? tn('Apply {0} change', 'Apply {0} changes', ids.length) : t('Apply nothing')}
      </Button>}
      <Button {...sx(null, pcard.ftBtn)} onClick={dismiss}>{live ? t('Not now') : t('Dismiss')}</Button>
    </div>
  </div>
}

/** The sheet: the question, the wait, the answer. */
export default function WorkoutCoachSheet({ entryIdx, reason: startReason = null, close }) {
  const S = useStore(s => s.S)
  const entry = S.active?.entries?.[entryIdx]
  const { job, pending, last, lastError, refresh } = useCoachStatus(true)
  const [reason, setReason] = useState(ADAPT_REASONS.includes(startReason) ? startReason : null)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(null)        // the job this sheet started
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const mine = pending?.kind === 'adapt' && adaptFor(S, pending) ? pending : null

  // The sheet started a job and it ended without a proposal: say what came back.
  const ended = sent && !job && !mine && last?.id && last.id === sent
  useEffect(() => { if (sent && !job) refresh() }, [sent, !!job])

  const send = async () => {
    if (!reason || busy) return
    setBusy(true); setError(null)
    try {
      const r = await requestAdapt({ entry: entryIdx, reason, text })
      setSent(r?.job?.id || 'started')
      refresh()
    } catch (e) {
      if (!isDeclined(e)) setError(e?.data?.code ? jobErrorText(e.data.code) : (e?.message || t('Something went wrong on the server.')))
    } finally { setBusy(false) }
  }

  if (mine) return <div {...sx(null, w.sheet)}><AdaptProposal p={mine} onDone={close} /></div>
  const name = entry ? exTitle(entry.id) : ''
  return <div {...sx(null, w.sheet)}>
    <div {...sx(null, pcard.eyebrow, w.eyebrow)}><Icon name="sparkles" /> {t('Ask the Coach')}</div>
    <h2 {...sx(null, pcard.h)} style={{ margin: '4px 0 12px' }}>{name}</h2>
    {job || (sent && !ended)
      ? <div {...sx(null, w.wait)} role="status">
        <div {...sx('typing', bubble.bub, bubble.coach, bubble.typing)}><i {...sx(null, bubble.typingDot)} /><i {...sx(null, bubble.typingDot, bubble.typingDot2)} /><i {...sx(null, bubble.typingDot, bubble.typingDot3)} /></div>
        <p className="small dim">{t('Looking at your workout…')} {t('You can keep training, the answer waits here and in the Coach.')}</p>
      </div>
      : ended
        ? <div {...sx(null, w.ended)}>
          <p {...sx(null, pcard.sum)}>{last.outcome === 'nochange'
            ? (last.reading || t('Nothing to change. Carry on as planned.'))
            : jobErrorText(last.errorClass, lastError?.detail)}</p>
          <Button onClick={close}>{t('Done')}</Button>
        </div>
        : <>
          <p className="small dim" style={{ marginBottom: 10 }}>{t('What’s up? The Coach suggests a few changes to what is left of this workout. Logged sets stay as they are.')}</p>
          <div {...sx('adapt-reasons', w.reasons)}>
            {ADAPT_REASONS.map(k => {
              const [icon, label] = REASON[k]()
              return <button key={k} type="button" {...sx(['chip', reason === k && 'on'], w.reason)} aria-pressed={reason === k} onClick={() => setReason(k)}>
                <Icon name={icon} /> {label}
              </button>
            })}
          </div>
          <TextField {...sx(null, w.text)} value={text} maxLength={400} placeholder={reason === 'pain' ? t('Where, and what movement hurts? (optional)') : t('Anything else? (optional)')}
            onChange={e => setText(e.target.value)} />
          {error && <p className="small" style={{ color: 'var(--red)' }}>{error}</p>}
          <div {...sx(null, pcard.ft)} style={{ paddingInline: 0 }}>
            <Button {...sx(null, pcard.ftBtn)} variant="primary" icon="sparkles" onClick={send} disabled={!reason || busy}>{t('Ask the Coach')}</Button>
            <Button {...sx(null, pcard.ftBtn)} onClick={close}>{t('Cancel')}</Button>
          </div>
        </>}
  </div>
}

/** Opens the sheet for the exercise at `entryIdx` of the running session, `reason` picked already
 *  when it is known (the swap picker's "Ask the Coach for a swap" opens on "Machine's taken"). */
export function workoutCoachSheet(entryIdx, reason = null) {
  useUI.getState().openSheet(close => <WorkoutCoachSheet entryIdx={entryIdx} reason={reason} close={close} />)
}
