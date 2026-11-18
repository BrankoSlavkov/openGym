import { useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Icon from './Icon.tsx'
import { NumberField } from './ui.tsx'
import { cleanNum } from '../lib/format.js'
import { nameIn } from '../lib/a11y-name.ts'
import { t } from '../lib/i18n.js'

type StepperProps = {
  value: number | string | null
  step?: number
  min?: number
  max?: number
  onChange: (value: number) => void
  decimal?: boolean
  className?: string
  /** Class names for the labelled wrapper, the label and the number field (StyleX from a container). */
  wrapClassName?: string
  labelClassName?: string
  numClassName?: string
  label?: ReactNode
  unit?: ReactNode
  invalid?: boolean
  disabled?: boolean
  onStep?: (value: number, step: number, direction: number) => number
  ariaLabel?: string
  display?: ReactNode
  of?: string
}

export default function Stepper({
  value,
  step = 1,
  min = 0,
  max = Infinity,
  onChange,
  decimal = true,
  className = '',
  wrapClassName = '',
  labelClassName = '',
  numClassName = '',
  label,
  unit,
  invalid = false,
  disabled = false,
  onStep,
  ariaLabel,
  display,
  of,
}: StepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const set = (v: number) => onChange(clamp(Math.round((v || 0) * 100) / 100))
  // Holding a button repeats the step; the latest value/step live in a ref so
  // the interval doesn't keep stepping from the value it was started with.
  const live = useRef({ value, step, set })
  live.current = { value, step, set }
  const hold = useRef<{ delay: number | null; tick: number | null; count: number; repeated: boolean }>({
    delay: null,
    tick: null,
    count: 0,
    repeated: false,
  })
  // From the number on screen (cleanNum), not a stored 44.996 behind it.
  const bump = (dir: number) => {
    const { value, step, set } = live.current
    const v = cleanNum(Number(value) || 0, step)
    set(onStep ? onStep(v, step, dir) : v + dir * step)
  }
  const stopHold = () => {
    const h = hold.current
    if (h.delay != null) window.clearTimeout(h.delay)
    if (h.tick != null) window.clearInterval(h.tick)
    h.delay = h.tick = null
  }
  const startHold = (dir: number) => {
    stopHold()
    const h = hold.current
    h.repeated = false
    h.count = 0
    h.delay = window.setTimeout(() => {
      const run = () => {
        h.repeated = true
        h.count++
        bump(dir)
        // modest acceleration after a bit of holding so a long hold covers ground
        if (h.count === 15) {
          if (h.tick != null) window.clearInterval(h.tick)
          h.tick = window.setInterval(run, 40)
        }
      }
      h.tick = window.setInterval(run, 80)
    }, 400)
  }
  // The click that follows pointerup must not add a step once the hold repeated.
  const click = (dir: number) => {
    if (hold.current.repeated) {
      hold.current.repeated = false
      return
    }
    bump(dir)
  }
  useEffect(() => stopHold, [])
  const holdProps = (dir: number): ButtonHTMLAttributes<HTMLButtonElement> => ({
    onPointerDown: (e) => {
      if (e.button === 0 || e.button == null) startHold(dir)
    },
    onPointerUp: stopHold,
    onPointerCancel: stopHold,
    onPointerLeave: stopHold,
    onBlur: stopHold,
    onClick: () => click(dir),
  })
  // Without an ariaLabel the − and + take the stepper's own label ("Sets: Decrease"), so a sheet
  // with three steppers has no three buttons all called "Decrease" (P4, lib/a11y-name.ts). `of`
  // is the row a stepper sits in when a list repeats it: "Set 2: Rest (s)", "Set 2: Rest (s): Decrease".
  const own = nameIn(of, typeof label === 'string' ? label : '')
  const inner = (
    <div className={'stp ' + className}>
      <button
        {...holdProps(-1)}
        aria-label={ariaLabel ? `${t('Decrease')} ${ariaLabel}` : nameIn(own, t('Decrease'))}
        disabled={disabled}
      >
        <Icon name="minus" />
      </button>
      <span
        className="val"
        onBlur={() => {
          const v = Number(value) || 0
          if (clamp(v) !== v) onChange(clamp(v))
        }}
      >
        {/* `display`: a word instead of the number at a special value ("Bar" for an empty bar), the
            +/- still step from `value`. */}
        {display != null ? (
          <span className="stp-word">{display}</span>
        ) : (
          <NumberField
            value={value}
            decimal={decimal}
            step={step}
            className={numClassName}
            onChange={onChange}
            disabled={disabled}
            aria-invalid={invalid ? 'true' : undefined}
            aria-label={ariaLabel || own || undefined}
          />
        )}
        {display == null && unit && <i>{unit}</i>}
      </span>
      <button
        {...holdProps(1)}
        aria-label={ariaLabel ? `${t('Increase')} ${ariaLabel}` : nameIn(own, t('Increase'))}
        disabled={disabled}
      >
        <Icon name="plus" />
      </button>
    </div>
  )
  if (!label) return inner
  return (
    <div className={'stp-w ' + wrapClassName}>
      <span className={'stp-l ' + labelClassName}>{label}</span>
      {inner}
    </div>
  )
}
