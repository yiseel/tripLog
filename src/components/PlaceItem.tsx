import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Place } from '../types/trip'
import { shortArea } from '../utils/address'
import { formatCost, formatTimeRange } from '../utils/dates'

interface Props {
  place: Place
  onEdit: () => void
}

/** 카드 본문: 1줄 "장소명 지역 | 시간대", 2줄 간략메모 (드래그 오버레이에서도 재사용) */
export function PlaceItemBody({ place }: { place: Place }) {
  const time = formatTimeRange(place.startTime, place.endTime)
  const cost = formatCost(place.cost)
  const area = shortArea(place)
  // 전체 주소·비용은 카드에 표시하지 않고 툴팁으로만 보여준다
  const fullText = [place.name, time, place.memo, place.address, cost].filter(Boolean).join(' · ')

  return (
    <div className="place-item__body" title={fullText}>
      <div className="place-item__line">
        <h4>{place.name}</h4>
        {area && <span className="place-item__area">{area}</span>}
        {time && (
          <>
            <span className="place-item__sep" aria-hidden="true">
              |
            </span>
            <span className="place-item__time">{time}</span>
          </>
        )}
      </div>
      {place.memo && <p className="place-item__memo">{place.memo}</p>}
    </div>
  )
}

export function PlaceItem({ place, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: place.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`place-item${isDragging ? ' place-item--dragging' : ''}`}
    >
      <button
        type="button"
        className="place-item__handle"
        aria-label="순서 변경"
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">≡</span>
      </button>
      <PlaceItemBody place={place} />
      <div className="place-item__actions">
        <button type="button" className="text-btn" onClick={onEdit}>
          수정
        </button>
      </div>
    </article>
  )
}
