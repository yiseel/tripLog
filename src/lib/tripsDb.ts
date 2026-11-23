import { v4 as uuid } from 'uuid'
import type {
  ChecklistItem,
  Lodging,
  NoteItem,
  Place,
  Reservation,
  Transport,
  Trip,
  TripType,
} from '../types/trip'
import { dayCount } from '../utils/dates'
import { parseTicketLeg, serializeTicketLeg } from '../utils/tickets'
import { getSupabase } from './supabase'

const LEGACY_OWNER_KEY = 'trip-log:legacy-owner'

interface TripRow {
  id: string
  user_id: string
  title: string
  region: string
  start_date: string
  end_date: string
  companions: string
  trip_type: string
  transport: string | null
  ticket_outbound: string
  ticket_inbound: string
  purpose: string
  /**
   * 준비물·메모 (jsonb). 한 번도 쓰지 않은 여행은 키 자체를 보내지 않아서,
   * trips.checklist/notes 칸을 추가하기 전에도 기존 여행 저장이 실패하지 않는다.
   */
  checklist?: ChecklistItem[] | null
  notes?: NoteItem[] | null
  /** 숙소·기타 예약 (jsonb) — checklist 와 같은 이유로 쓴 적 있는 여행만 보낸다 */
  lodgings?: Lodging[] | null
  reservations?: Reservation[] | null
  /** 비용을 나눌 인원 — 정한 적 있는 여행만 보낸다 */
  headcount?: number | null
  created_at: string
  updated_at: string
}

interface PlaceRow {
  id: string
  trip_id: string
  day_index: number
  sort_order: number
  name: string
  address: string
  memo: string
  lat: number | null
  lng: number | null
  start_time: string | null
  end_time: string | null
  cost: number | null
  /** 해외 장소만 — places.area 칸이 없는 DB에서도 국내 장소는 저장되도록 값이 있을 때만 보낸다 */
  area?: string | null
  /** 장소 분류 — places.category 칸이 없는 DB에서도 저장되도록 값이 있을 때만 보낸다 */
  category?: string | null
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

function asDate(value: string): string {
  return value.slice(0, 10)
}

function asTripType(value: string): TripType {
  return value === 'overseas' ? 'overseas' : 'domestic'
}

function asTransport(value: string | null): Transport | undefined {
  if (value === 'car' || value === 'bus' || value === 'train' || value === 'plane') return value
  return undefined
}

function asChecklist(value: unknown): ChecklistItem[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((item: Record<string, unknown>) => ({
    id: String(item?.id ?? uuid()),
    text: typeof item?.text === 'string' ? item.text : '',
    done: item?.done === true,
  }))
}

function asNotes(value: unknown): NoteItem[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((item: Record<string, unknown>) => ({
    id: String(item?.id ?? uuid()),
    text: typeof item?.text === 'string' ? item.text : '',
  }))
}

function asCost(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asLodgings(value: unknown): Lodging[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((item: Record<string, unknown>) => ({
    id: String(item?.id ?? uuid()),
    name: asText(item?.name),
    address: asText(item?.address),
    cost: asCost(item?.cost),
  }))
}

function asReservations(value: unknown): Reservation[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((item: Record<string, unknown>) => {
    const links = Array.isArray(item?.links) ? item.links.map(asText).filter(Boolean) : []
    return {
      id: String(item?.id ?? uuid()),
      name: asText(item?.name),
      memo: asText(item?.memo),
      cost: asCost(item?.cost),
      ...(links.length > 0 ? { links } : {}),
    }
  })
}

function toTripRow(trip: Trip, userId: string): TripRow {
  return {
    id: trip.id,
    user_id: userId,
    title: trip.title,
    region: trip.region,
    start_date: trip.startDate,
    end_date: trip.endDate,
    companions: trip.companions,
    trip_type: trip.tripType ?? 'domestic',
    transport: trip.transport ?? null,
    // 구간 배열을 JSON 문자열로 기존 텍스트 칸에 저장 (스키마 변경 없음)
    ticket_outbound: serializeTicketLeg(trip.tickets?.outbound),
    ticket_inbound: serializeTicketLeg(trip.tickets?.inbound),
    purpose: trip.purpose ?? '',
    ...(trip.checklist !== undefined ? { checklist: trip.checklist } : {}),
    ...(trip.notes !== undefined ? { notes: trip.notes } : {}),
    ...(trip.lodgings !== undefined ? { lodgings: trip.lodgings } : {}),
    ...(trip.reservations !== undefined ? { reservations: trip.reservations } : {}),
    ...(trip.headcount !== undefined ? { headcount: trip.headcount } : {}),
    created_at: trip.createdAt,
    updated_at: trip.updatedAt,
  }
}

function toPlaceRows(trip: Trip): PlaceRow[] {
  return trip.days.flatMap((day, dayIndex) =>
    day.map((place, sortOrder) => ({
      id: place.id,
      trip_id: trip.id,
      day_index: dayIndex,
      sort_order: sortOrder,
      name: place.name,
      address: place.address,
      memo: place.memo,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      start_time: place.startTime || null,
      end_time: place.endTime || null,
      cost: place.cost == null ? null : Math.round(place.cost),
      ...(place.area ? { area: place.area } : {}),
      ...(place.category ? { category: place.category } : {}),
    })),
  )
}

function toPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    memo: row.memo,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    cost: row.cost ?? undefined,
    area: row.area || undefined,
    category: row.category || undefined,
  }
}

/** 빈 일차도 유지한다. 기간을 벗어난 장소는 마지막 날로 붙인다. */
function toTrip(row: TripRow, places: PlaceRow[]): Trip {
  const startDate = asDate(row.start_date)
  const endDate = asDate(row.end_date)
  const count = Math.max(1, dayCount(startDate, endDate))
  const days: Place[][] = Array.from({ length: count }, () => [])
  const sorted = [...places].sort(
    (a, b) => a.day_index - b.day_index || a.sort_order - b.sort_order,
  )
  for (const rowPlace of sorted) {
    const index = rowPlace.day_index >= 0 && rowPlace.day_index < count ? rowPlace.day_index : count - 1
    days[index].push(toPlace(rowPlace))
  }
  return {
    id: row.id,
    title: row.title,
    region: row.region,
    startDate,
    endDate,
    companions: row.companions,
    tripType: asTripType(row.trip_type),
    transport: asTransport(row.transport),
    tickets: { outbound: parseTicketLeg(row.ticket_outbound), inbound: parseTicketLeg(row.ticket_inbound) },
    purpose: row.purpose ?? '',
    checklist: asChecklist(row.checklist),
    notes: asNotes(row.notes),
    lodgings: asLodgings(row.lodgings),
    reservations: asReservations(row.reservations),
    headcount: typeof row.headcount === 'number' && row.headcount > 0 ? row.headcount : undefined,
    days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchTrips(userId: string): Promise<Trip[]> {
  const supabase = getSupabase()
  const tripsResult = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  fail(tripsResult.error)
  const placesResult = await supabase.from('places').select('*')
  fail(placesResult.error)

  const placesByTrip = new Map<string, PlaceRow[]>()
  for (const place of (placesResult.data ?? []) as PlaceRow[]) {
    const list = placesByTrip.get(place.trip_id) ?? []
    list.push(place)
    placesByTrip.set(place.trip_id, list)
  }

  return ((tripsResult.data ?? []) as TripRow[]).map((trip) =>
    toTrip(trip, placesByTrip.get(trip.id) ?? []),
  )
}

export async function saveTrip(trip: Trip): Promise<void> {
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('로그인 후 저장할 수 있습니다.')
  const claimed = await supabase.rpc('claim_unowned_trip', { target_id: trip.id })
  fail(claimed.error)
  const saved = await supabase.from('trips').upsert(toTripRow(trip, data.user.id))
  fail(saved.error)

  const places = toPlaceRows(trip)
  if (places.length > 0) {
    const upserted = await supabase.from('places').upsert(places)
    fail(upserted.error)
  }

  // 빠진 장소(삭제·일차 축소)만 지운다. 여행 행을 지우면 장소는 cascade로 따라간다.
  let removing = supabase.from('places').delete().eq('trip_id', trip.id)
  if (places.length > 0) {
    removing = removing.not('id', 'in', `(${places.map((place) => place.id).join(',')})`)
  }
  fail((await removing).error)
}

export async function deleteTrip(id: string): Promise<void> {
  const supabase = getSupabase()
  fail((await supabase.from('trips').delete().eq('id', id)).error)
}

/** 로그인 전에 이 브라우저에만 있던 기록을, 처음 로그인한 계정의 여행으로 한 번 올린다. */
export async function migrateLocalTrips(trips: Trip[], userId: string): Promise<void> {
  if (localStorage.getItem(LEGACY_OWNER_KEY)) return
  for (const trip of trips) await saveTrip(trip)
  localStorage.setItem(LEGACY_OWNER_KEY, userId)
}
