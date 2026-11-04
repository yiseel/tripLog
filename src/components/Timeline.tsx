import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Place } from '../types/trip'
import { formatDayHeader } from '../utils/dates'
import { PlaceItem, PlaceItemBody } from './PlaceItem'

interface Props {
  startDate: string
  days: Place[][]
  onReorder: (days: Place[][]) => void
  onAddPlace: (dayIndex: number) => void
  onEditPlace: (dayIndex: number, place: Place) => void
}

function findContainer(days: Place[][], id: string): number | null {
  if (id.startsWith('day-')) {
    return Number(id.replace('day-', ''))
  }
  for (let i = 0; i < days.length; i++) {
    if (days[i].some((p) => p.id === id)) return i
  }
  return null
}

function DayColumn({
  dayIndex,
  startDate,
  places,
  onAddPlace,
  onEditPlace,
}: {
  dayIndex: number
  startDate: string
  places: Place[]
  onAddPlace: (dayIndex: number) => void
  onEditPlace: (dayIndex: number, place: Place) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` })

  return (
    <section className={`day-column${isOver ? ' day-column--over' : ''}`}>
      <header className="day-column__header">
        <h3>{formatDayHeader(startDate, dayIndex)}</h3>
        <button type="button" className="btn btn--small" onClick={() => onAddPlace(dayIndex)}>
          + 장소 추가
        </button>
      </header>

      <div ref={setNodeRef} className="day-column__list">
        <SortableContext items={places.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {places.length === 0 ? (
            <p className="day-column__empty">아직 등록된 장소가 없습니다</p>
          ) : (
            places.map((place) => (
              <PlaceItem
                key={place.id}
                place={place}
                onEdit={() => onEditPlace(dayIndex, place)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  )
}

export function Timeline({
  startDate,
  days,
  onReorder,
  onAddPlace,
  onEditPlace,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const activePlace = useMemo(() => {
    if (!activeId) return null
    for (const day of days) {
      const found = day.find((p) => p.id === activeId)
      if (found) return found
    }
    return null
  }, [activeId, days])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(days, String(active.id))
    const overContainer = findContainer(days, String(over.id))
    if (activeContainer === null || overContainer === null) return
    if (activeContainer === overContainer) return

    const next = days.map((d) => [...d])
    const activeItems = next[activeContainer]
    const overItems = next[overContainer]
    const activeIndex = activeItems.findIndex((p) => p.id === active.id)
    if (activeIndex < 0) return

    const [moved] = activeItems.splice(activeIndex, 1)
    const overIndex = over.id.toString().startsWith('day-')
      ? overItems.length
      : overItems.findIndex((p) => p.id === over.id)

    overItems.splice(overIndex < 0 ? overItems.length : overIndex, 0, moved)
    onReorder(next)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeContainer = findContainer(days, String(active.id))
    const overContainer = findContainer(days, String(over.id))
    if (activeContainer === null || overContainer === null) return

    if (activeContainer === overContainer) {
      const items = [...days[activeContainer]]
      const oldIndex = items.findIndex((p) => p.id === active.id)
      const newIndex = over.id.toString().startsWith('day-')
        ? items.length - 1
        : items.findIndex((p) => p.id === over.id)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
      const next = days.map((d) => [...d])
      const [moved] = next[activeContainer].splice(oldIndex, 1)
      next[activeContainer].splice(newIndex, 0, moved)
      onReorder(next)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="timeline">
        {days.map((places, dayIndex) => (
          <DayColumn
            key={dayIndex}
            dayIndex={dayIndex}
            startDate={startDate}
            places={places}
            onAddPlace={onAddPlace}
            onEditPlace={onEditPlace}
          />
        ))}
      </div>
      {/* 부모(.timeline-section)의 transform 애니메이션이 fixed 기준점을 바꾸므로 body로 portal */}
      {createPortal(
        <DragOverlay>
          {activePlace ? (
            <div className="place-item place-item--overlay">
              <span className="place-item__handle">≡</span>
              <PlaceItemBody place={activePlace} />
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
