import { Link } from 'react-router-dom'
import type { Transport, Trip } from '../types/trip'
import { dayCount, formatDateDot } from '../utils/dates'

interface Props {
  trip: Trip
}

const TRANSPORT_ICON: Record<Transport, string> = {
  car: '🚗',
  bus: '🚌',
  train: '🚆',
  plane: '✈',
}

export function TripCard({ trip }: Props) {
  const placeCount = trip.days.reduce((sum, d) => sum + d.length, 0)
  const nights = dayCount(trip.startDate, trip.endDate) - 1
  const nightsLabel = nights <= 0 ? '당일치기' : `${nights}박 ${nights + 1}일`

  return (
    <Link to={`/trips/${trip.id}`} className="trip-card">
      <div className="trip-card__ticket">
        <div className="trip-card__content">
          <div className="trip-card__head">
            <span className="trip-card__label">TRIP TICKET</span>
            <span className="trip-card__type">
              {trip.tripType === 'overseas' ? '해외' : '국내'}
            </span>
          </div>

          <h2 className="trip-card__title">{trip.title || '제목 없음'}</h2>

          <div className="trip-card__route">
            <div>
              <small>출발</small>
              <strong>{formatDateDot(trip.startDate)}</strong>
            </div>
            <span className="trip-card__route-icon" aria-hidden="true">
              {trip.transport ? TRANSPORT_ICON[trip.transport] : '→'}
            </span>
            <div className="trip-card__route-end">
              <small>도착</small>
              <strong>{formatDateDot(trip.endDate)}</strong>
            </div>
          </div>

          {/* 지역 | 같이 간 사람 한 줄, 목적은 아래 줄 전체 */}
          <dl className="trip-card__meta">
            <div>
              <dt>지역</dt>
              <dd title={trip.region || undefined}>{trip.region || '미정'}</dd>
            </div>
            <div>
              <dt>같이 간 사람</dt>
              <dd title={trip.companions.trim() || undefined}>{trip.companions.trim() || '혼자'}</dd>
            </div>
            <div className="trip-card__meta-full">
              <dt>목적</dt>
              <dd title={trip.purpose?.trim() || undefined}>{trip.purpose?.trim() || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="trip-card__stub">
          <span className="trip-card__count">
            {nightsLabel} · {placeCount}곳의 장소
          </span>
          <span className="trip-card__barcode" aria-hidden="true" />
        </div>
      </div>
    </Link>
  )
}
