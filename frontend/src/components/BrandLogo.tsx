// The openGym logo, as in assets/logo: the mark (five plain rectangles on a 352×174 grid, square
// corners, brand green) and the lockup (mark, then "open" plus "Gym" in brand green). Brand colours,
// not the accent: the accent is the user's, the logo is not. Never mirrored in RTL.

import type { CSSProperties, ElementType } from 'react'
import * as stylex from '@stylexjs/stylex'

interface BrandMarkProps {
  height?: number
  color?: string
  className?: string
  style?: CSSProperties
}
interface BrandLogoProps {
  size?: number
  as?: ElementType
  className?: string
  style?: CSSProperties
}

const styles = stylex.create({
  mark: { flex: 'none' },
  lockup: {
    display: 'inline-block',
    fontWeight: 700,
    letterSpacing: '-.036em',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    unicodeBidi: 'isolate',
    direction: 'ltr',
  },
  lockupMark: {
    display: 'inline-block',
    height: '1.07em',
    width: 'calc(1.07em * 352 / 174)',
    verticalAlign: '-.175em',
    marginInlineEnd: '.2em',
    fill: '#a3e635',
  },
  open: { color: 'var(--brand-lockup-open, #eef1f6)' },
  gym: { color: '#a3e635' },
})

const RECTS = [
  [80, 242, 352, 28],
  [80, 199, 36, 114],
  [131, 169, 47, 174],
  [334, 169, 47, 174],
  [396, 199, 36, 114],
]

/** The mark alone, `height` px high (width follows, 352:174). `color` only for a one-colour use. */
export function BrandMark({ height = 24, color = '#a3e635', className, style }: BrandMarkProps) {
  return (
    <svg
      className={[stylex.props(styles.mark).className, className].filter(Boolean).join(' ')}
      viewBox="80 169 352 174"
      width={(height * 352) / 174}
      height={height}
      fill={color}
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {RECTS.map(([x, y, w, h]) => (
        <rect key={x + '-' + y} x={x} y={y} width={w} height={h} />
      ))}
    </svg>
  )
}

/**
 * The lockup at `size` px type: mark 1.07× the type high, a gap of 0.2×, the mark's middle at
 * 0.36× above the baseline (opengym-logo-dark.svg). "open" follows the theme.
 */
export default function BrandLogo({ size = 34, as: Tag = 'span', className = '', style }: BrandLogoProps) {
  return (
    <Tag
      className={[stylex.props(styles.lockup).className, className].filter(Boolean).join(' ')}
      dir="ltr"
      style={{ fontSize: size, ...style }}
    >
      <svg {...stylex.props(styles.lockupMark)} viewBox="80 169 352 174" aria-hidden="true" focusable="false">
        {RECTS.map(([x, y, w, h]) => (
          <rect key={x + '-' + y} x={x} y={y} width={w} height={h} />
        ))}
      </svg>
      <span {...stylex.props(styles.open)}>open</span>
      <span {...stylex.props(styles.gym)}>Gym</span>
    </Tag>
  )
}
