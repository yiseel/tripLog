import type { Place } from '../types/trip'
import { dayCount } from './dates'

/** Resize days array to match date range, preserving places where possible */
export function syncDays(
  days: Place[][],
  startDate: string,
  endDate: string,
): Place[][] {
  const count = dayCount(startDate, endDate)
  if (count <= 0) return days.length ? days : [[]]

  const next = days.slice(0, count).map((d) => [...d])
  while (next.length < count) next.push([])

  // Overflow places from truncated days go to the last day
  if (days.length > count) {
    const overflow = days.slice(count).flat()
    next[count - 1] = [...next[count - 1], ...overflow]
  }

  return next
}
