// Focus mode ran off the right edge of the phone (#655): nine sets put nine 44 px dots under the
// card, and a grid column grows to its widest child, so the dots (and a long exercise name)
// pushed the card past the screen. Checked in Chrome at 412 px: the card
// ended at 548 px before, inside the 16 px gutter after.
// Fork: the styles are StyleX (FocusView.styles.ts); this reads their source.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(process.cwd(), 'src/views/FocusView.styles.ts'), 'utf8').replace(/\/\/.*$/gm, '')
// One style's body: from `name: {` to its closing brace at the same depth.
const style = name => {
  const at = src.search(new RegExp('\\n\\s+' + name + ': \\{'))
  if (at < 0) return ''
  let i = src.indexOf('{', at), depth = 0
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1)
  }
  return ''
}

describe('Focus mode stays on the screen (#655)', () => {
  it('keeps its one column no wider than the screen', () => {
    expect(style('view')).toMatch(/gridTemplateColumns: 'minmax\(0,1fr\)'/)
    expect(style('pager')).toMatch(/gridTemplateColumns: '44px minmax\(0,1fr\) 44px'/)
  })

  it('squeezes and then wraps the set dots', () => {
    expect(style('dots')).toMatch(/flexWrap: 'wrap'/)
    const dot = style('dot')
    // a wrapping row breaks at the basis, before anything shrinks: the basis is the floor, and the
    // dots grow back to 44px (in Chrome at 320px a 44px basis put four sets on two rows)
    expect(dot).toMatch(/flex: '1 1 24px'/)
    expect(dot).toMatch(/maxWidth: 44/)
    expect(dot.split("'::after'")[0]).not.toMatch(/[{\s]width: 44/)
  })

  it('breaks a long exercise or superset name instead of widening the card', () => {
    expect(style('title')).toMatch(/minWidth: 0/)
    expect(style('title')).toMatch(/overflowWrap: 'anywhere'/)
    expect(style('supersetName')).toMatch(/overflowWrap: 'anywhere'/)
  })
})
