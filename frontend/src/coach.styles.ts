// Fork: the Coach's shared styles (was coach.css), used by more than one of its screens: the
// questionnaire (views/CoachIntake.jsx), the consent sheet (components/CoachConsentSheet.jsx),
// what it sees (components/CoachSees.jsx), the chat (views/CoachChat.jsx) and the mid-workout
// sheet (components/WorkoutCoachSheet.jsx). Everything sits on the app's tokens (index.css).
// Styles only one screen uses live beside that screen.
import * as stylex from '@stylexjs/stylex'

const consentRow = {
  display: 'flex',
  gap: 12,
  alignItems: 'flex-start',
  backgroundColor: 'var(--surface)',
  borderRadius: 'var(--r-lg)',
  padding: '13px 15px',
} as const

export const ob = stylex.create({
  eyebrow: {
    color: 'var(--acc-ink)',
    fontSize: 'var(--fs-footnote)',
    fontWeight: 600,
    letterSpacing: '.04em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  consent: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 },
  consentRow,
  consentIcon: { color: 'var(--acc-ink)', fontSize: '1.1875rem', flex: 'none', marginTop: 2 },
  consentBody: { minWidth: 0 },
  consentTitle: {
    display: 'block',
    fontSize: 'var(--fs-subhead)',
    fontWeight: 600,
    marginBottom: 2,
    letterSpacing: '-.008em',
  },
  consentText: { fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', lineHeight: 1.4 },
  fine: {
    fontSize: 'var(--fs-footnote)',
    color: 'var(--label-2)',
    lineHeight: 1.5,
    display: 'grid',
    gap: 8,
    marginBottom: 20,
  },
})

const typing = stylex.keyframes({
  '0%, 80%, 100%': { transform: 'translateY(0)', opacity: 0.45 },
  '40%': { transform: 'translateY(-4px)', opacity: 1 },
})

// The Coach's speech bubble (chat and the mid-workout sheet), and its typing dots.
export const bubble = stylex.create({
  typing: { display: 'flex', alignItems: 'center', gap: 5, padding: '14px 16px', minWidth: 64 },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: 'var(--label-2)',
    animationName: typing,
    animationDuration: '1.2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  typingDot2: { animationDelay: '.15s' },
  typingDot3: { animationDelay: '.3s' },
  bub: {
    padding: '11px 15px',
    borderRadius: 20,
    fontSize: 'var(--fs-callout)',
    lineHeight: 1.42,
    letterSpacing: '-.008em',
    backgroundColor: 'var(--surface)',
    color: 'var(--label)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  coach: { borderBottomLeftRadius: 6 },
  user: { backgroundColor: 'var(--acc)', color: 'var(--on-acc)', borderBottomRightRadius: 6 },
  err: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--red) 14%,var(--surface))', 'var(--surface)'),
    color: 'var(--label)',
  },
  list: { margin: '6px 0 0', paddingLeft: 18 },
  item: { margin: '2px 0' },
})

// A proposal, as a card inside the Coach's column. Rows inside take their side padding from
// --pcard-pad, which the folded-out detail sheet sets to 0 (pcard.detail).
const pad = 'var(--pcard-pad, 18px)'
const rule = 'var(--hair) solid var(--sep)'
export const pcard = stylex.create({
  card: {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--r-xl)',
    overflow: 'hidden',
    width: '100%',
    border: '1px solid var(--sep-op)',
  },
  detail: { '--pcard-pad': '0px' },
  hd: { padding: '16px 18px 6px' },
  eyebrow: {
    fontSize: 'var(--fs-caption)',
    fontWeight: 600,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    color: 'var(--acc-ink)',
    marginBottom: 4,
  },
  h: { fontSize: 'var(--fs-title2)', fontWeight: 700, letterSpacing: '-.022em', lineHeight: 1.15, margin: 0 },
  sum: { fontSize: 'var(--fs-subhead)', color: 'var(--label-2)', lineHeight: 1.45, margin: '8px 0 0' },
  tabs: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    padding: '12px 18px 4px',
    overflowY: 'hidden',
    overscrollBehaviorX: 'contain',
    overscrollBehaviorY: 'auto',
    touchAction: 'pan-x pan-y',
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
  },
  tab: {
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 99,
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label-2)',
    fontSize: '.875rem',
    fontWeight: 500,
    transition: 'background-color var(--fast),color var(--fast)',
    whiteSpace: 'nowrap',
  },
  tabOn: { backgroundColor: 'var(--label)', color: 'var(--bg)' },
  rt: { padding: `10px ${pad} 4px` },
  rtHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  rtName: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '1.125rem',
    fontWeight: 600,
    letterSpacing: '-.015em',
  },
  rtCount: { fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', whiteSpace: 'nowrap' },
  why: { fontSize: '.875rem', color: 'var(--label-2)', lineHeight: 1.45, margin: '4px 0 8px' },
  ex: { padding: '11px 0', borderTop: { default: rule, ':first-of-type': 'none' } },
  exRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' },
  exName: { fontSize: 'var(--fs-callout)', fontWeight: 500, letterSpacing: '-.01em', textTransform: 'capitalize' },
  // Your own exercise keeps the casing you typed.
  ownName: { textTransform: 'none' },
  exLoad: { fontSize: '.875rem', color: 'var(--label-2)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  exWhy: { fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', lineHeight: 1.42, marginTop: 3 },
  exExtra: {
    display: 'flex',
    gap: 6,
    alignItems: 'baseline',
    fontSize: 'var(--fs-footnote)',
    color: 'var(--label-2)',
    lineHeight: 1.42,
    marginTop: 3,
  },
  exExtraIcon: { flex: 'none', color: 'var(--teal)', transform: 'translateY(1px)' },
  week: { display: 'flex', gap: 5, padding: `10px ${pad} 4px` },
  wd: {
    flex: 1,
    textAlign: 'center',
    fontSize: 'var(--fs-caption2)',
    fontWeight: 600,
    padding: '7px 0',
    borderRadius: 'var(--r-sm)',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label-3)',
  },
  wdOn: { backgroundColor: 'var(--acc-soft)', color: 'var(--acc-ink)' },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 18px',
    borderTop: rule,
    '--lrow-t-fs': 'var(--fs-subhead)',
    '--lrow-s-fs': 'var(--fs-caption)',
  },
  ft: { padding: '12px 18px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: rule },
  ftBtn: { fontSize: 'var(--fs-callout)', padding: '14px 18px', borderRadius: 'var(--r-lg)' },
  note: { fontSize: 'var(--fs-caption)', color: 'var(--yellow)', lineHeight: 1.45, padding: '0 18px 6px' },
  chg: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: `12px ${pad}`, borderTop: rule },
  chgStale: { opacity: 0.5 },
  chgBody: { flex: 1, minWidth: 0 },
  chgTitle: { fontSize: 'var(--fs-subhead)', fontWeight: 600, letterSpacing: '-.01em' },
  chgTitleDeclined: { color: 'var(--label-2)' },
  chgValues: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    margin: '4px 0',
    fontSize: 'var(--fs-footnote)',
    '--tag-fs': 'var(--fs-caption)',
  },
  chgWhy: { fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', lineHeight: 1.42 },
  chgMeaning: { marginTop: 4, lineHeight: 1.4 },
  chgStaleNote: { fontSize: 'var(--fs-caption)', color: 'var(--yellow)', marginTop: 4 },
  notes: { padding: `10px ${pad} 4px`, borderTop: rule },
  notesRow: {
    fontSize: 'var(--fs-footnote)',
    color: 'var(--label-2)',
    lineHeight: 1.45,
    padding: '4px 0',
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  notesIcon: { color: 'var(--yellow)', flex: 'none', fontSize: 'var(--fs-subhead)', marginTop: 1 },
})

// A decision's state as a small pill: accepted, declined, or a mix.
export const recapState = stylex.create({
  base: {
    fontSize: 'var(--fs-caption2)',
    fontWeight: 600,
    padding: '3px 9px',
    borderRadius: 99,
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label-2)',
    whiteSpace: 'nowrap',
    flex: 'none',
  },
  yes: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--green) 16%,transparent)', 'rgba(48,209,88,0.16)'),
    color: 'var(--green)',
  },
  no: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--red) 14%,transparent)', 'rgba(255,69,58,0.14)'),
    color: 'var(--red)',
  },
  mix: { backgroundColor: 'var(--acc-soft)', color: 'var(--acc-ink)' },
  inRow: { alignSelf: 'center' },
})
