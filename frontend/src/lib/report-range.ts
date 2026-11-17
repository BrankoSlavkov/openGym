import { isoOf, todayISO } from './format.js'

const DAY = 86400000
const dateOf = (iso: string) => new Date(iso + 'T12:00:00')
const addDays = (iso: string, n: number): string => {
  const d = dateOf(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}
const validIso = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isoOf(dateOf(value)) === value

/** Inclusive reporting range, with swapped and future endpoints corrected. */
export function reportRange(
  range: string,
  { from, to, today = todayISO() }: { from?: string; to?: string; today?: string } = {},
) {
  let start: string,
    end = today
  if (range === '7d') start = addDays(today, -6)
  else if (range === '4w') start = addDays(today, -27)
  else if (range === '3m') {
    const d = dateOf(today)
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() - 3)
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
    start = addDays(isoOf(d), 1)
  } else {
    start = validIso(from) ? from : addDays(today, -27)
    end = validIso(to) ? to : today
    if (start > end) [start, end] = [end, start]
    if (end > today) end = today
    if (start > end) start = end
  }
  return { from: start, to: end, days: Math.round((dateOf(end).getTime() - dateOf(start).getTime()) / DAY) + 1 }
}
