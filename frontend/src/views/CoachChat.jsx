// The conversation with the Coach.
//
// Everything the Coach does happens here: your answers as the opening message, a typing
// bubble while a job runs (with how long it usually takes), the plan or the suggestions as a
// card you page through, a composer to say what to change, and one button that imports the
// result. History stays in the thread — come back any time, ask for a review, refine again.
//
// The thread is `S.coach.chat` (small, synced) plus whatever is live right now from the
// status poll: a running job or a pending proposal. Nothing about the proposal is copied into
// the chat until a decision is made about it, so two devices can never disagree on what is
// pending. Once decided, the chat line carries a `ref` into `S.coach.log`, where the whole
// proposal — every change, accepted or not, the notes, the evidence — is kept, so saying yes
// or no never makes it disappear. Turning the Coach off is the admin's decision, not a control
// on this screen.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '../router/hooks.tsx'
import { closeThenNav } from '../lib/nav.ts'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, tn } from '../lib/i18n.js'
import { fmtDate, fmtNum, fmtChatTimestamp, DAYS, weekOrder, weekStartOf, isoOf } from '../lib/format.js'
import { exLine } from '../lib/history.js'
import { speedUnitOf } from '../lib/speed.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import { scheduleModeOf } from '../lib/rotation.js'
import ChatInput from '../components/ChatInput.tsx'
import {
  coachAvailable, hasConsent, emptyCoach, appendChat, recordTiming, estimateMs, profileLines,
  markStale, applicable, applyChangeSet, applyCreatedPlan, recordDismissal, recordDebrief, logEntry,
  changeTitle, changeValues, changeMeaning, exName, canRevert, revertLast
} from '../lib/coach.js'
import { AdaptProposal, adaptTitle } from '../components/WorkoutCoachSheet.jsx'
import { insightsFor, sessionInsights } from '../lib/coach-insights.js'
import { useCoachStatus, requestReview, requestDebrief, requestPlan, refinePlan, askCoach, resolvePending, cohortStats, setCohortShare, jobErrorText, awaitedJob, settleAwaited, JOB_ERRORS, ensureAiConsent, isDeclined } from '../lib/coach-api.ts'
import { AiConsentSection } from '../components/CoachConsentSheet.jsx'
import { ActionCards, Sources } from '../components/CoachActions.jsx'
import { CoachSeesSection } from '../components/CoachSees.jsx'
import { useCoachGate } from '../lib/use-coach-gate.js'
import { confirmSheet } from '../sheets.jsx'
import { EXIDX, isCustomEx } from '../lib/exercises.js'
// The Coach names exercises in English, title-cased by its CSS: your own keep the casing you typed.
const typed = id => (isCustomEx(EXIDX[id]) ? ' nocap' : '')
import { activeProfile } from '../lib/equipment.js'
import { NotHereButton } from '../components/MachinePicker.jsx'
import Icon from '../components/Icon.tsx'
import { glyphOf } from '../lib/glyphs.js'
import LineChart from '../components/LineChart.jsx'
import { Button, Check, Switch, Section, Row, SelectRow } from '../components/ui.tsx'
import { isoRun } from '../lib/bidi.js'
import { sx } from '../lib/sx.ts'
import { bubble, pcard, recapState } from '../coach.styles.ts'
import { styles as cc } from './CoachChat.styles.ts'

export default function CoachChat() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const coachLocal = useStore(s => s.coachLocal)
  const update = useStore(s => s.update)
  const storeReady = useStore(s => s.ready)
  const toast = useUI(s => s.toast)
  const openSheet = useUI(s => s.openSheet)
  // Before the status poll: it only runs where there is a Coach to ask (see useCoachStatus).
  const gate = useCoachGate()
  const { job, pending, cap, loading, lastError, last, refresh, maxMessageLen } = useCoachStatus(gate.ok)
  const [text, setText] = useState('')
  // The message box opened into a tall editor (components/ChatInput.tsx); closed again on send.
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const prevJob = useRef(null)
  const coachMode = coachLocal?.mode

  const ok = gate.ok
  const ready = ok && hasConsent(S) && !!S.coach?.profile
  // Not before the store has loaded: a cold start straight on #/coach would otherwise read an
  // empty state, decide there is no consent, and bounce a consenting user into the intake. Nor
  // before the server said for this session whether it has a Coach (lib/use-coach-gate.js).
  useEffect(() => {
    if (!storeReady || !gate.known) return
    if (!ok) nav('/home', { replace: true })
    else if (!ready) nav('/coach/intake', { replace: true })
  }, [storeReady, gate.known, ok, ready])

  // A job that ends is either a proposal, "nothing to change", or a failure. The server tells
  // the client none of that directly — the job simply stops appearing — so the transition is
  // read here, once, and written into the thread as the Coach's reply. Two ways to see it end:
  // the job was seen running and is now gone, or the run this app started (its id came back
  // from the start request) is already the server's last outcome — a provider that refuses the
  // connection fails the run before the first status poll, and it is never seen running at all.
  useEffect(() => {
    if (loading) return
    const was = prevJob.current
    prevJob.current = job
    if (job) return
    const mine = awaitedJob()
    const endedUnseen = !was && !!mine && last?.id === mine
    if (!was && !endedUnseen) return
    settleAwaited(was ? was.id : mine)
    const ms = was?.startedAt ? Date.now() - was.startedAt : 0
    update(s => {
      // A run that ended unseen has no duration worth learning from.
      if (was) recordTiming(s, ms)
      // A proposal already applied or discarded was settled on another device (#779): its reply is
      // in that device's thread, which syncs here. "Nothing I would change" would be wrong.
      const settled = last?.outcome === 'applied' || last?.outcome === 'dismissed' || last?.outcome === 'ready'
      if (!pending && !settled) {
        const cls = lastError?.errorClass || (last?.outcome === 'failed' ? (last.errorClass || 'internal') : null)
        appendChat(s, cls
          // The server's own line for the class rides along on `last` (api/coach/jobs.js): a
          // failure it sorts by cause says which cause, even in a build that has no translated
          // line for that class yet.
          ? { role: 'coach', kind: 'error', text: jobErrorText(cls, lastError?.detail, last?.message) }
          : { role: 'coach', kind: 'nochange', text: last?.reading
            ? last.reading
            : t('I looked through everything and there is nothing I would change right now. Keep it up, and ask me again after a few more sessions.') })
      }
    })
  }, [job, pending, loading, last?.id])

  // An answer to a question (an `ask` job) has nothing to decide: it goes into the thread as the
  // Coach's reply, once — `pid` names the job it answers, so a second render or a poll that still
  // shows it pending cannot write it twice — and the server is told it was read.
  useEffect(() => {
    if (!pending || pending.kind !== 'ask' || job) return
    update(s => {
      if ((s.coach?.chat || []).some(m => m.pid === pending.id)) return
      // What it offered to do and the pages it read ride on the line (components/CoachActions.jsx).
      appendChat(s, {
        role: 'coach', kind: 'text', text: String(pending.answer || ''), pid: pending.id,
        ...(Array.isArray(pending.actions) && pending.actions.length ? { actions: pending.actions.slice(0, 6) } : {}),
        ...(Array.isArray(pending.sources) && pending.sources.length ? { sources: pending.sources.slice(0, 8) } : {})
      })
    })
    resolvePending({ accepted: ['ask'] }).catch(() => {}).finally(() => refresh())
  }, [pending?.id, !!job])

  useEffect(() => { if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ block: 'end' }) }, [S.coach?.chat?.length, !!job, !!pending])

  if (!ready) return null
  const coach = S.coach || emptyCoach()
  const community = !!config?.coach?.community && !DEMO && !(MOBILE && coachMode === 'byok')

  const send = async () => {
    const msg = text.trim()
    if (!msg || busy) return
    setBusy(true)
    try {
      // A message about a proposed plan refines it. With no plan at all — the first attempt
      // failed, or nothing was ever built — the message asks for one; a review would only
      // answer that there is no workout to look at, which is how people got stuck. Anything else
      // is a question, answered in words (`ask`): "how long should I rest?" is not a request to
      // review the whole plan. A review is the chip and the menu's, as it always was.
      if (pending?.kind === 'create' || !(S.routines || []).length) await refinePlan(msg)
      else await askCoach(msg)
      update(s => appendChat(s, { role: 'user', kind: 'text', text: msg }))
      setText('')
      setExpanded(false)
      refresh()
    } catch (e) {
      // A server that refuses the job says so in English, with its class beside it: the class
      // picks the translated line. One with no line here ('shared') keeps the server's words.
      // "Not now" on the data-sharing question is an answer, not a failure: the text stays put.
      if (!isDeclined(e)) toast(JOB_ERRORS[e.data?.code] || e.message || t('Could not ask the Coach'))
    }
    setBusy(false)
  }

  const ask = async (fn, line) => {
    setBusy(true)
    try {
      await fn()
      update(s => appendChat(s, { role: 'user', kind: 'text', text: line }))
      refresh()
    } catch (e) { if (!isDeclined(e)) toast(JOB_ERRORS[e.data?.code] || e.message || t('Could not ask the Coach')) }
    setBusy(false)
  }
  const askReview = () => ask(() => requestReview(''), t('Have a look at my training and tell me what you would change.'))
  const lastWorkout = (S.workouts || []).filter(w => w && w.d).at(-1) || null
  const askDebrief = () => ask(() => requestDebrief(lastWorkout?.id || null), lastWorkout?.name
    ? t('How did my {0} session go?', lastWorkout.name)
    : t('How did my last workout go?'))
  const askNewPlan = () => ask(() => requestPlan(coach.profile), t('Build me a fresh plan from my answers.'))
  const askImprove = r => ask(
    () => requestReview(t('Focus only on my routine “{0}”. Improve it: exercise choice, order, sets and reps, rep ranges, progression. Leave the other routines alone.', r.name)),
    t('Improve my routine “{0}”.', r.name))

  const pickRoutine = () => openSheet(close => <div {...sx(null, cc.menu)}>
    <h3>{t('Improve which routine?')}</h3>
    <div className="sect-b">
      {(S.routines || []).map(r => <Row key={r.id} icon={glyphOf(r.emoji)} iconTint="var(--acc)" title={r.name} subtitle={tn('{0} exercise', '{0} exercises', (r.ex || []).length)} accessory="chevron" onClick={() => { close(); askImprove(r) }} />)}
      {!(S.routines || []).length && <div {...sx(null, cc.empty)}>{t('You don’t have any routines yet. Ask the Coach for a plan first.')}</div>}
    </div>
    <div style={{ height: 10 }} />
  </div>)

  const showHistory = () => openSheet(close => <HistorySheet S={S} close={close} openSheet={openSheet} />)
  const showCohort = () => openSheet(() => <CohortSheet S={S} update={update} toast={toast} />)

  const idle = !job && !pending
  const menu = () => openSheet(close => <div {...sx(null, cc.menu)}>
    <h3>{t('Coach')}</h3>
    <div className="sect-b">
      {idle && <Row icon="sparkles" iconTint="var(--acc)" title={t('Ask for a review')} subtitle={t('What would the Coach change after your last sessions?')} accessory="chevron" onClick={() => { close(); askReview() }} />}
      {idle && !!lastWorkout && <Row icon="checkCircle" iconTint="var(--green)" title={t('Review my last workout')} subtitle={t('What went well, what to watch, what to do next time')} accessory="chevron" onClick={() => { close(); askDebrief() }} />}
      {idle && !!(S.routines || []).length && <Row icon="wrench" iconTint="var(--orange)" title={t('Improve a routine')} subtitle={t('Pick one; the Coach works on just that')} accessory="chevron" onClick={() => { close(); pickRoutine() }} />}
      {community && <Row icon="person" iconTint="var(--teal)" title={t('Compare with others here')} subtitle={t('Anonymous medians from this instance')} accessory="chevron" onClick={() => { close(); showCohort() }} />}
      <Row icon="history" iconTint="var(--blue)" title={t('Everything the Coach proposed')} subtitle={t('Plans, suggestions and debriefs, kept')} accessory="chevron" onClick={() => { close(); showHistory() }} />
      {idle && <Row icon="clipboard" iconTint="var(--indigo)" title={t('Start a new plan')} subtitle={t('A fresh plan from your answers; your workouts stay')} accessory="chevron" onClick={() => { close(); askNewPlan() }} />}
      <Row icon="pencil" iconTint="var(--indigo)" title={t('Edit my answers')} subtitle={t('Goal, days, equipment, limits')} accessory="chevron" onClick={() => closeThenNav(close, '/coach/intake?edit=1')} />
      <Row icon="clock" iconTint="var(--purple)" title={t('Automatic reviews')} subtitle={cadenceLabel(coach)} accessory="chevron" onClick={() => { close(); cadenceSheet(openSheet, update) }} />
      <Row icon="list" iconTint="var(--teal)" title={t('What the Coach sees')} subtitle={t('Choose what it may read, and whether it may search the web')} accessory="chevron" onClick={() => { close(); openSheet(() => <div {...sx(null, cc.menu)}><CoachSeesSection /></div>) }} />
      {!DEMO && <Row icon="shield" iconTint="var(--green)" title={t('AI data sharing')} subtitle={t('Who may see your training')} accessory="chevron" onClick={() => { close(); openSheet(() => <div {...sx(null, cc.menu)}><AiConsentSection /></div>) }} />}
      {canRevert(S) && <Row icon="reset" iconTint="var(--blue)" title={t('Undo the last Coach changes')} accessory="chevron" onClick={() => { close(); doRevert() }} />}
    </div>
    <div style={{ height: 10 }} />
  </div>)

  const doRevert = () => confirmSheet({
    title: t('Undo the last Coach changes?'),
    message: t('Your plan goes back to how it was before you accepted them. Workouts you have logged since are untouched.'),
    confirmText: t('Undo'),
    onConfirm: () => {
      let ok = false
      update(s => { ok = revertLast(s); if (ok) appendChat(s, { role: 'coach', kind: 'reverted', text: t('Done! Your plan is back to how it was before my last changes.') }) })
      toast(ok ? t('Plan restored') : t('Nothing to undo'))
    }
  })

  const status = job || pending?.kind === 'ask' ? t('thinking…') : pending ? t('has a suggestion for you') : t('here when you need it')
  const placeholder = pending?.kind === 'create'
    ? t('What should change?')
    : job ? t('Coach is thinking…') : t('Message the Coach…')

  return <div {...sx('narrow chat', cc.chat)}>
    <div {...sx(null, cc.hdr)}>
      <button className="iconbtn" data-back="/plan" onClick={() => nav('/plan')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div {...sx(null, cc.avatar)}><Icon name="sparkles" /></div>
      <div {...sx(null, cc.hdrText)}>
        <h1 {...sx(null, cc.title)}>{t('Coach')}</h1>
        <div {...sx(null, cc.status, job && cc.statusLive)}>{status}</div>
      </div>
      <button className="iconbtn" onClick={menu} aria-label={t('More')}><Icon name="more" /></button>
    </div>

    <div {...sx(null, cc.msgs)}>
      <Bubble role="coach">{t('Hi, I’m your Coach. I build your plan from your answers and adjust it from what you actually log. Nothing changes until you say so.')}</Bubble>

      {(coach.chat || []).map(m => <Message key={m.id} m={m} S={S} profile={coach.profile} openSheet={openSheet} />)}

      {job && <Typing S={S} kind={job.kind} coachLocal={coachLocal} config={config} />}

      {pending && !job && pending.kind === 'adapt' && <div {...sx(null, cc.msg, cc.msgCoach)} style={{ maxWidth: '100%', width: '100%' }}>
        <AdaptProposal p={pending} onDone={refresh} />
      </div>}
      {pending && !job && pending.kind !== 'ask' && pending.kind !== 'adapt' && (pending.kind === 'create'
        ? <PlanCard p={pending} S={S} update={update} toast={toast} nav={nav} refresh={refresh} />
        : pending.kind === 'debrief'
          ? <DebriefCard p={pending} S={S} update={update} toast={toast} refresh={refresh} />
          : <ReviewCard p={pending} S={S} update={update} toast={toast} refresh={refresh} />)}

      <div ref={endRef} />
    </div>

    <div {...sx('composer', cc.composer)}>
      {idle && !busy && <div {...sx(null, cc.chipsRow)}>
        <button {...sx('qchip', cc.qchip)} onClick={askReview}><Icon name="sparkles" {...sx(null, cc.qchipIcon)} />{t('Review my training')}</button>
        {!!lastWorkout && <button {...sx('qchip', cc.qchip)} onClick={askDebrief}><Icon name="checkCircle" {...sx(null, cc.qchipIcon)} />{t('Last workout')}</button>}
        {!!(S.routines || []).length && <button {...sx('qchip', cc.qchip)} onClick={pickRoutine}><Icon name="wrench" {...sx(null, cc.qchipIcon)} />{t('Improve a routine')}</button>}
        {community && <button {...sx('qchip', cc.qchip)} onClick={showCohort}><Icon name="person" {...sx(null, cc.qchipIcon)} />{t('Compare')}</button>}
      </div>}
      <div {...sx(null, cc.composerIn)}>
        <ChatInput value={text} onChange={setText} onSend={send} placeholder={placeholder} disabled={!!job}
          maxLength={maxMessageLen || 1000} expanded={expanded} setExpanded={setExpanded} />
        <button {...sx('send', cc.send)} onClick={send} disabled={!text.trim() || busy || !!job} aria-label={t('Send')}><Icon name="arrowUp" /></button>
      </div>
      {cap?.limit > 0 && <div {...sx('composer-cap', cc.composerCap)}>{t('{0} of {1} Coach runs used today', cap.used, cap.limit)}</div>}
    </div>
  </div>
}

/* ---------------------------------- bubbles ---------------------------------- */

function Bubble({ role, kind, at, children }) {
  return <div {...sx(null, cc.msg, role === 'user' ? cc.msgUser : cc.msgCoach)}>
    <div {...sx(null, bubble.bub, role === 'user' ? bubble.user : bubble.coach, kind === 'error' && bubble.err)}>{children}</div>
    {at && <div {...sx(null, cc.msgTime)}>{fmtChatTimestamp(at)}</div>}
  </div>
}

function Message({ m, S, profile, openSheet }) {
  if (m.kind === 'intake') {
    const lines = profileLines(profile)
    return <Bubble role="user" at={m.at}>
      {t('Here is what I am working with:')}
      <ul {...sx(null, bubble.list)}>{lines.map((l, i) => <li key={i} {...sx(null, bubble.item)}>{l}</li>)}</ul>
    </Bubble>
  }
  if (m.kind === 'applied' || m.kind === 'dismissed' || m.kind === 'debrief') {
    const entry = m.ref ? logEntry(S, m.ref) : null
    return <div {...sx(null, cc.msg, cc.msgCoach)} style={entry ? { maxWidth: '100%', width: '100%' } : undefined}>
      {!!m.text && <div {...sx(null, bubble.bub, bubble.coach)}>{m.text}</div>}
      {entry && <Recap entry={entry} S={S} openSheet={openSheet} />}
      {m.at && <div {...sx(null, cc.msgTime)}>{fmtChatTimestamp(m.at)}</div>}
    </div>
  }
  if (m.kind === 'text' && m.role === 'coach' && (m.actions?.length || m.sources?.length)) {
    return <div {...sx(null, cc.msg, cc.msgCoach)} style={m.actions?.length ? { maxWidth: '100%', width: '100%' } : undefined}>
      <div {...sx(null, bubble.bub, bubble.coach)}>{m.text}</div>
      <ActionCards actions={m.actions} />
      <Sources list={m.sources} />
      {m.at && <div {...sx(null, cc.msgTime)}>{fmtChatTimestamp(m.at)}</div>}
    </div>
  }
  if (m.kind === 'reverted' || m.kind === 'nochange' || m.kind === 'error' || m.kind === 'text') {
    return <Bubble role={m.role} kind={m.kind} at={m.at}>{m.text}</Bubble>
  }
  return null
}

function Typing({ S, kind, coachLocal, config }) {
  const ms = estimateMs(S)
  // "Local" on either side: the phone's own OpenAI-compatible endpoint, or the server's —
  // /api/config names the provider, and a model on the owner's box is nothing like a cloud API.
  const local = (coachLocal?.mode === 'byok' && coachLocal?.provider === 'compatible') || config?.coach?.provider === 'compatible'
  let eta
  if (ms) {
    const min = Math.round(ms / 60000)
    eta = min < 1 ? t('Usually under a minute.') : t('Usually about {0} min.', min)
  } else {
    // Until a job has been measured, "a minute or two" is a cloud number — say nothing for a
    // local model rather than something wrong; the next line already warns it takes longer.
    eta = local ? '' : t('This usually takes a minute or two.')
  }
  const doing = kind === 'create' ? t('Building your plan…') : kind === 'debrief' ? t('Looking at that session…') : kind === 'ask' ? t('Thinking about your question…') : kind === 'adapt' ? t('Looking at your workout…') : t('Reading your training…')
  return <div {...sx(null, cc.msg, cc.msgCoach)}>
    <div {...sx('typing', bubble.bub, bubble.coach, bubble.typing)}><i {...sx(null, bubble.typingDot)} /><i {...sx(null, bubble.typingDot, bubble.typingDot2)} /><i {...sx(null, bubble.typingDot, bubble.typingDot3)} /></div>
    <div {...sx(null, cc.typingEta)}>
      {doing} {eta}
      {local ? ' ' + t('A local model can take longer.') : ''}
      {' ' + t('Feel free to leave, it keeps going.')}
    </div>
  </div>
}

/* ---------------------------------- the plan ---------------------------------- */

function PlanCard({ p, S, update, toast, nav, refresh }) {
  const b = p.bundle
  const [tab, setTab] = useState(0)
  const weekDays = useMemo(() => new Set(Object.keys(b.week || {}).map(Number)), [b])
  // Routines asked for in the chat ("make me 3 routines") come with no week. Switched on, an empty
  // week replaced yours with rest days, so there is nothing to switch then. A rotation still takes them.
  const inRotation = scheduleModeOf(S) === 'rotation'
  const canSchedule = inRotation || weekDays.size > 0
  const [schedule, setSchedule] = useState(canSchedule)
  const r = b.routines[Math.min(tab, b.routines.length - 1)]

  const accept = () => {
    try {
      let n = 0
      update(s => {
        const res = applyCreatedPlan(s, p, { schedule: schedule && canSchedule })
        n = res?.routines?.length || b.routines.length
        appendChat(s, { role: 'coach', kind: 'applied', ref: res.logId, text: res.rotation
          ? t('Imported! {0} routines are in your plan and your rotation starts over with them. See you at the next session.', n)
          : schedule && canSchedule
          ? t('Imported! {0} routines are in your plan and your week is set. See you at the next session.', n)
          : t('Imported! {0} routines are in your plan. Your week is unchanged; schedule them whenever you like.', n) })
      })
      resolvePending({ accepted: ['plan'] }).catch(() => {})
      toast(t('Your plan is live'))
      refresh()
    } catch (e) { toast(e.message || t('That proposal can’t be read.')) }
  }
  const discard = () => confirmSheet({
    title: t('Discard this plan?'), message: t('Nothing is saved, and you can ask again anytime.'),
    confirmText: t('Discard'), danger: true,
    onConfirm: () => {
      update(s => { const ref = recordDismissal(s, p); appendChat(s, { role: 'coach', kind: 'dismissed', ref, text: t('Discarded. Tell me what was off and I will build a different one.') }) })
      resolvePending({ dismissed: true }).catch(() => {})
      refresh()
    }
  })

  return <div {...sx(null, cc.msg, cc.msgCoach)} style={{ maxWidth: '100%', width: '100%' }}>
    <div {...sx(null, pcard.card)}>
      <div {...sx(null, pcard.hd)}>
        <div {...sx(null, pcard.eyebrow)}>{p.iteration > 1 ? t('Revision {0}', p.iteration) : t('Your plan')}</div>
        <h2 {...sx(null, pcard.h)}>{b.name || t('Coach plan')}</h2>
        {!!b.summary && <p {...sx(null, pcard.sum)}>{b.summary}</p>}
        {!!b.basedOn && <p {...sx(null, pcard.sum)} style={{ fontSize: 'var(--fs-footnote)' }}>{b.basedOn}</p>}
      </div>

      <WeekStrip days={weekDays} ws={weekStartOf(S)} />

      {b.routines.length > 1 && <div {...sx(null, pcard.tabs)}>
        {b.routines.map((x, i) => <button key={x.id || i} {...sx(['pcard-tab', i === tab && 'on'], pcard.tab, i === tab && pcard.tabOn)} onClick={() => setTab(i)}><Icon name={glyphOf(x.emoji)} />{x.name}</button>)}
      </div>}

      {r && <RoutineBlock r={r} unit={S.unit} speedUnit={speedUnitOf(S)} />}

      {canSchedule && <div {...sx(null, pcard.row)}>
        {/* In rotation mode the plan goes into the loop, which is what Home reads (#778). */}
        {inRotation
          ? <span className="lrow-m"><span className="lrow-t">{t('Use this plan in your rotation')}</span><span className="lrow-s">{t('Replaces the sessions in your rotation and starts it over with the first one.')}</span></span>
          : <span className="lrow-m"><span className="lrow-t">{t('Use this weekly schedule')}</span><span className="lrow-s">{t('Replaces your current week. Days this plan leaves empty become rest days.')}</span></span>}
        <Switch checked={schedule} onChange={setSchedule} />
      </div>}
      <div {...sx(null, pcard.note)}>{t('The Coach is not a doctor or a physiotherapist. If something hurts, ask a professional.')}</div>
      <div {...sx(null, pcard.ft)}>
        <Button {...sx(null, pcard.ftBtn)} variant="primary" icon="download" onClick={accept}>{t('Import this plan')}</Button>
        <Button {...sx(null, pcard.ftBtn)} onClick={discard}>{t('Discard')}</Button>
      </div>
    </div>
    <div {...sx(null, cc.msgTime)}>{t('Not quite right? Say what to change below and I will revise the whole plan.')}</div>
  </div>
}

// In the order the week is set to start on (Settings), like the Plan's own week.
const WeekStrip = ({ days, ws }) => <div {...sx(null, pcard.week)}>
  {weekOrder(ws).map(d => <div key={d} {...sx(['pcard-wd', days.has(d) && 'on'], pcard.wd, days.has(d) && pcard.wdOn)}>{t(DAYS[d])}</div>)}
</div>

const RoutineBlock = ({ r, unit, speedUnit }) => <div {...sx(null, pcard.rt)}>
  <div {...sx('pcard-rt-h', pcard.rtHead)}><b {...sx(null, pcard.rtName)}><Icon name={glyphOf(r.emoji)} />{r.name}</b><span {...sx(null, pcard.rtCount)}>{tn('{0} exercise', '{0} exercises', r.ex.length)}</span></div>
  {!!r.why && <div {...sx(null, pcard.why)}>{r.why}</div>}
  {r.ex.map((e, i) => <div key={i} {...sx(null, pcard.ex)}>
    <div {...sx(null, pcard.exRow)}><span {...sx(null, pcard.exName, typed(e.id) && pcard.ownName)}>{exName(e.id)}</span><span {...sx(null, pcard.exLoad)}>{exLine(e, unit, speedUnit)}</span></div>
    {!!e.why && <div {...sx(null, pcard.exWhy)}>{e.why}</div>}
    {/* What the routine keeps (#1003): the cue shown under the exercise in every workout, and
        the backups a swap offers first. */}
    {!!e.note && <div {...sx(null, pcard.exExtra)}><Icon name="info" {...sx(null, pcard.exExtraIcon)} />{e.note}</div>}
    {Array.isArray(e.subs) && e.subs.length > 0 && <div {...sx(null, pcard.exExtra)}><Icon name="swap" {...sx(null, pcard.exExtraIcon)} />{t('Backups: {0}', e.subs.map(exName).join(', '))}</div>}
  </div>)}
</div>

/* ---------------------------------- a review ---------------------------------- */

function ReviewCard({ p, S, update, toast, refresh }) {
  const marked = useMemo(() => markStale(p, S), [p, S])
  const usable = applicable(marked)
  const [accepted, setAccepted] = useState(() => new Set(usable.map(c => c.id)))
  const toggle = id => setAccepted(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const apply = () => {
    const ids = [...accepted].filter(id => usable.some(c => c.id === id))
    if (!ids.length) { discard(); return }
    try {
      update(s => {
        const res = applyChangeSet(s, marked, ids)
        appendChat(s, { role: 'coach', kind: 'applied', ref: res.logId, text: tn('Applied {0} change to your plan.', 'Applied {0} changes to your plan.', ids.length) })
      })
      resolvePending({ accepted: ids, rejected: marked.changes.filter(c => !ids.includes(c.id)).map(c => c.id) }).catch(() => {})
      toast(tn('{0} change applied', '{0} changes applied', ids.length))
      refresh()
    } catch (e) { toast(e.message || t('Could not apply those changes')) }
  }
  const discard = () => confirmSheet({
    title: t('Dismiss these suggestions?'), message: t('Nothing changes, and the Coach will remember you turned these down.'),
    confirmText: t('Dismiss'), danger: true,
    onConfirm: () => {
      update(s => { const ref = recordDismissal(s, marked); appendChat(s, { role: 'coach', kind: 'dismissed', ref, text: t('Got it. I won’t suggest these again without new evidence.') }) })
      resolvePending({ dismissed: true }).catch(() => {})
      refresh()
    }
  })

  return <div {...sx(null, cc.msg, cc.msgCoach)} style={{ maxWidth: '100%', width: '100%' }}>
    <div {...sx(null, pcard.card)}>
      <div {...sx(null, pcard.hd)}>
        <div {...sx(null, pcard.eyebrow)}>{t('Suggestions')}</div>
        <h2 {...sx(null, pcard.h)}>{tn('{0} suggestion', '{0} suggestions', marked.changes.length)}</h2>
        {!!marked.summary && <p {...sx(null, pcard.sum)}>{marked.summary}</p>}
        {!!marked.evidence?.sessions && <p {...sx(null, pcard.sum)} style={{ fontSize: 'var(--fs-footnote)' }}>
          {t('Based on your last {0} sessions', marked.evidence.sessions)}{marked.evidence.from ? ` · ${fmtDate(marked.evidence.from)} – ${fmtDate(marked.evidence.to)}` : ''}
        </p>}
        {marked.planMoved && <p {...sx(null, pcard.sum)} style={{ fontSize: 'var(--fs-footnote)', color: 'var(--yellow)' }}>
          {t('Your plan changed since the Coach looked at it. Suggestions that no longer match are greyed out. Ask for a fresh review to see them again.')}
        </p>}
      </div>

      <Insights S={S} window={marked.evidence} />

      {marked.changes.map(c => {
        const stale = c.status === 'stale'
        return <ChangeRow key={c.id} c={c} S={S} stale={stale}>
          {/* A machine the gym does not have (#923): one tap takes it off the gym's list and this suggestion with it. */}
          {!stale && (c.type === 'add-exercise' || c.type === 'swap-exercise') && <NotHereButton profile={activeProfile(S)} ex={EXIDX[c.after?.id]}
            onDone={() => { if (accepted.has(c.id)) toggle(c.id) }} />}
          {!stale && <Check checked={accepted.has(c.id)} onChange={() => toggle(c.id)} />}
        </ChangeRow>
      })}

      <Notes notes={marked.notes} />

      <div {...sx(null, pcard.note)}>{t('The Coach is not a doctor or a physiotherapist. If something hurts, ask a professional.')}</div>
      <div {...sx(null, pcard.ft)}>
        <Button {...sx(null, pcard.ftBtn)} variant="primary" icon="check" onClick={apply}>
          {accepted.size ? tn('Apply {0} change', 'Apply {0} changes', accepted.size) : t('Apply nothing')}
        </Button>
        <Button {...sx(null, pcard.ftBtn)} onClick={discard}>{t('Dismiss all')}</Button>
      </div>
    </div>
  </div>
}

function ChangeRow({ c, S, stale, badge, children }) {
  const vals = changeValues(c, S)
  return <div {...sx('pcard-chg', pcard.chg, stale && pcard.chgStale)}>
    <div {...sx(null, pcard.chgBody)}>
      <div {...sx(null, pcard.chgTitle, c.status === 'rejected' && pcard.chgTitleDeclined)}>{changeTitle(c, S)}{c.routineName ? <span className="dim" style={{ fontWeight: 400 }}> · {c.routineName}</span> : null}</div>
      {vals && <div {...sx(null, pcard.chgValues)}><span className="tag">{vals.before}</span><Icon name="chevronRight" style={{ fontSize: 'var(--fs-caption)', color: 'var(--label-3)' }} /><span className="tag acc">{vals.after}</span></div>}
      <div {...sx(null, pcard.chgWhy)}>{c.why}</div>
      {/* What the change means at the gym, in the app's own words (lib/coach.js changeMeaning). */}
      {changeMeaning(c) && <div {...sx('small dim', pcard.chgMeaning)}>{changeMeaning(c)}</div>}
      {stale && <div {...sx(null, pcard.chgStaleNote)}>{t('Doesn’t match your plan any more, so it can’t be applied.')}</div>}
    </div>
    {badge}
    {children}
  </div>
}

const Notes = ({ notes }) => !!notes?.length && <div {...sx(null, pcard.notes)}>
  {notes.map((n, i) => <div key={i} {...sx(null, pcard.notesRow)}><Icon name="lightbulb" {...sx(null, pcard.notesIcon)} />{n}</div>)}
</div>

/* ---------------------------------- insights ---------------------------------- */

const BP_LABEL = { back: 'Back muscles', cardio: 'Cardio', chest: 'Chest', 'lower arms': 'Forearms', 'lower legs': 'Calves', neck: 'Neck', shoulders: 'Shoulders', 'upper arms': 'Arms', 'upper legs': 'Legs', waist: 'Core', other: 'Other' }
const bpLabel = bp => t(BP_LABEL[bp] || bp)

/**
 * The numbers the Coach read, drawn: how much and how often, where the body weight went,
 * which lifts moved, which body parts got the work. Computed on the device for the window the
 * proposal names, so the picture under a suggestion is the evidence behind it, not decoration.
 */
function Insights({ S, window: win, compact }) {
  const ins = useMemo(() => insightsFor(S, win || {}), [S, win?.from, win?.to])
  if (!ins.sessions && !ins.bodyweight.points.length) return null
  const maxBp = ins.bodyParts[0]?.sets || 1
  const bw = ins.bodyweight
  return <div {...sx(null, cc.ins)}>
    <div {...sx(null, cc.tiles)}>
      <Tile v={ins.sessions} l={t('Sessions')} />
      <Tile v={ins.minutes != null ? ins.minutes : '–'} l={t('Min / session')} />
      <Tile v={ins.volume ? kfmt(ins.volume) : '–'} l={t('Volume ({0})', S.unit)} />
      <Tile v={ins.sets} l={t('Sets')} />
    </div>

    {bw.points.length > 1 && <div {...sx(null, cc.block)}>
      <div {...sx(null, cc.blockHead)}>
        <span {...sx(null, cc.blockHeadFirst)}>{t('Body weight')}</span>
        <span {...sx(null, cc.delta, bw.delta > 0 && cc.deltaUp, bw.delta < 0 && cc.deltaDown)}>
          {bw.delta > 0 ? '+' : ''}{fmtNum(bw.delta)} {S.unit}{bw.goal != null ? ` · ${t('goal')} ${fmtNum(bw.goal)}` : ''}
        </span>
      </div>
      <div {...sx('chart', cc.chart)}><LineChart points={bw.points} h={compact ? 96 : 120} unit={S.unit} goal={bw.goal} axes={!compact} /></div>
    </div>}

    {!!ins.strength.length && <div {...sx(null, cc.block)}>
      <div {...sx(null, cc.blockHead)}><span {...sx(null, cc.blockHeadFirst)}>{t('Estimated 1RM')}</span><span {...sx('dim', cc.blockHeadLast, cc.headDim)}>{t('first → last session')}</span></div>
      {ins.strength.map(x => <div key={x.id} {...sx(null, cc.row)}>
        <span {...sx(null, cc.rowName, typed(x.id) && pcard.ownName)}>{x.name}</span>
        <span {...sx(null, cc.rowValue)}><span {...sx('tag', cc.rowValueTag)}>{fmtNum(x.first)}</span><Icon name="chevronRight" {...sx(null, cc.rowValueIcon)} /><span {...sx('tag acc', cc.rowValueTag)}>{fmtNum(x.last)}</span></span>
        <span {...sx(null, cc.delta, x.delta > 0 && cc.deltaUp, x.delta < 0 && cc.deltaDown)}>{x.delta > 0 ? '▲' : x.delta < 0 ? '▼' : '•'} {Math.abs(x.pct)}%</span>
      </div>)}
    </div>}

    {!!ins.bodyParts.length && !compact && <div {...sx(null, cc.block)}>
      <div {...sx(null, cc.blockHead)}><span {...sx(null, cc.blockHeadFirst)}>{t('Work sets by body part')}</span></div>
      {ins.bodyParts.slice(0, 6).map(b => <div key={b.bp} {...sx(null, cc.bar)}>
        <span {...sx(null, cc.barLabel)}>{bpLabel(b.bp)}</span>
        <span {...sx(null, cc.barTrack)}><i {...sx(null, cc.barFill)} style={{ width: Math.max(4, Math.round(b.sets / maxBp * 100)) + '%' }} /></span>
        <span {...sx(null, cc.barValue)}>{b.sets}</span>
      </div>)}
    </div>}
  </div>
}
const Tile = ({ v, l }) => <div {...sx(null, cc.tile)}><div {...sx(null, cc.tileValue)}>{v}</div><div {...sx(null, cc.tileLabel)}>{l}</div></div>
const kfmt = n => (n >= 10000 ? Math.round(n / 1000) + 'k' : fmtNum(n))

/* ---------------------------------- a debrief ---------------------------------- */

function DebriefBody({ p, S }) {
  const w = p.workout || {}
  const live = useMemo(() => sessionInsights(S, (S.workouts || []).find(x => x.id === w.id) || null), [S, w.id])
  const score = Number.isFinite(p.score) ? Math.max(1, Math.min(10, p.score)) : null
  return <>
    {score != null && <div {...sx(null, cc.score)}>
      <div {...sx('deb-ring', cc.ring)} style={{ '--pct': score / 10 }}><span {...sx(null, cc.ringValue)}>{score}</span><small {...sx(null, cc.ringOf)}>/10</small></div>
      <div {...sx(null, cc.scoreText)}><b {...sx(null, cc.scoreTitle)}>{scoreWord(score)}</b><span {...sx(null, cc.scoreSub)}>{w.name || t('Workout')}{w.d ? ' · ' + fmtDate(w.d) : ''}</span></div>
    </div>}
    {live && <div {...sx(null, cc.ins)}>
      <div {...sx(null, cc.tiles)}>
        <Tile v={live.now.sets} l={t('Sets')} />
        <Tile v={live.now.minutes != null ? live.now.minutes : '–'} l={t('Minutes')} />
        <Tile v={live.now.volume ? kfmt(live.now.volume) : '–'} l={t('Volume ({0})', S.unit)} />
        <Tile v={live.now.prs || '–'} l={t('PRs')} />
      </div>
      {live.then && <div {...sx(null, cc.cmpLine)}>
        {t('vs. last {0} on {1}:', w.name || t('session'), fmtDate(live.prevDate))}{' '}
        <Delta v={live.now.volume - live.then.volume} unit={S.unit} label={t('volume')} />
        {live.now.minutes != null && live.then.minutes != null && <Delta v={live.now.minutes - live.then.minutes} unit="min" label={t('time')} />}
      </div>}
      {!!live.lifts.length && <div {...sx(null, cc.block)}>
        <div {...sx(null, cc.blockHead)}><span {...sx(null, cc.blockHeadFirst)}>{t('Best set, estimated 1RM')}</span></div>
        {live.lifts.slice(0, 6).map(x => <div key={x.id} {...sx(null, cc.row)}>
          <span {...sx(null, cc.rowName, typed(x.id) && pcard.ownName)}>{x.name} <span {...sx('dim', cc.rowNameDim)}>{isoRun(`${fmtNum(x.w)}×${x.r}`)}</span></span>
          <span {...sx(null, cc.rowValue)}><span {...sx('tag acc', cc.rowValueTag)}>{fmtNum(x.est)}</span></span>
          {x.prev != null && <span {...sx(null, cc.delta, x.est > x.prev && cc.deltaUp, x.est < x.prev && cc.deltaDown)}>{x.est > x.prev ? '▲' : x.est < x.prev ? '▼' : '•'} {fmtNum(Math.abs(x.est - x.prev))}</span>}
        </div>)}
      </div>}
    </div>}
    <DebriefList icon="checkCircle" tint="var(--green)" title={t('What went well')} items={p.highlights} />
    <DebriefList icon="warning" tint="var(--yellow)" title={t('Worth watching')} items={p.watch} />
    <DebriefList icon="arrowUp" tint="var(--acc)" title={t('Next time')} items={p.nextTime} />
  </>
}
const Delta = ({ v, unit, label }) => <span {...sx(null, cc.delta, v > 0 && cc.deltaUp, v < 0 && cc.deltaDown)}>{v > 0 ? '+' : ''}{fmtNum(v)} {unit} {label}</span>
const DebriefList = ({ icon, tint, title, items }) => !!items?.length && <div {...sx(null, cc.list)}>
  <div {...sx(null, cc.listHead)} style={{ color: tint }}><Icon name={icon} {...sx(null, cc.listHeadIcon)} />{title}</div>
  {items.map((x, i) => <div key={i} {...sx(null, cc.item)}>{x}</div>)}
</div>
const scoreWord = s => s >= 9 ? t('Excellent session') : s >= 7 ? t('Good session') : s >= 5 ? t('Solid session') : t('Tough session')

function DebriefCard({ p, S, update, toast, refresh }) {
  const done = () => {
    update(s => { const ref = recordDebrief(s, p); appendChat(s, { role: 'coach', kind: 'debrief', ref, text: '' }) })
    resolvePending({ accepted: ['debrief'] }).catch(() => {})
    toast(t('Kept in your Coach history'))
    refresh()
  }
  return <div {...sx(null, cc.msg, cc.msgCoach)} style={{ maxWidth: '100%', width: '100%' }}>
    <div {...sx(null, pcard.card)}>
      <div {...sx(null, pcard.hd)}>
        <div {...sx(null, pcard.eyebrow)}>{t('Workout debrief')}</div>
        <h2 {...sx(null, pcard.h)}>{p.workout?.name || t('Your last workout')}</h2>
        {!!p.summary && <p {...sx(null, pcard.sum)}>{p.summary}</p>}
      </div>
      <DebriefBody p={p} S={S} />
      <div {...sx(null, pcard.ft)}>
        <Button {...sx(null, pcard.ftBtn)} variant="primary" icon="check" onClick={done}>{t('Got it')}</Button>
      </div>
    </div>
    <div {...sx(null, cc.msgTime)}>{t('Want changes to the plan from this? Ask for a review below.')}</div>
  </div>
}

/* ---------------------------------- what was decided ---------------------------------- */

/** A decided proposal, folded: one line of what it was and what you did, and a way back in. */
function Recap({ entry, S, openSheet }) {
  const open = () => openSheet(() => <ProposalDetail entry={entry} S={S} />)
  const decisions = entry.decisions || []
  const acc = decisions.filter(d => d.status === 'accepted').length
  const rej = decisions.length - acc
  const kind = entry.kind
  const eyebrow = kind === 'create' ? t('Plan') : kind === 'debrief' ? t('Workout debrief') : kind === 'adapt' ? t('For this workout') : t('Suggestions')
  const state = kind === 'debrief' ? null
    : entry.dismissed ? { cls: 'no', text: t('Declined') }
      : kind === 'create' ? { cls: 'yes', text: t('Imported') }
        : rej ? { cls: 'mix', text: t('{0} accepted · {1} declined', acc, rej) } : { cls: 'yes', text: t('{0} accepted', acc) }
  const title = kind === 'create' ? (entry.bundle?.name || t('Coach plan'))
    : kind === 'debrief' ? (entry.workout?.name || t('Workout')) + (entry.score != null ? ` · ${entry.score}/10` : '')
      : tn('{0} suggestion', '{0} suggestions', decisions.length)
  return <button {...sx('recap', cc.recap)} onClick={open}>
    <div {...sx(null, cc.recapTop)}>
      <span {...sx(null, pcard.eyebrow, cc.recapEyebrow)}>{eyebrow}</span>
      {state && <span {...sx(null, recapState.base, recapState[state.cls])}>{state.text}</span>}
    </div>
    <div {...sx(null, cc.recapTitle)}>{title}</div>
    {!!entry.summary && <div {...sx(null, cc.recapSum)}>{entry.summary}</div>}
    {kind === 'review' && !!decisions.length && <div {...sx(null, cc.recapChips)}>
      {decisions.slice(0, 4).map(d => <span key={d.id} {...sx(['recap-chip', d.status === 'accepted' ? 'yes' : 'no'], cc.recapChip, d.status !== 'accepted' && cc.recapChipNo)}><Icon name={d.status === 'accepted' ? 'check' : 'xmark'} {...sx(null, cc.recapChipIcon, d.status === 'accepted' ? cc.recapChipIconYes : cc.recapChipIconNo)} />{changeTitle(d, S)}</span>)}
      {decisions.length > 4 && <span {...sx('recap-chip', cc.recapChip)}>+{decisions.length - 4}</span>}
    </div>}
    <div {...sx(null, cc.recapMore)}>{t('Show everything')}<Icon name="chevronRight" {...sx(null, cc.recapMoreIcon)} /></div>
  </button>
}

/** The whole proposal, as it was, read-only. */
function ProposalDetail({ entry, S }) {
  const [tab, setTab] = useState(0)
  const kind = entry.kind
  const b = entry.bundle
  const r = b?.routines?.[Math.min(tab, (b?.routines?.length || 1) - 1)]
  const weekDays = useMemo(() => new Set(Object.keys(b?.week || {}).map(Number)), [b])
  return <div {...sx(null, pcard.detail)}>
    <div {...sx(null, pcard.hd)} style={{ paddingInline: 0 }}>
      <div {...sx(null, pcard.eyebrow)}>{kind === 'create' ? t('Plan') : kind === 'debrief' ? t('Workout debrief') : kind === 'adapt' ? t('For this workout') : t('Suggestions')} · {fmtDate(isoOf(new Date(entry.at)))}</div>
      <h2 {...sx(null, pcard.h)}>{kind === 'create' ? (b?.name || t('Coach plan')) : kind === 'debrief' ? (entry.workout?.name || t('Workout')) : tn('{0} suggestion', '{0} suggestions', entry.decisions?.length || 0)}</h2>
      {!!entry.summary && <p {...sx(null, pcard.sum)}>{entry.summary}</p>}
      {entry.dismissed && <p {...sx(null, pcard.sum)} style={{ color: 'var(--red)' }}>{t('You declined this.')}</p>}
      {!!entry.evidence?.sessions && <p {...sx(null, pcard.sum)} style={{ fontSize: 'var(--fs-footnote)' }}>
        {t('Based on your last {0} sessions', entry.evidence.sessions)}{entry.evidence.from ? ` · ${fmtDate(entry.evidence.from)} – ${fmtDate(entry.evidence.to)}` : ''}
      </p>}
    </div>

    {kind === 'review' && <>
      <Insights S={S} window={entry.evidence} />
      {(entry.decisions || []).map(d => <ChangeRow key={d.id} c={d} S={S} stale={d.status === 'stale'}
        badge={<span {...sx(null, recapState.base, d.status === 'accepted' ? recapState.yes : recapState.no, recapState.inRow)}>{d.status === 'accepted' ? t('Accepted') : d.status === 'stale' ? t('Expired') : t('Declined')}</span>} />)}
      <Notes notes={entry.notes} />
    </>}

    {kind === 'create' && b && <>
      <WeekStrip days={weekDays} ws={weekStartOf(S)} />
      {b.routines.length > 1 && <div {...sx(null, pcard.tabs)} style={{ paddingInline: 0 }}>
        {b.routines.map((x, i) => <button key={x.id || i} {...sx(['pcard-tab', i === tab && 'on'], pcard.tab, i === tab && pcard.tabOn)} onClick={() => setTab(i)}><Icon name={glyphOf(x.emoji)} />{x.name}</button>)}
      </div>}
      {r && <RoutineBlock r={r} unit={S.unit} speedUnit={speedUnitOf(S)} />}
      <p {...sx(null, pcard.sum)} style={{ fontSize: 'var(--fs-footnote)' }}>{entry.rotation ? t('Your rotation was set to this plan.') : entry.scheduled ? t('Your week was set to this schedule.') : t('Imported without changing your week.')}</p>
    </>}
    {kind === 'create' && !b && <p {...sx(null, pcard.sum)}>{t('This plan was imported before the app kept proposals; only its summary is left.')}</p>}

    {kind === 'adapt' && (entry.decisions || []).map(d => <div key={d.id} {...sx('pcard-chg', pcard.chg)}>
      <div {...sx(null, pcard.chgBody)}>
        <div {...sx(null, pcard.chgTitle)}>{adaptTitle(d)}</div>
        <div {...sx(null, pcard.chgWhy)}>{d.why}</div>
      </div>
      <span {...sx(null, recapState.base, d.status === 'accepted' ? recapState.yes : recapState.no, recapState.inRow)}>{d.status === 'accepted' ? t('Accepted') : t('Declined')}</span>
    </div>)}
    {kind === 'debrief' && <DebriefBody p={entry} S={S} />}
    {kind === 'revert' && <p {...sx(null, pcard.sum)}>{t('Reverted the last Coach changes.')}</p>}
    <div style={{ height: 10 }} />
  </div>
}

/** Every proposal ever made, newest first. Nothing the Coach said is gone after a decision. */
function HistorySheet({ S, close, openSheet }) {
  const log = [...(S.coach?.log || [])].reverse()
  const icon = { create: ['clipboard', 'var(--indigo)'], review: ['sparkles', 'var(--acc)'], debrief: ['checkCircle', 'var(--green)'], revert: ['reset', 'var(--blue)'], adapt: ['dumbbell', 'var(--orange)'] }
  return <div {...sx(null, cc.menu)}>
    <h3>{t('Everything the Coach proposed')}</h3>
    {!log.length && <div {...sx(null, cc.empty)}>{t('Nothing yet. Every plan, suggestion and debrief will be kept here, whether you said yes or no.')}</div>}
    <div className="sect-b">
      {log.map(e => {
        const [ic, tint] = icon[e.kind] || ['sparkles', 'var(--acc)']
        const n = (e.decisions || []).length
        const acc = (e.decisions || []).filter(d => d.status === 'accepted').length
        const title = e.kind === 'create' ? (e.bundle?.name || t('Coach plan')) + (e.iteration > 1 ? ` · ${t('Revision {0}', e.iteration)}` : '')
          : e.kind === 'debrief' ? t('Debrief: {0}', e.workout?.name || t('Workout')) + (e.score != null ? ` · ${e.score}/10` : '')
            : e.kind === 'revert' ? t('Reverted the last Coach changes.')
              : tn('{0} suggestion', '{0} suggestions', n)
        const sub = fmtDate(isoOf(new Date(e.at))) + ' · ' + (e.kind === 'debrief' ? String(e.summary || '').slice(0, 60)
          : e.dismissed ? t('Declined') : e.kind === 'create' ? t('Imported') : e.kind === 'revert' ? '' : t('{0} accepted · {1} declined', acc, n - acc))
        return <Row key={e.id} icon={ic} iconTint={tint} title={title} subtitle={sub} accessory="chevron"
          onClick={() => { close(); openSheet(() => <ProposalDetail entry={e} S={S} />) }} />
      })}
    </div>
    <div style={{ height: 10 }} />
  </div>
}

/* ---------------------------------- the others here ---------------------------------- */

/**
 * How you sit against everyone else on this instance — medians only, at least three people
 * sharing, nothing that identifies anyone. The admin turns it on for the instance; each person
 * turns it on for themselves; a person who does not share sees nothing either.
 */
function CohortSheet({ S, update, toast }) {
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = () => cohortStats().then(setD).catch(e => { toast(e.message || t('Could not load')); setD({ ok: false }) })
  useEffect(() => { load() }, [])
  const share = async v => {
    setBusy(true)
    try { await setCohortShare(v); update(s => { (s.coach = s.coach || emptyCoach()).share = v }); await load() }
    catch (e) { toast(e.message || t('Could not save')) }
    setBusy(false)
  }
  const sharing = !!d?.sharing
  return <div {...sx(null, cc.menu)}>
    <h3>{t('Compare with others here')}</h3>
    <Section footer={t('Only medians across everyone who shares, never a name, a body weight or a single session. Turning this off removes you from the numbers immediately.')}>
      <Row icon="person" iconTint="var(--teal)" title={t('Include me')} subtitle={sharing ? t('Your lifts count towards the medians') : t('Off. You see nothing and share nothing')}>
        <Switch checked={sharing} disabled={busy || !d} onChange={share} />
      </Row>
    </Section>
    {!d && <div {...sx(null, cc.empty)}>{t('Loading…')}</div>}
    {d && sharing && !d.ok && <div {...sx(null, cc.empty)}>{d.people != null
      ? t('Not enough people are sharing yet ({0} of {1} needed). Rope in your gym mates!', d.people, d.minPeople)
      : t('Not available right now.')}</div>}
    {d && sharing && d.ok && <div {...sx(null, cc.ins, cc.insFlush)}>
      <div {...sx(null, cc.tiles)}>
        <Tile v={d.people} l={t('People')} />
        <Tile v={fmtNum(d.sessionsPerWeek.you)} l={t('Your sessions / wk')} />
        <Tile v={fmtNum(d.sessionsPerWeek.median)} l={t('Median / wk')} />
        <Tile v={d.rankPct != null ? d.rankPct + '%' : '–'} l={t('Your strength rank')} />
      </div>
      {!!d.exercises.length && <div {...sx(null, cc.block)}>
        <div {...sx(null, cc.blockHead)}><span {...sx(null, cc.blockHeadFirst)}>{t('Estimated 1RM, you vs. median')}</span><span {...sx('dim', cc.blockHeadLast, cc.headDim)}>{S.unit}</span></div>
        {d.exercises.map(x => {
          const max = Math.max(x.median, x.you || 0) || 1
          return <div key={x.id} {...sx(null, cc.cmp)}>
            <div {...sx(null, cc.cmpHead)}><span>{x.name}</span><span {...sx('dim', cc.cmpHeadDim)}>{x.people} {t('people')}</span></div>
            <div {...sx(null, cc.cmpBar)}><i {...sx(null, cc.cmpFill, cc.cmpFillYou)} style={{ width: Math.round((x.you || 0) / max * 100) + '%' }} /><span {...sx(null, cc.cmpLabel)}>{t('You')} · {x.you != null ? fmtNum(x.you) : '–'}</span></div>
            <div {...sx(null, cc.cmpBar)}><i {...sx(null, cc.cmpFill)} style={{ width: Math.round(x.median / max * 100) + '%' }} /><span {...sx(null, cc.cmpLabel)}>{t('Median')} · {fmtNum(x.median)}</span></div>
          </div>
        })}
      </div>}
      {!d.exercises.length && <div {...sx(null, cc.empty)}>{t('No exercise is trained by three or more people yet.')}</div>}
    </div>}
    <div style={{ height: 10 }} />
  </div>
}

/* ---------------------------------- cadence ---------------------------------- */

const cadenceLabel = coach => {
  const c = coach.cadence && coach.cadence !== 'off' ? coach.cadence : null
  if (!c) return t('Off')
  if (c.weekly) return t('Weekly')
  return t('After every few workouts')
}

function cadenceSheet(openSheet, update) {
  openSheet(close => <CadenceSheet close={close} update={update} />)
}
function CadenceSheet({ update }) {
  const coach = useStore(s => s.S.coach) || emptyCoach()
  const cadence = coach.cadence && coach.cadence !== 'off' ? coach.cadence : null
  const mode = !cadence ? 'off' : cadence.weekly ? 'weekly' : 'every'
  // A phone with its own key runs them itself, and only while the app is open (lib/coach-schedule.js).
  const deviceMode = useStore(s => s.coachLocal?.mode)
  const onPhone = MOBILE && deviceMode === 'byok'
  // Automatic reviews send your training while nobody is looking, so switching them on is where
  // the data-sharing question is asked for them. "Not now" leaves them off.
  const setMode = async m => {
    if (m !== 'off') {
      try { await ensureAiConsent() } catch (e) { if (!isDeclined(e)) useUI.getState().toast(e.message || t('Could not ask the Coach')); return }
    }
    update(s => {
      const c = (s.coach = s.coach || emptyCoach())
      c.cadence = m === 'off' ? 'off' : m === 'weekly' ? { weekly: { day: 0, time: '18:00' } } : { everyWorkouts: 4 }
    })
  }
  const patch = fn => update(s => { const c = (s.coach = s.coach || emptyCoach()); fn(c) })
  return <>
    <h3>{t('Automatic reviews')}</h3>
    <Section footer={mode === 'off' ? t('Off. The Coach only looks when you ask.') : t('You are only notified when the Coach actually has something to suggest.')
      + (onPhone ? ' ' + t('On this phone the Coach can only look while the app is open: right after a workout, or the next time you open it.') : '')}>
      <SelectRow icon="clock" iconTint="var(--purple)" title={t('When')} value={mode} onChange={setMode}
        options={[
          { value: 'off', label: t('Off') },
          { value: 'weekly', label: t('Weekly'), subtitle: t('On a day and time you choose') },
          { value: 'every', label: t('After every few workouts'), subtitle: t('As soon as you have logged enough') }
        ]} />
      {mode === 'weekly' && <>
        <SelectRow icon="calendar" iconTint="var(--orange)" title={t('Day')} value={cadence.weekly.day}
          onChange={v => patch(c => { c.cadence = { weekly: { ...c.cadence.weekly, day: v } } })}
          options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => ({ value: i, label: t(d) }))} />
        <Row icon="clock" iconTint="var(--purple)" title={t('Time')}>
          <input type="time" className="timef" value={cadence.weekly.time || '18:00'}
            onChange={e => patch(c => { c.cadence = { weekly: { ...c.cadence.weekly, time: e.target.value } } })} />
        </Row>
      </>}
      {mode === 'every' && <SelectRow icon="dumbbell" iconTint="var(--teal)" title={t('After how many workouts')}
        value={cadence.everyWorkouts || 4}
        onChange={v => patch(c => { c.cadence = { everyWorkouts: v } })}
        options={[3, 4, 5, 6, 8, 10].map(n => ({ value: n, label: tn('{0} workout', '{0} workouts', n) }))} />}
    </Section>
  </>
}
