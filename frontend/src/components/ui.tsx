import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  CSSProperties,
  InputHTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import type { NumberFieldProps } from './number-field-props.ts'

type ChoiceValue = string | number | boolean | null
type Option<T extends ChoiceValue> = { value: T; label: ReactNode; icon?: string; subtitle?: ReactNode }
type SearchMeta = { placeholder?: string; label?: string; emptyLabel?: ReactNode }
type Search<T extends ChoiceValue> =
  | (SearchMeta & { match?: (option: Option<T>, query: string) => boolean })
  | (SearchMeta & ((option: Option<T>, query: string) => boolean))
type PickerProps<T extends ChoiceValue> = {
  title?: ReactNode
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  search?: Search<T>
}
type RowProps = {
  icon?: string
  iconTint?: string
  title?: ReactNode
  subtitle?: ReactNode
  value?: ReactNode
  accessory?: 'none' | 'chevron' | 'check'
  onClick?: () => void
  danger?: boolean
  children?: ReactNode
  className?: string
  tour?: string
}
type UIStore = { getState: () => { openSheet: (render: (close: () => void) => ReactNode) => unknown } }
// openGym control set.
//
// Every input in the app is built here rather than styled on top of a native
// widget. Native controls are the single loudest "unfinished" tell: a checkbox
// renders blue on iOS and grey on Android, a range slider paints its own white
// track that no theme reaches, and a <select> opens a system list that ignores
// dark mode entirely. Rebuilding them means one visual language and one focus
// treatment across every platform.
//
// Shared rules:
//   · every control is driven by (value, onChange) — no internal source of truth
//   · hit targets are ≥44px even when the painted control is smaller
//   · :active gives a scale/tint response so touch feels acknowledged
//   · focus-visible draws a ring; pointer interaction never does

import { useRef, useState, useEffect, useLayoutEffect, useCallback, forwardRef } from 'react'
import Icon from './Icon.tsx'
import Button from './Button.tsx'
import Stepper from './Stepper.tsx'
import { sheetKeyboardInsets } from '../lib/use-sheet-keyboard.js'
import { NATIVE_KEYBOARD_EVENT } from '../lib/native-keyboard.js'
import { t, useLang } from '../lib/i18n.js'
import { nameIn } from '../lib/a11y-name.ts'
import { cleanNum } from '../lib/format.js'
import { canonicalNumber, localiseNumber } from '../lib/number-input.js'

/* ============================ text ============================ */

// Width of a numeric string in `ch`, for a field sized to its own digits (NumberField's
// `fit`): with tabular numerals every digit is exactly one ch, a decimal point or comma roughly half.
export const numWidthCh = (s: string) =>
  Math.max(
    1,
    [...s].reduce((n, c) => n + (c === '.' || c === ',' ? 0.5 : 1), 0),
  )

// Numeric input. A text field with a decimal keypad rather than type="number": that one reports
// "" for a comma in half the browsers and locales (value snaps to 0), and iOS decimal keypads in
// many regions only offer a comma. Typing "," or "." both work in every language, and the field
// shows the separator the text beside it uses ("72,5" in German, "72.5" in English), whichever
// key was pressed (lib/number-input.js). What it hands to onChange is a plain number, unchanged.
// Keeps a local string draft while focused so partial input like "33," survives.
// `nullable` is for fields where "nothing entered" and 0 mean different things (RIR: a
// logged 0 is a set taken to failure). Those clear back to null instead of snapping to 0.
// `fit` sizes the field to the digits on screen instead of filling its cell — for the big
// weight read-out, where the unit sits right beside the number.
export function NumberField(props: NumberFieldProps) {
  const {
    value,
    onChange,
    decimal = true,
    nullable = false,
    fit = false,
    step,
    className = '',
    onPaste,
    onKeyDown,
    ...rest
  } = props
  // Re-render on a language switch even under a memoised parent: the separator shown is the language's.
  useLang()
  const [draft, setDraft] = useState<string | null>(null)
  const committed = useRef<number | null>(null)
  // Focus selects the number so typing replaces it. In WebKit (Safari, the iOS app) the release
  // of the tap that focused the field then moves the caret to the finger and drops that
  // selection: 65 typed over 62.5 read 6265.5. The first mouseup after focus keeps its default
  // off; a later tap on the focused field still places the caret to edit one digit.
  const justFocused = useRef(false)
  // A paste arrives whole and may carry thousands separators ("1.234,5"); keystrokes never do.
  const pasted = useRef(false)
  // Dictation and autofill also put a whole number in at once, over a selection too and without
  // a paste event. The browser's own beforeinput says so (React's onBeforeInput is rebuilt from
  // key presses and never sees it). A composing keyboard is left out: it hands over what was
  // typed so far, key by key.
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const el = field.current
    if (!el) return
    const before = (e: InputEvent) => {
      const kind = e.inputType || ''
      if (
        /^insertFrom|^insertReplacementText$/.test(kind) ||
        (kind !== 'insertCompositionText' && !e.isComposing && String(e.data ?? '').length > 1)
      )
        pasted.current = true
    }
    el.addEventListener('beforeinput', before)
    return () => el.removeEventListener('beforeinput', before)
  }, [])
  // Where the caret was when a keystroke got rewritten ("." shown as ","): React puts it at the
  // end of a value it had to change, which is wrong for a separator typed into the middle.
  const caret = useRef<{ el: HTMLInputElement; at: number } | null>(null)
  useLayoutEffect(() => {
    const c = caret.current
    caret.current = null
    if (c && document.activeElement === c.el) {
      try {
        c.el.setSelectionRange(c.at, c.at)
      } catch {
        /* not selectable */
      }
    }
  })
  // null and undefined are the same "empty" here — a nullable field's key is dropped once cleared.
  if (draft !== null && (committed.current ?? null) !== (value ?? null)) {
    setDraft(null)
    committed.current = null
  }
  // Shown clean (lib/format.js cleanNum), so a stored 20.4117 never fills the field; typing replaces it.
  const shown = localiseNumber(draft ?? (typeof value === 'number' ? cleanNum(value, step) : (value ?? '')))
  const commit = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.currentTarget.value
    const kind = (e.nativeEvent as InputEvent)?.inputType || ''
    // In one go: a paste, a drop, or anything that put in more than one character at once
    // (autofill, dictation). Those are read as a written-out number, grouping signs and all.
    const bulk =
      pasted.current || kind === 'insertFromPaste' || kind === 'insertFromDrop' || raw.length - String(shown).length > 1
    pasted.current = false
    const s = canonicalNumber(raw, { bulk })
    const i = s.indexOf('.')
    // A whole-number field keeps what was typed after a separator on screen until blur and
    // counts only the part before it: cutting the separator off at each keystroke read 8.5 as 85.
    const whole = !decimal && i !== -1 ? s.slice(0, i) : s
    const n = whole === '' || whole === '.' ? (nullable ? null : 0) : Math.max(0, parseFloat(whole))
    const next = localiseNumber(s)
    if (next !== raw && next.length === raw.length && typeof e.target.selectionStart === 'number')
      caret.current = { el: e.target, at: e.target.selectionStart }
    committed.current = n
    setDraft(s)
    if (n === null) {
      if (props.nullable) props.onChange(null)
    } else onChange(n)
  }
  return (
    <input
      ref={field}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      className={'num ' + className}
      value={shown}
      // `fit` hugs the digits on screen — a big read-out with its unit sitting right beside
      // it — where the default fills whatever cell the field is in.
      style={fit ? { width: numWidthCh(String(shown)) + 'ch' } : undefined}
      onFocus={(e) => {
        justFocused.current = true
        e.target.select()
      }}
      onMouseUp={(e) => {
        if (justFocused.current) {
          justFocused.current = false
          e.preventDefault()
        }
      }}
      onPaste={(e) => {
        pasted.current = true
        onPaste?.(e)
      }}
      // A paste that changed nothing (the same number again, an empty clipboard) fires no change, so
      // its mark would wait for the next keystroke and read that one as a paste. A key press clears it;
      // the key of a real paste comes before the paste itself.
      onKeyDown={(e) => {
        pasted.current = false
        onKeyDown?.(e)
      }}
      onChange={commit}
      onBlur={() => {
        setDraft(null)
        committed.current = null
        justFocused.current = false
        pasted.current = false
      }}
      {...rest}
    />
  )
}

// forwardRef so callers can focus it or read its value imperatively
export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={'field ' + className} {...rest} />
})

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={'field area ' + className} {...rest} />
}

export const SearchField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }
>(function SearchField({ value, onChange, onClear, ...rest }, ref) {
  return (
    <div className="searchf">
      <Icon name="magnifier" className="lead" />
      <input ref={ref} className="field" value={value} onChange={onChange} {...rest} />
      {!!value && (
        /* type="button": inside a form the first button is what Enter presses, and that must be
           the form's own Search, not this (the gym map's search cleared itself on Enter). */
        <button type="button" className="clear" onClick={onClear} aria-label={t('Clear')}>
          <Icon name="xmark" />
        </button>
      )}
    </div>
  )
})

/* ============================ switch ============================ */

export function Switch({
  checked,
  onChange,
  disabled,
  ...accessibility
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked?: boolean
  onChange: (checked: boolean) => void
}) {
  // A switch nobody named takes the title of the list row it sits in: without it a screen reader
  // said only "switch, on" for about fifty of them. A caller's own aria-label always wins.
  const ref = useRef<HTMLButtonElement>(null)
  const named = !!(accessibility['aria-label'] || accessibility['aria-labelledby'])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || named) return
    const name = el.closest('.lrow')?.querySelector('.lrow-t')?.textContent?.trim()
    if (name) el.setAttribute('aria-label', name)
  })
  return (
    <button
      ref={ref}
      {...accessibility}
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      className={'sw' + (checked ? ' on' : '')}
      onClick={() => onChange(!checked)}
    >
      <span className="knob" />
    </button>
  )
}

/* ============================ segmented ============================ */

// options: [{ value, label, icon? }]  — the selected pill slides between cells.
// `tour`: the app tour's anchor for this control (data-tour, lib/tour.js); likewise below.
// `ariaLabelledby` names the choice for a screen reader by its visible label (a group of
// pressed buttons otherwise reads as three loose words).
// `of` names the card a segmented control belongs to, for a screen reader: Stats has a "1M / 3M /
// 1Y / All" on five cards, and each button then says whose it is, "Body weight: 1M" (P4).
export function Segmented<T extends ChoiceValue>({
  options,
  value,
  onChange,
  className = '',
  tour,
  ariaLabelledby,
  of,
}: Omit<PickerProps<T>, 'title' | 'search'> & {
  className?: string
  tour?: string
  ariaLabelledby?: string
  of?: string
}) {
  const i = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  return (
    <div
      className={'seg ' + className}
      style={{ '--n': options.length, '--i': i } as CSSProperties}
      data-tour={tour}
      role={ariaLabelledby ? 'group' : undefined}
      aria-labelledby={ariaLabelledby}
    >
      <span className="seg-sel" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={o.value === value ? 'on' : ''}
          aria-pressed={o.value === value}
          aria-label={of && typeof o.label === 'string' && o.label ? nameIn(of, o.label) : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <Icon name={o.icon} />}
          {o.label && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  )
}

/* ============================ stepper ============================ */

// `min` and `max` hold for the buttons at once, but for typing only once the field is left:
// clamped on every keystroke, a field emptied to type a new number snapped to the minimum, and
// the digits typed next landed after it (a 48 retyped as 75 saved 175).
export { default as Stepper } from './Stepper.tsx'

/* ============================ slider ============================ */

// Pointer-driven so the fill, track and thumb are all ours — no ::-webkit-*
// pseudo-elements, which is the only way the control looks identical on every
// platform and can pick up the accent colour.
export const SLIDER_GRAB_PX = 22
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onEnd,
  className = '',
  disabled = false,
  ariaLabel,
  ariaValueText,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  onEnd?: () => void
  className?: string
  disabled?: boolean
  ariaLabel?: string
  ariaValueText?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState(false)
  // Grabbing the knob drags it relative to where the finger landed; a finger
  // is ~22px wide, so a touch that far off still means "the knob", not "jump".
  const offset = useRef(0)
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  const posToValue = useCallback(
    (clientX: number) => {
      const el = ref.current
      if (!el) return value
      const r = el.getBoundingClientRect()
      // The fraction is read from the physical left edge, then mirrored in RTL where the
      // minimum sits at the inline-start (right) end of the track.
      let f = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
      if (document.documentElement.dir === 'rtl') f = 1 - f
      const raw = min + f * (max - min)
      const snapped = Math.round(raw / step) * step
      // step can be fractional (0.1) — round away binary noise
      return Math.min(max, Math.max(min, Math.round(snapped * 1000) / 1000))
    },
    [min, max, step, value],
  )

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      e.preventDefault()
      onChange(posToValue(e.clientX - offset.current))
    }
    const up = () => {
      setDrag(false)
      onEnd?.()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag, onChange, onEnd, posToValue])

  const key = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    // The arrow pointing at the inline-end (max) end still increases; in RTL that is Left.
    const inc = document.documentElement.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const dec = document.documentElement.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const d = e.key === inc || e.key === 'ArrowUp' ? step : e.key === dec || e.key === 'ArrowDown' ? -step : 0
    if (!d) return
    e.preventDefault()
    onChange(Math.min(max, Math.max(min, Math.round((value + d) * 1000) / 1000)))
    onEnd?.()
  }

  return (
    <div
      ref={ref}
      className={'sld' + (drag ? ' dragging' : '') + ' ' + className}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={ariaLabel}
      aria-valuetext={ariaValueText}
      aria-disabled={disabled}
      data-nodrag /* keeps the sheet from swipe-dismissing */
      onKeyDown={key}
      onPointerDown={(e) => {
        if (disabled) return
        e.currentTarget.setPointerCapture?.(e.pointerId)
        const r = e.currentTarget.getBoundingClientRect()
        // The knob is measured from inline-start: left in LTR, right in RTL.
        const knobX =
          document.documentElement.dir === 'rtl' ? r.right - (pct / 100) * r.width : r.left + (pct / 100) * r.width
        const d = e.clientX - knobX
        offset.current = Math.abs(d) <= SLIDER_GRAB_PX ? d : 0
        setDrag(true)
        if (!offset.current) onChange(posToValue(e.clientX))
      }}
    >
      <span className="sld-track">
        <span className="sld-fill" style={{ width: pct + '%' }} />
      </span>
      <span className="sld-knob" style={{ insetInlineStart: pct + '%' }} />
    </div>
  )
}

/* ============================ checkbox ============================ */

export function Check({
  checked,
  onChange,
  className = '',
  size,
  label,
  tour,
}: {
  checked?: boolean
  onChange: (checked: boolean) => void
  className?: string
  size?: CSSProperties['width']
  label?: string
  tour?: string
}) {
  return (
    <button
      data-tour={tour}
      role="checkbox"
      aria-checked={!!checked}
      aria-label={label}
      className={'chk' + (checked ? ' on' : '') + ' ' + className}
      style={size ? { width: size, height: size } : undefined}
      onClick={() => onChange(!checked)}
    >
      <Icon name="check" />
    </button>
  )
}

/* ============================ grouped list ============================ */

// The inset-grouped list is the app's main structural primitive: a titled
// section holding rows separated by hairlines that stop short of the leading
// edge, so the icon column reads as a continuous rail.
export function Section({
  title,
  footer,
  children,
  className = '',
  tour,
}: {
  title?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
  tour?: string
}) {
  return (
    <section className={'sect ' + className} data-tour={tour}>
      {title && <h2 className="sect-t">{title}</h2>}
      <div className="sect-b">{children}</div>
      {footer && <p className="sect-f">{footer}</p>}
    </section>
  )
}

/** How long a value may be and still sit beside a row's title and subtitle on a phone. */
export const VALUE_BESIDE_MAX = 14

export function Row({
  icon,
  iconTint,
  title,
  subtitle,
  value,
  accessory = 'none',
  onClick,
  danger,
  children,
  className = '',
  tour,
}: RowProps) {
  const Tag = onClick ? 'button' : 'div'
  // A worded value on a row that also has a subtitle ("Wie die Arbeitssätze" beside "Pause vor der
  // nächsten Übung") leaves the title a column a word wide on a phone: it goes under the text
  // there instead (index.css .lrow-vlong). Numbers and short words stay beside the title.
  const vlong = icon && subtitle && !children && typeof value === 'string' && value.length > VALUE_BESIDE_MAX
  return (
    <Tag
      className={
        'lrow' + (onClick ? ' tap' : '') + (danger ? ' danger' : '') + (vlong ? ' lrow-vlong' : '') + ' ' + className
      }
      onClick={onClick}
      data-tour={tour}
    >
      {icon && (
        <span className="lrow-i" style={iconTint ? ({ '--tint': iconTint } as CSSProperties) : undefined}>
          <Icon name={icon} />
        </span>
      )}
      <span className="lrow-m">
        <span className="lrow-t">{title}</span>
        {subtitle && <span className="lrow-s">{subtitle}</span>}
      </span>
      {children}
      {value != null && <span className="lrow-v">{value}</span>}
      {accessory === 'chevron' && <Icon name="chevronRight" className="lrow-c" />}
      {accessory === 'check' && <Icon name="check" className="lrow-k" />}
    </Tag>
  )
}

/* ============================ picker ============================ */

// Replaces <select>. A native select opens a system list that ignores the app's
// theme entirely — on dark mode it flashes a white sheet — and can't show more
// than a bare label per option. This opens our own sheet with a checkmark on the
// current value, which is also how iOS itself handles a long option list.
export function SelectRow<T extends ChoiceValue>({
  icon,
  iconTint,
  title,
  value,
  options,
  onChange,
  sheetTitle,
  stackedValue = false,
  search,
}: PickerProps<T> & { icon?: string; iconTint?: string; sheetTitle?: ReactNode; stackedValue?: boolean }) {
  const cur = options.find((o) => o.value === value)
  const open = () => {
    const { openSheet } = require_ui()
    const h = openSheet((close) => (
      <SelectSheet
        title={sheetTitle || title}
        value={value}
        options={options}
        onChange={onChange}
        search={search}
        close={close}
      />
    ))
    return h
  }
  return (
    <Row
      icon={icon}
      iconTint={iconTint}
      title={title}
      value={cur ? cur.label : value}
      accessory="chevron"
      onClick={open}
      className={stackedValue ? 'lrow-stack-value' : ''}
    />
  )
}

/** The picker sheet of SelectRow on its own, for a control that is not a row (Stats' menu buttons). */
export function openSelectSheet<T extends ChoiceValue>({ title, value, options, onChange, search }: PickerProps<T>) {
  const { openSheet } = require_ui()
  return openSheet((close) => (
    <SelectSheet title={title} value={value} options={options} onChange={onChange} search={search} close={close} />
  ))
}

/**
 * A compact button that names the current choice and opens the picker sheet: for a choice that
 * would overflow a segmented control (Stats: the chart of an exercise, the muscles' period).
 * The accessible name says what is chosen for what ("Period: Week").
 */
export function MenuButton<T extends ChoiceValue>({
  title,
  value,
  options,
  onChange,
  className = '',
}: PickerProps<T> & { className?: string }) {
  const cur = options.find((o) => o.value === value) || options[0]
  return (
    <Button
      size="sm"
      trailingIcon="chevronDown"
      className={'menu-btn' + (className ? ' ' + className : '')}
      aria-haspopup="dialog"
      aria-label={title + ': ' + (cur?.label ?? '')}
      onClick={() => openSelectSheet({ title, value, options, onChange })}
    >
      {cur?.label}
    </Button>
  )
}

function SelectSheet<T extends ChoiceValue>({
  title,
  value,
  options,
  onChange,
  search,
  close,
}: PickerProps<T> & { close: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const firstVisibleRef = useRef<HTMLButtonElement>(null)
  const syncPickerViewport = useCallback(() => {
    const input = inputRef.current
    const sheet = input?.closest<HTMLElement>('.sheet')
    const viewport = window.visualViewport
    if (!sheet || !viewport) return
    // the visual viewport, or on Android 15 the keyboard the app passes (lib/native-keyboard.js)
    const { bottomInset, visualHeight } = sheetKeyboardInsets(window)
    sheet.style.setProperty('--picker-keyboard-bottom', `${bottomInset}px`)
    sheet.style.setProperty('--picker-visual-height', `${visualHeight}px`)
  }, [])
  const matcher = typeof search === 'function' ? search : search?.match
  const visible = matcher ? options.filter((o) => matcher(o, query)) : options

  useEffect(() => {
    if (!search) return
    const viewport = window.visualViewport
    if (!viewport) return
    const sync = () => syncPickerViewport()
    sync()
    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)
    window.addEventListener(NATIVE_KEYBOARD_EVENT, sync)
    return () => {
      viewport.removeEventListener('resize', sync)
      viewport.removeEventListener('scroll', sync)
      window.removeEventListener(NATIVE_KEYBOARD_EVENT, sync)
      const sheet = inputRef.current?.closest<HTMLElement>('.sheet')
      sheet?.style.removeProperty('--picker-keyboard-bottom')
      sheet?.style.removeProperty('--picker-visual-height')
    }
  }, [search, syncPickerViewport])

  // Filtering can leave the first result underneath the mobile keyboard. Keep the
  // correction local to the sheet instead of letting focus/scrollIntoView move the page.
  useEffect(() => {
    if (!query.trim() || !visible.length) return
    const input = inputRef.current
    if (!input || document.activeElement !== input) return
    const schedule = (callback: FrameRequestCallback) =>
      window.requestAnimationFrame ? window.requestAnimationFrame(callback) : window.setTimeout(callback, 0)
    const cancel = (frame: number) =>
      window.cancelAnimationFrame ? window.cancelAnimationFrame(frame) : window.clearTimeout(frame)
    const frame = schedule(() => {
      if (document.activeElement !== input) return
      const option = firstVisibleRef.current
      const sheet = option?.closest<HTMLElement>('.sheet')
      if (!option || !sheet) return
      const viewport = window.visualViewport
      const visualBottom = viewport ? (viewport.offsetTop || 0) + viewport.height : window.innerHeight
      const sheetBottom = sheet.getBoundingClientRect().bottom || visualBottom
      const hiddenBy = option.getBoundingClientRect().bottom - Math.min(visualBottom, sheetBottom) + 8
      if (hiddenBy <= 0) return
      const maxScroll = Math.max(0, sheet.scrollHeight - sheet.clientHeight)
      const nextScroll = Math.min(maxScroll, Math.max(0, sheet.scrollTop + hiddenBy))
      if (nextScroll !== sheet.scrollTop) sheet.scrollTop = nextScroll
    })
    return () => cancel(frame)
  }, [query, visible.length])

  return (
    <>
      <h3>{title}</h3>
      {search && (
        <div className="picker-search">
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onInput={(e) => setQuery(e.currentTarget.value)}
            onClear={() => setQuery('')}
            onFocus={syncPickerViewport}
            ref={inputRef}
            placeholder={search.placeholder}
            aria-label={search.label || search.placeholder}
          />
        </div>
      )}
      <div className="sect-b">
        {visible.map((o, index) => (
          <button
            key={String(o.value)}
            ref={index === 0 ? firstVisibleRef : undefined}
            className="lrow tap"
            onClick={() => {
              close()
              onChange(o.value)
            }}
          >
            <span className="lrow-m">
              <span className="lrow-t">{o.label}</span>
              {o.subtitle && <span className="lrow-s">{o.subtitle}</span>}
            </span>
            {o.value === value && <Icon name="check" className="lrow-k" />}
          </button>
        ))}
        {!visible.length && search && (
          <div className="empty">
            <div className="ico">
              <Icon name="magnifier" />
            </div>
            {search.emptyLabel}
          </div>
        )}
      </div>
      <div style={{ height: 8 }} />
    </>
  )
}

/** Multi-select row for additive exercise metadata. The sheet mirrors selection locally so
 * each tap updates its checkmark immediately while the caller persists the value. */
export function MultiSelectRow<T extends ChoiceValue>({
  icon,
  iconTint,
  title,
  values,
  options,
  onToggle,
  sheetTitle,
  noneLabel,
  doneLabel,
}: {
  icon?: string
  iconTint?: string
  title?: ReactNode
  values: T[]
  options: Option<T>[]
  onToggle: (value: T) => void
  sheetTitle?: ReactNode
  noneLabel?: string
  doneLabel?: ReactNode
}) {
  const selected = options.filter((o) => values.includes(o.value))
  const summary = selected.length ? selected.map((o) => o.label).join(', ') : noneLabel || ''
  const open = () => {
    const { openSheet } = require_ui()
    openSheet((close) => (
      <MultiSelectSheet
        values={values}
        options={options}
        onToggle={onToggle}
        title={sheetTitle || title}
        doneLabel={doneLabel}
        close={close}
      />
    ))
  }
  return <Row icon={icon} iconTint={iconTint} title={title} value={summary} accessory="chevron" onClick={open} />
}

function MultiSelectSheet<T extends ChoiceValue>({
  values,
  options,
  onToggle,
  title,
  doneLabel,
  close,
}: {
  values: T[]
  options: Option<T>[]
  onToggle: (value: T) => void
  title?: ReactNode
  doneLabel?: ReactNode
  close: () => void
}) {
  const [sel, setSel] = useState(values)
  const toggle = (value: T) => {
    setSel((current) => (current.includes(value) ? current.filter((x) => x !== value) : [...current, value]))
    onToggle(value)
  }
  return (
    <>
      <h3>{title}</h3>
      <div className="sect-b">
        {options.map((o) => {
          const on = sel.includes(o.value)
          return (
            <button key={String(o.value)} className={'lrow tap' + (on ? ' on' : '')} onClick={() => toggle(o.value)}>
              <span className="lrow-m">
                <span className="lrow-t">{o.label}</span>
                {o.subtitle && <span className="lrow-s">{o.subtitle}</span>}
              </span>
              {on && <Icon name="check" className="lrow-k" />}
            </button>
          )
        })}
      </div>
      <div style={{ height: 8 }} />
      <Button variant="primary" onClick={close}>
        {doneLabel || 'Done'}
      </Button>
    </>
  )
}

// Late import keeps this module free of a cycle at load time (useUI pulls in the
// store, which pulls in helpers that import controls).
let _ui: UIStore | null = null
export function bindUI(store: UIStore) {
  _ui = store
}
function require_ui() {
  if (!_ui) throw new Error('ui store not bound — call bindUI(useUI) once at boot')
  return _ui.getState()
}

/* ============================ buttons ============================ */

export { default as Button } from './Button.tsx'
