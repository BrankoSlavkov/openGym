// The community library inside an exercise's sheet: where your copy came from ("From Anna, taken
// 5 Nov"), and tips other people on your server wrote about this exercise, each one a tap from
// your own note. Nothing at all without a library on the server or with the Community module off.
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate, isoOf } from '../lib/format.js'
import { isOn } from '../lib/modules.ts'
import { libraryOn, listShared, importShared, sharedError } from '../lib/shared-api.ts'
import { originOf, originLine, applyImport, bylineOf } from '../lib/shared-items.js'
import type { SharedItem } from '../generated/models/sharedItem.ts'
import * as stylex from '@stylexjs/stylex'
import { sx } from '../lib/sx.ts'
import Icon from './Icon.tsx'

const styles = stylex.create({
  origin: { display: 'flex', alignItems: 'center', gap: 6, margin: '8px 2px' },
  tips: { display: 'grid', gap: 8 },
  tip: {
    backgroundColor: 'var(--surface-2)',
    borderRadius: 'var(--r-sm)',
    padding: '10px 12px',
    borderInlineStart: '3px solid var(--yellow)',
  },
  text: { margin: '0 0 6px', whiteSpace: 'pre-line', lineHeight: 'var(--lh-body)' },
  row: { gap: 8 },
})

const day = (ms?: number) => fmtDate(isoOf(new Date(ms || 0)))

export default function CommunityBits({ ex }: { ex: { id: string; missing?: boolean } }) {
  const on = useStore((s) => libraryOn(s.config, s.user) && isOn(s.S, 'community'))
  const origin = originOf(ex)
  const [tips, setTips] = useState<SharedItem[]>([])
  useEffect(() => {
    if (!on || !ex?.id || ex.missing) return
    let live = true
    listShared({ type: 'tip', ex: ex.id, sort: 'popular' })
      .then((r) => live && setTips((r.items || []).filter((i) => !i.mine).slice(0, 5)))
      .catch(() => live && setTips([]))
    return () => {
      live = false
    }
  }, [on, ex?.id])
  const take = (item: SharedItem) =>
    item.id &&
    importShared(item.id)
      .then((res) => {
        let msg = ''
        useStore.getState().update((s: Parameters<typeof applyImport>[0]) => {
          msg = applyImport(s, res, { exId: ex.id })
        })
        useUI.getState().toast(msg)
      })
      .catch((e) => useUI.getState().toast(sharedError(e)))
  return (
    <>
      {origin && (
        <p {...sx('small dim', styles.origin)}>
          <Icon name="globe" /> {originLine(origin, day)}
        </p>
      )}
      {on && tips.length > 0 && (
        <>
          <h4 className="sec">{t('Tips from your gym')}</h4>
          <div {...stylex.props(styles.tips)}>
            {tips.map((tip) => (
              <div key={tip.id} {...stylex.props(styles.tip)}>
                <p {...stylex.props(styles.text)}>{typeof tip.payload?.text === 'string' ? tip.payload.text : null}</p>
                <div {...sx('row between', styles.row)}>
                  <span className="small dim">{bylineOf(tip, day)}</span>
                  <button type="button" className="chip nocap" onClick={() => take(tip)}>
                    {t('Add to my note')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
