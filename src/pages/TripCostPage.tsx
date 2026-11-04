import { Link, useParams } from 'react-router-dom'
import { tripPageFallback } from '../components/TripPageFallback'
import type { AuthApi } from '../hooks/useAuth'
import type { TripsApi } from '../hooks/useTrips'
import { bookingGroups, sumLines, sumPlaces, type BookingGroup } from '../utils/costs'
import {
  addDays,
  autoTitle,
  formatCost,
  formatDateRange,
  formatShortDateWithWeekday,
} from '../utils/dates'

interface Props {
  api: TripsApi
  auth: AuthApi
}

const MAX_HEADCOUNT = 99

const GROUP_ICONS: Record<BookingGroup['key'], string> = {
  tickets: '🎫',
  lodgings: '🏨',
  reservations: '🎟',
}

function CostAmount({ cost }: { cost?: number }) {
  return (
    <span className={`cost-row__amount${cost === undefined ? ' cost-row__amount--empty' : ''}`}>
      {cost === undefined ? '-' : formatCost(cost)}
    </span>
  )
}

/** /trips/:id/costs — 여행 전 예약(교통·숙소·기타), 일자별 장소 비용과 합계, 맨 아래 전체 합계 */
export function TripCostPage({ api, auth }: Props) {
  const { id = '' } = useParams()
  const trip = api.getTrip(id)

  const fallback = tripPageFallback(api, auth, trip)
  if (fallback || !trip) return fallback

  const groups = bookingGroups(trip)
  const bookingTotal = groups.reduce((sum, group) => sum + sumLines(group.lines), 0)
  const dayTotals = trip.days.map(sumPlaces)
  const total = bookingTotal + dayTotals.reduce((sum, value) => sum + value, 0)
  const headcount = trip.headcount ?? 1
  const perPerson = Math.round(total / headcount)

  const changeHeadcount = (next: number) => {
    const value = Math.min(MAX_HEADCOUNT, Math.max(1, next))
    if (value !== headcount) api.updateTrip(trip.id, { headcount: value })
  }

  return (
    <div className="page page--detail">
      <header className="detail-top">
        <div className="detail-top__inner">
          <Link to={`/trips/${trip.id}`} className="back-link">
            ← Trip Log
          </Link>
        </div>
      </header>

      <div className="detail-body trip-view">
        {/* 저장에 실패하면 값이 이전으로 돌아가므로 이유를 보여준다 */}
        {api.error && (
          <p className="storage-error" role="alert">
            {api.error}
          </p>
        )}
        <div className="cost-intro">
          <span className="trip-card__label">TRIP COST</span>
          <h1 className="trip-view__title">{trip.title || autoTitle(trip.region)}</h1>
          {trip.startDate && trip.endDate && (
            <p className="meta-panel__range">{formatDateRange(trip.startDate, trip.endDate)}</p>
          )}
          {/* 1인당 금액을 나눌 인원 — 바꾸면 바로 저장 */}
          <div className="cost-people" role="group" aria-label="인원">
            <span>1인당 금액 계산 인원</span>
            <button
              type="button"
              onClick={() => changeHeadcount(headcount - 1)}
              disabled={headcount <= 1}
              aria-label="인원 줄이기"
            >
              −
            </button>
            <strong aria-live="polite">{headcount}명</strong>
            <button
              type="button"
              onClick={() => changeHeadcount(headcount + 1)}
              disabled={headcount >= MAX_HEADCOUNT}
              aria-label="인원 늘리기"
            >
              +
            </button>
          </div>
        </div>

        <div className="cost-days">
          {/* 여행 가기 전에 쓴 금액 — 교통 티켓·숙소·기타 예약 */}
          {groups.length > 0 && (
            <section className="cost-day cost-day--booking">
              <header className="cost-day__head">
                <span className="timeline-view__day-badge cost-day__badge--booking">BEFORE TRIP</span>
                <strong>여행 전 예약</strong>
              </header>
              <div className="cost-groups">
              {groups.map((group) => (
                <div key={group.key} className={`cost-group cost-group--${group.key}`}>
                  {/* 항목별 토탈: [아이콘 교통 2건] ……… (전체값) / 1인 인당값 */}
                  <h3 className="cost-group__title">
                    <span className="cost-group__name">
                      <span className="cost-group__icon" aria-hidden="true">
                        {GROUP_ICONS[group.key]}
                      </span>
                      {group.label}
                      <small>{group.lines.length}건</small>
                    </span>
                    <span className="cost-group__sum">
                      <strong>{formatCost(sumLines(group.lines))}</strong>
                      <span className="cost-group__slash" aria-hidden="true">
                        /
                      </span>
                      <span className="cost-group__each">
                        1인 {formatCost(Math.round(sumLines(group.lines) / headcount))}
                      </span>
                    </span>
                  </h3>
                  <ul className="cost-day__list">
                    {group.lines.map((line) => (
                      <li key={line.key} className="cost-row">
                        <div className="cost-row__text">
                          <strong title={line.name}>{line.name}</strong>
                        </div>
                        <CostAmount cost={line.cost} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              </div>
              <footer className="cost-day__total">
                <span>예약 합계</span>
                <strong>{formatCost(bookingTotal)}</strong>
              </footer>
            </section>
          )}

          {trip.days.map((places, dayIndex) => (
            <section key={dayIndex} className="cost-day">
              <header className="cost-day__head">
                <span className="timeline-view__day-badge">DAY {dayIndex + 1}</span>
                {trip.startDate && (
                  <strong>{formatShortDateWithWeekday(addDays(trip.startDate, dayIndex))}</strong>
                )}
              </header>

              {places.length === 0 ? (
                <p className="timeline-view__empty">등록된 장소가 없습니다</p>
              ) : (
                <ul className="cost-day__list">
                  {places.map((place) => (
                    <li key={place.id} className="cost-row">
                      <div className="cost-row__text">
                        <strong>{place.name}</strong>
                      </div>
                      <CostAmount cost={place.cost} />
                    </li>
                  ))}
                </ul>
              )}

              <footer className="cost-day__total">
                <span>{dayIndex + 1}일차 합계</span>
                <strong>{formatCost(dayTotals[dayIndex])}</strong>
              </footer>
            </section>
          ))}
        </div>

        {/* 전체 합계 — 티켓 모양(절취선 아래 금액) */}
        <section className="trip-view__ticket-wrap">
          <div className="trip-view__ticket cost-total">
            <div className="cost-total__main">
              <span className="trip-card__label">TOTAL</span>
              <ul className="cost-total__days">
                {groups.length > 0 && (
                  <li>
                    <span>여행 전 예약</span>
                    <span>{formatCost(bookingTotal)}</span>
                  </li>
                )}
                {dayTotals.map((value, dayIndex) => (
                  <li key={dayIndex}>
                    <span>{dayIndex + 1}일차</span>
                    <span>{formatCost(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="trip-view__ticket-stub cost-total__stub">
              <span>전체 금액</span>
              {/* 전체값 / 인당값 */}
              <p className="cost-total__sum">
                <strong>{formatCost(total)}</strong>
                <span className="cost-total__slash" aria-hidden="true">
                  /
                </span>
                <span className="cost-total__each">
                  1인 <b>{formatCost(perPerson)}</b>
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
