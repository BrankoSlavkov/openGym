import type { ReactNode } from 'react'
// Fork: the "Auto" button on a timed exercise's card (lib/auto-run.js). It sits on the plan line,
// at its right: on, the holds of this workout start by themselves, with a 15 s pause between them.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { autoHoldsFor } from '../lib/auto-holds.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.tsx'
import './AutoRunButton.css'

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
    <div className="autorun-row">
      <div className="autorun-plan">{children}</div>
      <button
        type="button"
        className={'autorun-btn' + (on ? ' on' : '')}
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
