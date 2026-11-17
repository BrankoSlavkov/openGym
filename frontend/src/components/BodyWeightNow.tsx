type BodyweightState = { bodyweight: { d: string; w: number }[]; unit: string }
type BodyweightPoint = { d: string; t: number }
// Fork-only: the Home body-weight card's summary (latest weigh-in, change since the one before,
// its date, and the N-day average), so Stats → Body shows the same numbers as Home.
// Kept in its own file so Home.jsx and Stats.jsx stay close to upstream.
import { t } from '../lib/i18n.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { lastBW } from '../lib/history.js'
import { recentAverage, rollingAverage } from '../lib/bodyweight.js'
import { bwDeltaColor } from '../sheets.jsx'
import Icon from './Icon.tsx'

/** Latest weigh-in, its change, its date and the recent average, as on the Home card. */
export default function BodyWeightNow({ S }: { S: BodyweightState }) {
  const bw = lastBW(S)
  if (!bw) return null
  const prev = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = prev ? bw.w - prev.w : null
  const avg = recentAverage(S.bodyweight)
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
        <div className="big">
          {fmtNum(bw.w)}{' '}
          <span className="muted" style={{ fontSize: 'var(--fs-callout)' }}>
            {S.unit}
          </span>
        </div>
        {!!delta && (
          <span className="small row" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(delta, bw.w) }}>
            <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 'var(--fs-caption)' }} />
            {fmtNum(Math.abs(delta))}
          </span>
        )}
        <span className="dim small" style={{ marginInlineStart: 'auto' }}>
          {fmtDate(bw.d, true)}
        </span>
      </div>
      {avg && (
        <div className="small muted bw-avg row" style={{ marginTop: 2, gap: 6 }}>
          <span className="bw-avg-m" aria-hidden="true" />
          {t('{0}-day average', avg.n)}{' '}
          <b style={{ color: 'var(--label)' }}>
            {fmtNum(avg.avg)} {S.unit}
          </b>
        </div>
      )}
    </div>
  )
}

/** The average line drawn over a body-weight chart, as on Home: one point per shown weigh-in day. */
export function bwAvgOverlay(S: BodyweightState, points: BodyweightPoint[]) {
  const byDay = new Map<string, { d: string; avg: number }>(rollingAverage(S.bodyweight).map((a) => [a.d, a]))
  return {
    color: 'var(--bw-avg)',
    points: points.filter((p) => byDay.has(p.d)).map((p) => ({ t: p.t, y: byDay.get(p.d)!.avg })),
  }
}
