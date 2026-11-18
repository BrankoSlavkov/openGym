// Fork: StyleX migration helpers. `sx(legacy, ...styles)` gives the props of StyleX styles with
// plain class names in front of them, for elements that still wear a shared index.css class (or
// a class a test or a selector elsewhere looks for) while their own look moves into StyleX.
import * as stylex from '@stylexjs/stylex'
import type { StyleXStyles } from '@stylexjs/stylex'

type Legacy = string | false | null | undefined
type Style = StyleXStyles | false | null | undefined

export function sx(
  legacy: Legacy | Legacy[],
  ...styles: Style[]
): { className: string; style?: Record<string, string | number> } {
  const props = stylex.props(...styles)
  const names = (Array.isArray(legacy) ? legacy : [legacy]).filter(Boolean)
  if (props.className) names.push(props.className)
  return props.style
    ? { className: names.join(' '), style: props.style as Record<string, string | number> }
    : { className: names.join(' ') }
}

/** Class names joined, falsy ones left out. */
export const cx = (...names: Legacy[]): string => names.filter(Boolean).join(' ')
