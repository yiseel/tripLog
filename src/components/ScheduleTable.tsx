import type { Place } from '../types/trip'
import { addDays, formatCost, formatShortDateWithWeekday, formatTimeRange } from '../utils/dates'

interface Props {
  startDate: string
  days: Place[][]
  /** 없으면 읽기 전용(항목을 눌러도 아무 일 없음) */
  onEditPlace?: (dayIndex: number, place: Place) => void
  /** 정보 화면은 비용을 숨긴다(비용 화면에서 따로 본다) */
  showCost?: boolean
}

function timeKey(place: Place): string {
  return place.startTime || place.endTime || ''
}

function ScheduleCell({
  places,
  dayIndex,
  onEditPlace,
  showCost,
}: {
  places: Place[]
  dayIndex: number
  onEditPlace?: (dayIndex: number, place: Place) => void
  showCost: boolean
}) {
  return (
    <td>
      {places.map((place) => {
        const content = (
          <>
            {(place.startTime || place.endTime) && (
              <small className="schedule-entry__time">
                {formatTimeRange(place.startTime, place.endTime)}
              </small>
            )}
            <strong>{place.name}</strong>
            {place.memo && <small className="schedule-entry__memo">{place.memo}</small>}
            {showCost && place.cost !== undefined && <small>{formatCost(place.cost)}</small>}
          </>
        )
        return onEditPlace ? (
          <button
            key={place.id}
            type="button"
            className="schedule-entry"
            onClick={() => onEditPlace(dayIndex, place)}
          >
            {content}
          </button>
        ) : (
          <div key={place.id} className="schedule-entry schedule-entry--static">
            {content}
          </div>
        )
      })}
    </td>
  )
}

export function ScheduleTable({ startDate, days, onEditPlace, showCost = true }: Props) {
  // 시간대를 입력한 장소는 시간순 행으로, 입력하지 않은 장소는 기존 순서대로 아래에 배치한다
  const timeKeys = [...new Set(days.flat().map(timeKey).filter(Boolean))].sort()
  const untimed = days.map((places) => places.filter((p) => !timeKey(p)))
  const untimedRows = Math.max(0, ...untimed.map((list) => list.length))
  const hasAny = days.some((places) => places.length > 0)

  return (
    <div className="schedule-table__wrap">
      <table className="schedule-table">
        <thead>
          <tr>
            <th scope="col" className="schedule-table__time"> </th>
            {days.map((_, dayIndex) => (
              <th key={dayIndex} scope="col">
                <span className="schedule-table__day">{dayIndex + 1}일차</span>
                {startDate && formatShortDateWithWeekday(addDays(startDate, dayIndex))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeKeys.map((key) => (
            <tr key={key}>
              <th scope="row" className="schedule-table__time">
                {key}
              </th>
              {days.map((places, dayIndex) => (
                <ScheduleCell
                  key={dayIndex}
                  dayIndex={dayIndex}
                  places={places.filter((p) => timeKey(p) === key)}
                  onEditPlace={onEditPlace}
                  showCost={showCost}
                />
              ))}
            </tr>
          ))}
          {Array.from({ length: untimedRows }, (_, row) => (
            <tr key={`untimed-${row}`}>
              <th scope="row" className="schedule-table__time schedule-table__time--empty">
                -
              </th>
              {untimed.map((list, dayIndex) => (
                <ScheduleCell
                  key={dayIndex}
                  dayIndex={dayIndex}
                  places={list[row] ? [list[row]] : []}
                  onEditPlace={onEditPlace}
                  showCost={showCost}
                />
              ))}
            </tr>
          ))}
          {!hasAny && (
            <tr>
              <td colSpan={days.length + 1} className="schedule-table__empty">
                아직 등록된 장소가 없습니다
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
