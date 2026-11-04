import type { Trip } from '../types/trip'
import { normalizeTickets } from './tickets'

const STORAGE_KEY = 'trip-log:trips'

function storageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY
}

export function loadTrips(userId?: string | null): Trip[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Trip[]
    if (!Array.isArray(parsed)) return []
    // 예전 저장본은 티켓이 자유 텍스트였다
    return parsed.map((trip) => ({ ...trip, tickets: normalizeTickets(trip.tickets) }))
  } catch {
    return []
  }
}

export function saveTrips(trips: Trip[], userId?: string | null): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(trips))
}
