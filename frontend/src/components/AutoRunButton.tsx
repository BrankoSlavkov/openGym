import type { ReactNode } from 'react'
// Fork: the "Auto" button on a timed exercise's card (lib/auto-run.js). It sits on the plan line,
// at its right: on, the holds of this workout start by themselves, with a 15 s pause between them.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { autoHoldsFor } from '../lib/auto-holds.js'
import { t } from '../lib/i18n.js'
import * as stylex from '@stylexjs/stylex'
import Icon from './Icon.tsx'

const styles = stylex.create({
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  // The plan line inside drops its own 4px (Workout.jsx reads --planline-mb).
  plan: { minWidth: 0, flex: 1, '--planline-mb': '0px' },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    flex: 'none',
    minHeight: 30,
    padding: '4px 12px',
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    backgroundColor: 'var(--acc-soft)',
    color: 'var(--acc-ink)',
    font: 'inherit',
    fontSize: 'var(--fs-footnote)',
    fontWeight: 600,
    cursor: 'pointer',
    opacity: { default: null, ':active': 0.8 },
  },
  on: { backgroundColor: 'var(--acc)', color: 'var(--on-acc)' },
})

export default function AutoRunRow({
  show,
  target,
  children,
}: {
  show: boolean
  target?: { autoHold?: boolean } | null
  children?: ReactNode
}) {
  const S = useStore((s) => s.S)
  const update = useStore((s) => s.update)
  if (!show || !S.active) return children
  const on = autoHoldsFor(S, target)
  const flip = () => {
    if (on) {
      useUI.getState().stopAuto()
      return
    }
    update((s: { active?: { autoRun?: boolean; autoHoldsOff?: boolean } | null }) => {
      if (s.active) {
        s.active.autoRun = true
        delete s.active.autoHoldsOff
      }
    })
    useUI.getState().toast(t('Auto on: start the first hold, the rest run by themselves'))
  }
  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.plan)}>{children}</div>
      <button
        type="button"
        {...stylex.props(styles.btn, on && styles.on)}
        aria-pressed={on}
        title={on ? t('Holds start by themselves. Tap to stop.') : t('Start every hold by itself, 15 s apart')}
        onClick={flip}
      >
        <Icon name="play" />
        {t('Auto')}
      </button>
    </div>
  )
}
