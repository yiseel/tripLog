import type { Lodging, Place, Reservation, Trip } from '../types/trip'
import { normalizeTickets, segmentPrice } from './tickets'

export interface CostLine {
  key: string
  name: string
  cost?: number
}

/** 여행 전 예약 묶음 — 비용 화면에서 DAY 1 위에 보여준다 */
export interface BookingGroup {
  key: 'tickets' | 'lodgings' | 'reservations'
  label: string
  lines: CostLine[]
}

export function sumLines(lines: { cost?: number }[]): number {
  return lines.reduce((sum, line) => sum + (line.cost ?? 0), 0)
}

export function sumPlaces(places: Place[]): number {
  return sumLines(places)
}

export function hasLodging(item: Lodging): boolean {
  return Boolean(item.name.trim() || item.address.trim() || item.cost !== undefined)
}

export function hasReservation(item: Reservation): boolean {
  return Boolean(
    item.name.trim() || item.memo.trim() || item.cost !== undefined || reservationLinks(item).length > 0,
  )
}

/** 빈 칸을 뺀 기타 예약 링크 */
export function reservationLinks(item: Reservation): string[] {
  return (item.links ?? []).map((link) => link.trim()).filter(Boolean)
}

/** 교통 티켓(금액 있는 구간) · 숙소 · 기타 예약. 내용이 없는 묶음은 뺀다 */
export function bookingGroups(trip: Trip): BookingGroup[] {
  const tickets = normalizeTickets(trip.tickets)
  const showTickets = trip.transport && trip.transport !== 'car'
  const ticketLines: CostLine[] = showTickets
    ? [
        ...tickets.outbound.map((segment, index) => ({ segment, key: `out-${index}`, leg: '가는 편' })),
        ...tickets.inbound.map((segment, index) => ({ segment, key: `in-${index}`, leg: '오는 편' })),
      ]
        .filter(({ segment }) => segment.price)
        .map(({ segment, key, leg }) => {
          const route = segment.from && segment.to ? `${segment.from} → ${segment.to}` : ''
          return {
            key,
            name: [leg, segment.name || route].filter(Boolean).join(' · '),
            cost: segmentPrice(segment),
          }
        })
    : []

  const groups: BookingGroup[] = [
    { key: 'tickets', label: '교통', lines: ticketLines },
    {
      key: 'lodgings',
      label: '숙소',
      lines: (trip.lodgings ?? []).filter(hasLodging).map((item) => ({
        key: item.id,
        name: item.name || '숙소',
        cost: item.cost,
      })),
    },
    {
      key: 'reservations',
      label: '기타 예약',
      lines: (trip.reservations ?? []).filter(hasReservation).map((item) => ({
        key: item.id,
        name: item.name || '예약',
        cost: item.cost,
      })),
    },
  ]
  return groups.filter((group) => group.lines.length > 0)
}

/** 여행 전 예약 + 일자별 장소 비용 전체 */
export function tripTotalCost(trip: Trip): number {
  const bookings = bookingGroups(trip).reduce((sum, group) => sum + sumLines(group.lines), 0)
  return bookings + trip.days.reduce((sum, places) => sum + sumPlaces(places), 0)
}
