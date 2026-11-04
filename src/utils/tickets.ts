import type { TicketSegment, Tickets } from '../types/trip'

export function emptySegment(): TicketSegment {
  return { name: '', from: '', to: '', departTime: '', arriveTime: '', price: '' }
}

export const EMPTY_TICKETS: Tickets = { outbound: [], inbound: [] }

function isFilled(segment: TicketSegment): boolean {
  return Object.values(segment).some((value) => value.trim() !== '')
}

function toSegment(value: unknown): TicketSegment {
  const source = (typeof value === 'object' && value ? value : {}) as Record<string, unknown>
  const text = (key: keyof TicketSegment) => (typeof source[key] === 'string' ? (source[key] as string) : '')
  return {
    name: text('name'),
    from: text('from'),
    to: text('to'),
    departTime: text('departTime'),
    arriveTime: text('arriveTime'),
    // 예전 데이터의 좌석(seat)은 금액 칸으로 바뀌면서 읽지 않는다
    price: text('price').replace(/[^\d]/g, ''),
  }
}

/** 구간 금액(원). 비어 있으면 undefined */
export function segmentPrice(segment: TicketSegment): number | undefined {
  return segment.price ? Number(segment.price) : undefined
}

/** 구간 배열, JSON 문자열, 예전 자유 텍스트 모두 구간 배열로 */
export function parseTicketLeg(value: unknown): TicketSegment[] {
  if (Array.isArray(value)) return value.map(toSegment)
  if (typeof value !== 'string' || !value.trim()) return []
  const trimmed = value.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map(toSegment)
    } catch {
      // JSON 이 아니면 아래에서 예전 텍스트로 처리
    }
  }
  // 예전 자유 텍스트("KE701 10/20 09:00 인천 → 나리타")는 이름 칸에 그대로 둔다
  return [{ ...emptySegment(), name: trimmed }]
}

export function normalizeTickets(value: unknown): Tickets {
  const source = (typeof value === 'object' && value ? value : {}) as Record<string, unknown>
  return { outbound: parseTicketLeg(source.outbound), inbound: parseTicketLeg(source.inbound) }
}

/** DB 텍스트 칸(ticket_outbound/inbound)에 넣을 값 — 빈 구간은 빼고 JSON 으로 */
export function serializeTicketLeg(segments: TicketSegment[] | undefined): string {
  const filled = (segments ?? []).filter(isFilled)
  return filled.length > 0 ? JSON.stringify(filled) : ''
}
