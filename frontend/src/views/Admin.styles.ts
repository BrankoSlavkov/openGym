// Fork: the admin dashboard's styles (was admin.css), shared by Admin.jsx, AdminCoach.jsx,
// AdminCommunity.tsx and components/AdminOidc.jsx. Operator-facing, English-only, on the app's
// tokens. The page is looked at maybe twice a year, so every card says what it is for in a
// sentence and every state is a word, not a colour to decode. Safari before 16.2 has no
// color-mix(): the plain colour there (firstThatWorks).
import * as stylex from '@stylexjs/stylex'

const rowLine = 'var(--hair) solid var(--sep)'
const summary = {
  listStyle: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: '6px 0',
  '::-webkit-details-marker': { display: 'none' },
} as const

export const styles = stylex.create({
  intro: { color: 'var(--label-2)', fontSize: '.875rem', lineHeight: 1.45, margin: '-6px 0 16px' },
  // one sentence under a card heading that says what the card is for
  lead: { color: 'var(--label-2)', fontSize: 'var(--fs-footnote)', lineHeight: 1.45, margin: '2px 0 12px' },

  // status pill: a word and a colour, never a paragraph
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: '.7812rem',
    fontWeight: 600,
    letterSpacing: '-.004em',
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label-2)',
    '::before': {
      content: "''",
      width: 7,
      height: 7,
      borderRadius: '50%',
      backgroundColor: 'currentColor',
      flex: 'none',
    },
  },
  pillOk: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--green) 16%,transparent)', 'rgba(48,209,88,0.16)'),
    color: 'var(--green)',
  },
  pillWarn: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--yellow) 18%,transparent)', 'rgba(255,214,10,0.18)'),
    color: 'var(--yellow)',
  },
  pillBad: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--red) 16%,transparent)', 'rgba(255,69,58,0.16)'),
    color: 'var(--red)',
  },
  pillAcc: { backgroundColor: 'var(--acc-soft)', color: 'var(--acc-ink)' },

  // the one-line "what state is this in" under the card title
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    fontSize: '.875rem',
    color: 'var(--label-2)',
    margin: '4px 0 14px',
    lineHeight: 1.4,
  },

  // numbered setup steps: a <details> per step, so a finished step folds away
  step: { borderTop: { default: rowLine, ':first-of-type': 0 }, padding: '2px 0' },
  stepSummary: {
    ...summary,
    gap: 12,
    minHeight: 50,
    WebkitTapHighlightColor: 'transparent',
    opacity: { default: null, ':active': 0.7 },
  },
  num: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    flex: 'none',
    display: 'grid',
    placeItems: 'center',
    fontSize: 'var(--fs-footnote)',
    fontWeight: 700,
    backgroundColor: 'var(--surface-3)',
    color: 'var(--label-2)',
  },
  numDone: { backgroundColor: 'var(--acc)', color: 'var(--on-acc)' },
  stepText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 },
  stepTitle: { fontSize: 'var(--fs-callout)', fontWeight: 600, letterSpacing: '-.012em', lineHeight: 1.25 },
  stepHint: { fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', lineHeight: 1.3 },
  // a finished step's summary reads as a receipt, not a control
  stepHintDone: { color: 'var(--acc-ink)' },
  chev: {
    color: 'var(--label-3)',
    fontSize: '.875rem',
    transition: 'transform .18s ease',
    flex: 'none',
    transform: { default: null, [stylex.when.ancestor('[open]')]: 'rotate(90deg)' },
  },
  stepBody: { padding: '2px 0 14px 38px', paddingLeft: { default: 38, '@media (max-width:380px)': 0 } },

  // a dim explainer that reads like a sentence, not a footnote
  hint: { fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', lineHeight: 1.45, margin: '6px 0 10px' },
  code: { fontSize: 'var(--fs-caption)', backgroundColor: 'var(--surface-2)', padding: '1px 5px', borderRadius: 5 },

  // provider chips grouped under a small heading: clearly idle vs. clearly chosen
  group: { margin: '0 0 12px' },
  groupTitle: {
    fontSize: '.7188rem',
    fontWeight: 600,
    letterSpacing: '.04em',
    textTransform: 'uppercase',
    color: 'var(--label-3)',
    margin: '0 0 7px',
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 38,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'var(--surface-2)',
    border: '1.5px solid transparent',
    color: 'var(--label)',
    fontWeight: 500,
    textTransform: 'none',
    transform: { default: null, ':active': 'scale(.97)' },
  },
  chipOn: { backgroundColor: 'var(--acc-soft)', borderColor: 'var(--acc)', color: 'var(--acc-ink)', fontWeight: 600 },
  chipKey: {
    fontSize: '.6562rem',
    fontWeight: 700,
    letterSpacing: '.02em',
    padding: '1px 6px',
    borderRadius: 999,
    backgroundColor: 'var(--acc-soft)',
    color: 'var(--acc-ink)',
  },
  chipKeyOn: { backgroundColor: 'rgba(0,0,0,.18)', color: 'inherit' },

  // label + control pairs inside a step
  field: { display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 10px' },
  fieldLabel: { fontSize: 'var(--fs-footnote)', fontWeight: 600, color: 'var(--label-2)' },
  // Inside a card the app's default field colour is the card's own colour, so the box was
  // invisible and the placeholder floated in space. One shade up, and a size that is readable
  // without iOS zooming into it.
  input: { width: '100%', backgroundColor: 'var(--surface-2)', fontSize: 'var(--fs-callout)', minHeight: 44 },
  select: {
    width: '100%',
    minHeight: 44,
    padding: '10px 38px 10px 12px',
    borderRadius: 'var(--r)',
    border: 0,
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label)',
    fontSize: 'var(--fs-subhead)',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage:
      'linear-gradient(45deg,transparent 50%,var(--label-2) 50%),linear-gradient(135deg,var(--label-2) 50%,transparent 50%)',
    backgroundPosition: 'calc(100% - 20px) 50%,calc(100% - 14px) 50%',
    backgroundSize: '6px 6px',
    backgroundRepeat: 'no-repeat',
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  actionBtn: { minHeight: 44 },

  // inline result box under the Test button
  result: {
    marginTop: 10,
    padding: '10px 12px',
    borderRadius: 'var(--r)',
    fontSize: '.8438rem',
    lineHeight: 1.45,
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label)',
  },
  resultOk: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--green) 14%,transparent)', 'rgba(48,209,88,0.14)'),
  },
  resultBad: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--red) 14%,transparent)', 'rgba(255,69,58,0.14)'),
  },
  resultTitle: { display: 'block', marginBottom: 2 },

  // advanced / activity folds
  fold: { borderTop: rowLine, marginTop: 4 },
  foldSummary: {
    ...summary,
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 48,
    fontSize: 'var(--fs-subhead)',
    fontWeight: 600,
    letterSpacing: '-.012em',
  },
  foldBody: { padding: '0 0 12px' },

  kv: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '9px 0',
    borderBottom: { default: rowLine, ':last-child': 0 },
    fontSize: '.875rem',
  },
  key: { color: 'var(--label-2)', flex: 'none' },
  value: { textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' },
  // the daily-limit numbers: a real field, not the browser's white default box
  kvInput: {
    width: 84,
    minHeight: 40,
    padding: '6px 10px',
    textAlign: 'right',
    fontSize: 'var(--fs-callout)',
    fontWeight: 600,
    border: 0,
    borderRadius: 10,
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label)',
    outline: 'none',
    MozAppearance: 'textfield',
    appearance: 'textfield',
    boxShadow: { default: null, ':focus': 'inset 0 0 0 2px var(--acc)' },
    '::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
    '::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
  },

  log: { display: 'flex', flexDirection: 'column' },
  logRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    padding: '8px 0',
    borderBottom: { default: rowLine, ':last-child': 0 },
    fontSize: '.8438rem',
  },
  when: { color: 'var(--label-3)', fontSize: 'var(--fs-caption)', flex: 'none' },

  // invite and reset codes, with a copy affordance
  codeChip: {
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    fontWeight: 600,
    letterSpacing: '.08em',
    backgroundColor: 'var(--surface-2)',
    padding: '4px 9px',
    borderRadius: 8,
    fontSize: '.875rem',
  },
  codeBig: { fontSize: 'var(--fs-title2)', width: '100%', padding: '14px 0' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, fontSize: 'var(--fs-body)' },
  empty: { color: 'var(--label-3)', fontSize: '.8438rem', padding: '10px 2px' },

  // the Coach before setup: a pitch, not a form
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '6px 2px 2px' },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    display: 'grid',
    placeItems: 'center',
    fontSize: '1.625rem',
    backgroundImage: stylex.firstThatWorks(
      'linear-gradient(135deg,var(--acc),color-mix(in srgb,var(--acc) 55%,var(--teal)))',
      'linear-gradient(135deg,var(--acc),var(--acc))',
    ),
    color: 'var(--on-acc)',
    marginBottom: 8,
    boxShadow: stylex.firstThatWorks(
      '0 8px 24px -8px color-mix(in srgb,var(--acc) 55%,transparent)',
      '0 8px 24px -8px var(--acc)',
    ),
  },
  heroTitle: { margin: '0 0 4px', fontSize: 'var(--fs-title2)', letterSpacing: '-.022em' },
  heroText: { margin: '0 0 14px', fontSize: '.875rem', lineHeight: 1.5, color: 'var(--label-2)' },
  heroFeats: { display: 'grid', gap: 10, marginBottom: 18 },
  heroFeat: { display: 'flex', gap: 11, alignItems: 'flex-start' },
  heroFeatIcon: { color: 'var(--acc-ink)', fontSize: '1.125rem', flex: 'none', marginTop: 2 },
  heroFeatText: { fontSize: '.8438rem', lineHeight: 1.45, color: 'var(--label-2)' },
  heroFeatTitle: { color: 'var(--label)', fontWeight: 600 },
  heroBtn: { width: '100%' },

  // setup progress
  progress: {
    height: 5,
    borderRadius: 99,
    backgroundColor: 'var(--surface-2)',
    overflow: 'hidden',
    margin: '0 0 10px',
  },
  progressBar: {
    display: 'block',
    height: '100%',
    borderRadius: 99,
    backgroundColor: 'var(--acc)',
    transition: 'width var(--med) var(--ease)',
  },

  // The setup token's risk and the cheap-key tips (AdminCoach.jsx, sub-connect-146).
  risk: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
    margin: '6px 0 10px',
    padding: '10px 12px',
    borderRadius: 10,
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--orange) 14%,transparent)', 'var(--surface-2)'),
    fontSize: 'var(--fs-footnote)',
    lineHeight: 1.45,
    color: 'var(--label)',
  },
  riskIcon: { flex: 'none', color: 'var(--orange)', marginTop: 2 },
  tip: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  tipIcon: { flex: 'none', color: 'var(--yellow)', marginTop: 2 },
  tipLink: { color: 'var(--acc)' },
})

const PILL = { ok: styles.pillOk, warn: styles.pillWarn, bad: styles.pillBad, acc: styles.pillAcc } as const

/** A status pill's styles: `kind` is ok, warn, bad, acc or nothing for the plain grey one. */
export const pill = (kind?: string | null) => [styles.pill, kind ? PILL[kind as keyof typeof PILL] : null] as const
