import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ScheduleTable } from '../components/ScheduleTable'
import { TimelineView } from '../components/TimelineView'
import { tripPageFallback } from '../components/TripPageFallback'
import type { AuthApi } from '../hooks/useAuth'
import type { TripsApi } from '../hooks/useTrips'
import type { TicketSegment, Tickets, Transport } from '../types/trip'
import { hasLodging, hasReservation, tripTotalCost } from '../utils/costs'
import {
  autoTitle,
  dayCount,
  formatCost,
  formatDateDot,
  formatShortDateWithWeekday,
} from '../utils/dates'
import { normalizeTickets } from '../utils/tickets'

interface Props {
  api: TripsApi
  auth: AuthApi
}

const TRANSPORT: Record<Transport, { label: string; icon: string }> = {
  car: { label: '자동차', icon: '🚗' },
  bus: { label: '버스', icon: '🚌' },
  train: { label: '기차', icon: '🚆' },
  plane: { label: '비행기', icon: '✈' },
}

const LEGS: { key: keyof Tickets; label: string }[] = [
  { key: 'outbound', label: '가는 편' },
  { key: 'inbound', label: '오는 편' },
]

function hasContent(segment: TicketSegment): boolean {
  return Object.values(segment).some((value) => value.trim() !== '')
}

/** 탑승권 모양 한 구간: [출발지 시간] → [도착지 시간], 아래에 편명 (금액은 비용 화면에서) */
function BoardingPass({ segment, icon }: { segment: TicketSegment; icon: string }) {
  return (
    <li className="pass">
      <div className="pass__route">
        <div>
          <small>FROM</small>
          <strong>{segment.from || '-'}</strong>
          <span>{segment.departTime || '--:--'}</span>
        </div>
        <span className="pass__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="pass__end">
          <small>TO</small>
          <strong>{segment.to || '-'}</strong>
          <span>{segment.arriveTime || '--:--'}</span>
        </div>
      </div>
      <div className="pass__stub">
        <span>{segment.name || '티켓'}</span>
      </div>
    </li>
  )
}

/** 목록에서 여행을 누르면 보이는 정보 화면. 수정은 [수정] → /trips/:id/edit */
export function TripViewPage({ api, auth }: Props) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const trip = api.getTrip(id)
  const [view, setView] = useState<'timeline' | 'schedule'>('timeline')

  const fallback = tripPageFallback(api, auth, trip)
  if (fallback || !trip) return fallback

  const tickets = normalizeTickets(trip.tickets)
  const transport = trip.transport ? TRANSPORT[trip.transport] : null
  const showTickets =
    trip.transport &&
    trip.transport !== 'car' &&
    (tickets.outbound.some(hasContent) || tickets.inbound.some(hasContent))

  const nights = dayCount(trip.startDate, trip.endDate) - 1
  const nightsLabel = nights < 0 ? '일정 미정' : nights === 0 ? '당일치기' : `${nights}박 ${nights + 1}일`
  const places = trip.days.flat()
  // 여행 전 예약(교통·숙소·기타)까지 포함
  const totalCost = tripTotalCost(trip)
  const lodgings = (trip.lodgings ?? []).filter(hasLodging)
  const reservations = (trip.reservations ?? []).filter(hasReservation)
  const bookings = [
    {
      key: 'lodgings',
      icon: '🏨',
      label: '숙소',
      empty: '등록된 숙소가 없습니다',
      items: lodgings.map((item) => ({ id: item.id, name: item.name || '숙소', detail: item.address })),
    },
    {
      key: 'reservations',
      icon: '🎟',
      label: '기타 예약',
      empty: '등록된 예약이 없습니다',
      items: reservations.map((item) => ({ id: item.id, name: item.name || '예약', detail: item.memo })),
    },
  ]

  const facts: { icon: string; label: string; value: string }[] = [
    { icon: '📍', label: '지역', value: trip.region || '-' },
    { icon: '👥', label: '같이 간 사람', value: trip.companions.trim() || '혼자' },
    { icon: transport?.icon ?? '🧭', label: '교통수단', value: transport?.label ?? '-' },
    { icon: '🎯', label: '목적', value: trip.purpose?.trim() || '-' },
  ]

  return (
    <div className="page page--detail">
      <header className="detail-top">
        <div className="detail-top__inner">
          <Link to="/" className="back-link">
            ← Trip Log
          </Link>
          <div className="detail-top__actions">
            <Link to={`/trips/${trip.id}/notes`} className="btn btn--ghost">
              준비물 · 메모
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
            >
              수정
            </button>
          </div>
        </div>
      </header>

      <div className="detail-body trip-view">
        {/* 목록 카드와 같은 티켓 모양 */}
        <section className="trip-view__ticket-wrap">
          <div className="trip-view__ticket">
            <div className="trip-view__ticket-main">
              <div className="trip-card__head">
                <span className="trip-card__label">TRIP TICKET</span>
                <span className="trip-card__type">{trip.tripType === 'overseas' ? '해외' : '국내'}</span>
              </div>
              <h1 className="trip-view__title">{trip.title || autoTitle(trip.region)}</h1>

              <div className="trip-view__route">
                <div>
                  <small>출발</small>
                  <strong>{formatDateDot(trip.startDate) || '----.--.--'}</strong>
                  {trip.startDate && <span>{formatShortDateWithWeekday(trip.startDate)}</span>}
                </div>
                <div className="trip-view__route-mid">
                  <span aria-hidden="true">{transport?.icon ?? '→'}</span>
                  <small>{nightsLabel}</small>
                </div>
                <div className="trip-view__route-end">
                  <small>도착</small>
                  <strong>{formatDateDot(trip.endDate) || '----.--.--'}</strong>
                  {trip.endDate && <span>{formatShortDateWithWeekday(trip.endDate)}</span>}
                </div>
              </div>
            </div>

            <div className="trip-view__ticket-stub">
              <span>
                장소 <strong>{places.length}</strong>곳
              </span>
              <span>
                총 비용 <strong>{totalCost > 0 ? formatCost(totalCost) : '-'}</strong>
              </span>
              <Link to={`/trips/${trip.id}/costs`} className="text-btn">
                비용 상세 →
              </Link>
              <span className="trip-card__barcode" aria-hidden="true" />
            </div>
          </div>
        </section>

        <dl className="trip-view__facts">
          {facts.map((fact) => (
            <div key={fact.label} className="trip-view__fact">
              <span className="trip-view__fact-icon" aria-hidden="true">
                {fact.icon}
              </span>
              <dt>{fact.label}</dt>
              <dd title={fact.value}>{fact.value}</dd>
            </div>
          ))}
        </dl>

        {/* 숙소 / 기타 예약 — 이름·주소(메모). 금액은 비용 화면에서 */}
        <section className="trip-view__bookings">
          {bookings.map((group) => (
            <div key={group.key} className={`booking-card booking-card--${group.key}`}>
              <h3>
                <span className="booking-card__icon" aria-hidden="true">
                  {group.icon}
                </span>
                {group.label}
                {group.items.length > 0 && <small>{group.items.length}</small>}
              </h3>
              {group.items.length === 0 ? (
                <p className="trip-view__empty">{group.empty}</p>
              ) : (
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <strong title={item.name}>{item.name}</strong>
                      {item.detail && <span title={item.detail}>{item.detail}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        {showTickets && transport && (
          <section className="trip-view__passes">
            {LEGS.map(({ key, label }) => {
              const segments = tickets[key].filter(hasContent)
              return (
                <div key={key} className="trip-view__leg">
                  <h3>
                    {label}
                    {segments.length > 1 && <small>경유 {segments.length - 1}회</small>}
                  </h3>
                  {segments.length === 0 ? (
                    <p className="trip-view__empty">입력된 티켓이 없습니다</p>
                  ) : (
                    <ol>
                      {segments.map((segment, index) => (
                        <BoardingPass key={index} segment={segment} icon={transport.icon} />
                      ))}
                    </ol>
                  )}
                </div>
              )
            })}
          </section>
        )}

        <section className="timeline-section">
          <div className="timeline-section__head">
            <div className="timeline-section__title">
              <h2>일자별 타임라인</h2>
              <div className="segmented trip-view__toggle" role="radiogroup" aria-label="보기 방식">
                {(['timeline', 'schedule'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={view === mode}
                    className={`segmented__item${view === mode ? ' segmented__item--active' : ''}`}
                    onClick={() => setView(mode)}
                  >
                    {mode === 'timeline' ? '타임라인' : '스케줄'}
                  </button>
                ))}
              </div>
            </div>
            <p>
              {view === 'schedule'
                ? '시간대 순으로 정렬되며, 시간대가 없는 장소는 등록 순서대로 아래에 표시됩니다'
                : '장소를 추가·수정하려면 위의 수정 버튼을 눌러 주세요'}
            </p>
          </div>
          {view === 'schedule' ? (
            <ScheduleTable startDate={trip.startDate} days={trip.days} showCost={false} />
          ) : (
            <TimelineView startDate={trip.startDate} days={trip.days} />
          )}
        </section>
      </div>
    </div>
  )
}
