// Fork: the app tour's styles (was Tour.css). Over the sheets (100), under the toast (200), so a
// toast the practice workout raises still shows. Class names left on the elements in Tour.jsx
// (tour, tour-card, tour-block...) are hooks for the tour's own code and tests, not styles.
import * as stylex from '@stylexjs/stylex'

const move = 'top .25s ease,left .25s ease,width .25s ease,height .25s ease'
const reduced = '@media (prefers-reduced-motion:reduce)'
const short = '@media (max-height:680px)'

export const styles = stylex.create({
  root: { position: 'fixed', inset: 0, zIndex: 150, pointerEvents: 'none' },
  block: { position: 'fixed', pointerEvents: 'auto', backgroundColor: 'transparent' },
  dim: { inset: 0, backgroundColor: 'rgba(0,0,0,.55)' },
  // The spotlight: a hole whose shadow is the dimmed screen. Moves to the next element unless the
  // system asks for less motion (Tour.jsx sets transition:none then).
  hole: {
    position: 'fixed',
    borderRadius: 14,
    boxShadow: '0 0 0 200vmax rgba(0,0,0,.55)',
    outline: '2px solid var(--acc)',
    outlineOffset: 0,
    transition: { default: move, [reduced]: 'none' },
    pointerEvents: 'none',
  },
  card: {
    position: 'fixed',
    pointerEvents: 'auto',
    width: 'min(340px,calc(100vw - 32px))',
    boxSizing: 'border-box',
    maxHeight: 'calc(100dvh - 32px)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    padding: '14px 16px 12px',
    borderRadius: 'var(--r-xl,18px)',
    backgroundColor: 'var(--surface-raised,var(--surface))',
    color: 'var(--label)',
    // a raised surface (P11): lighter than the cards under the dim, edged with a hairline of light
    boxShadow: 'inset 0 0 0 var(--hair,.5px) var(--raised-line,transparent),0 16px 48px -12px rgba(0,0,0,.55)',
    transition: { default: 'top .25s ease,left .25s ease', [reduced]: 'none' },
    outline: 'none',
  },
  // The card's notch is its own box, so the card can scroll without clipping it; with one, it doesn't.
  cardWithArrow: { overflowX: 'visible', overflowY: 'visible' },
  center: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
  // A stop that hands the screen over (a sheet to use): no dimmer, a ring and a slim bar at the
  // top, or at the bottom when the sheet reaches that high.
  bar: {
    top: 'calc(var(--sat,0px) + 10px)',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(420px,calc(100vw - 24px))',
    padding: '10px 14px 10px',
    boxShadow: '0 10px 32px -8px rgba(0,0,0,.6)',
    border: '1px solid var(--sep,transparent)',
  },
  atBottom: { top: 'auto', bottom: 'calc(var(--sab,0px) + 10px)' },
  h2: {
    margin: '2px 0 6px',
    fontSize: '1.125rem',
    fontWeight: 700,
    letterSpacing: '-.02em',
    textTransform: 'none',
    color: 'var(--label)',
  },
  // The tour question under the choice: one step down, a hairline above it, so the card reads as
  // two questions in order rather than one long one.
  q2: { fontSize: 'var(--fs-callout)', paddingTop: 12, borderTop: 'var(--hair,.5px) solid var(--sep,transparent)' },
  barH2: { fontSize: 'var(--fs-callout)', margin: '0 0 2px' },
  p: { margin: '0 0 12px', fontSize: 'var(--fs-subhead)', lineHeight: 1.45, color: 'var(--label-2,var(--label))' },
  pickFoot: { fontSize: 'var(--fs-footnote)', color: 'var(--label-dim,var(--label-2))', margin: '0 0 14px' },
  barP: { fontSize: '.875rem', margin: '0 0 8px' },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 22 },
  count: {
    fontSize: 'var(--fs-caption)',
    fontWeight: 600,
    color: 'var(--label-3,var(--label))',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  skip: {
    background: 'none',
    border: 0,
    padding: '4px 0',
    font: 'inherit',
    fontSize: 'var(--fs-footnote)',
    color: 'var(--acc-ink)',
    cursor: 'pointer',
    textAlign: 'end',
  },
  acts: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  act: { flex: '1 1 0', minWidth: 0 },
  sr: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
  // The card's point: a little notch toward the spotlight, at the hole's middle (Tour.jsx).
  arrow: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    backgroundColor: 'var(--surface-raised,var(--surface))',
    transform: 'rotate(45deg)',
    pointerEvents: 'none',
  },
  below: { top: -6 },
  above: { bottom: -6 },
  // The closing card's tutorials: rows, like Settings.
  list: { display: 'flex', flexDirection: 'column', gap: { default: 6, [short]: 5 }, margin: '0 0 12px' },
  presets: { marginBottom: 8 },
  tut: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: { default: '10px 12px', [short]: '9px 12px' },
    border: 0,
    borderRadius: 12,
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label)',
    font: 'inherit',
    textAlign: 'start',
    cursor: 'pointer',
    outline: { default: null, ':focus-visible': '2px solid var(--acc)' },
    outlineOffset: { default: null, ':focus-visible': 2 },
  },
  tutIcon: {
    flex: 'none',
    color: 'var(--label-3,var(--label))',
    fontSize: '.875rem',
    transform: { default: null, ':dir(rtl)': 'scaleX(-1)' },
  },
  tutText: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 },
  tutTitle: { fontSize: 'var(--fs-subhead)', fontWeight: 600 },
  // A short screen (320 x 568): the tutorials go to one line each, so the buttons stay in sight.
  tutSub: {
    fontSize: 'var(--fs-footnote)',
    color: 'var(--label-2,var(--label))',
    lineHeight: 1.35,
    display: { default: null, [short]: 'none' },
  },
  // The first card's choice of modules: the same rows, one of them chosen, with a ring and a check
  // in the readable accent so it never rests on colour alone. On the raised card the rows' fill
  // can match it, so each row carries a hairline edge; the chosen one trades it for the ring.
  pick: {
    minHeight: 44,
    boxShadow: 'inset 0 0 0 1px var(--sep,rgba(84,84,88,.6))',
    transition: 'background-color var(--fast,.14s) var(--ease,ease),box-shadow var(--fast,.14s) var(--ease,ease)',
    backgroundColor: { default: 'var(--surface-2)', ':active': 'var(--surface-3)' },
  },
  picked: { boxShadow: 'inset 0 0 0 2px var(--acc-ink,var(--acc))' },
  pickCheck: { visibility: 'hidden', color: 'var(--acc-ink,var(--acc))', fontSize: 'var(--fs-subhead)' },
  pickCheckOn: { visibility: 'visible' },
  ring: {
    position: 'fixed',
    borderRadius: 14,
    outline: '2px solid var(--acc)',
    boxShadow: '0 0 0 4px rgba(0,0,0,.18)',
    pointerEvents: 'none',
    transition: { default: move, [reduced]: 'none' },
  },
})
