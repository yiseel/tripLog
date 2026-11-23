import type { Place } from '../types/trip'
import { shortArea } from '../utils/address'
import { categoryGroup } from '../utils/category'
import { addDays, formatShortDateWithWeekday, formatTimeRange } from '../utils/dates'

interface Props {
  startDate: string
  days: Place[][]
}

/** 간략메모를 세부 내용 박스로 — 여러 줄이면 줄마다 항목으로 */
function MemoDetail({ memo }: { memo: string }) {
  const lines = memo
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return null
  return (
    <div className="timeline-view__memo">
      {lines.length === 1 ? (
        <p>{lines[0]}</p>
      ) : (
        <ul>
          {lines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 정보 화면용 읽기 전용 타임라인 — 일차별 카드 안에 시간 축(시간 · 점 · 내용) */
export function TimelineView({ startDate, days }: Props) {
  return (
    <div className="timeline-view">
      {days.map((places, dayIndex) => (
        <section key={dayIndex} className="timeline-view__day">
          <header className="timeline-view__day-head">
            <span className="timeline-view__day-badge">DAY {dayIndex + 1}</span>
            {startDate && (
              <strong>{formatShortDateWithWeekday(addDays(startDate, dayIndex))}</strong>
            )}
            <small>{places.length}곳</small>
          </header>

          {places.length === 0 ? (
            <p className="timeline-view__empty">등록된 장소가 없습니다</p>
          ) : (
            <ol className="timeline-view__list">
              {places.map((place) => {
                const time = formatTimeRange(place.startTime, place.endTime)
                const area = shortArea(place)
                return (
                  <li key={place.id} className="timeline-view__item">
                    <span className="timeline-view__time">{time || '–'}</span>
                    <span className="timeline-view__dot" aria-hidden="true" />
                    <div className="timeline-view__content" title={place.address || undefined}>
                      <div className="timeline-view__title">
                        {place.category && (
          <span className={`place-tag place-tag--${categoryGroup(place.category)}`}>{place.category}</span>
        )}
                        <strong>{place.name}</strong>
                        {area && <small>{area}</small>}
                      </div>
                      {/* 비용은 비용 화면(TripCostPage)에서만 보여준다 */}
                      {place.memo && <MemoDetail memo={place.memo} />}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      ))}
    </div>
  )
}
