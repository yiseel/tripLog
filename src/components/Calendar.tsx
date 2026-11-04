import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** 현재 시작일·종료일 YYYY-MM-DD 또는 '' */
  start: string
  end: string
  /** 팝업을 붙일 기준 요소 (기간 입력 줄) */
  anchorRef: RefObject<HTMLElement | null>
  /** 시작일과 종료일을 모두 고르면 한 번에 넘긴다 */
  onSelect: (start: string, end: string) => void
  onClose: () => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const GAP = 6

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayIso(): string {
  const now = new Date()
  return toIso(now.getFullYear(), now.getMonth(), now.getDate())
}

/** 처음 보여줄 달: 시작일 → 오늘 */
function initialMonth(start: string): { year: number; month: number } {
  const [y, m] = (start || todayIso()).split('-').map(Number)
  return { year: y, month: m - 1 }
}

/**
 * 기간 선택 달력. 첫 클릭 = 시작일, 두 번째 클릭 = 종료일.
 * 두 번째로 시작일보다 앞 날짜를 누르면 그 날을 새 시작일로 본다.
 * 상위의 transform 영향을 받지 않도록 body 로 포털한다.
 */
export function Calendar({ start, end, anchorRef, onSelect, onClose }: Props) {
  const [view, setView] = useState(() => initialMonth(start))
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  /** 이번에 새로 고른 시작일 — 종료일까지 고르기 전에는 바깥에 반영하지 않는다 */
  const [pendingStart, setPendingStart] = useState('')
  const [hovered, setHovered] = useState('')
  const popupRef = useRef<HTMLDivElement>(null)
  const today = todayIso()

  // 기간 입력 줄 아래(공간이 없으면 위)에 붙인다. 문서 좌표라 페이지 스크롤에는 그대로 따라간다
  useLayoutEffect(() => {
    const place = () => {
      const anchor = anchorRef.current
      const popup = popupRef.current
      if (!anchor || !popup) return
      const rect = anchor.getBoundingClientRect()
      const height = popup.offsetHeight
      const width = popup.offsetWidth
      const below = rect.bottom + GAP + height <= window.innerHeight || rect.top < height + GAP
      const top = (below ? rect.bottom + GAP : rect.top - GAP - height) + window.scrollY
      // 오른쪽(달력 버튼 쪽)에 맞춰 붙이고 화면 밖으로 나가지 않게
      const maxLeft = window.scrollX + document.documentElement.clientWidth - width - 8
      const left = Math.max(window.scrollX + 8, Math.min(rect.right - width + window.scrollX, maxLeft))
      setPosition({ top, left })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [anchorRef, view])

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node
      if (popupRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose()
    }
    // 캡처 단계에서 받아 장소 모달 등 아래쪽 Esc 처리와 겹치지 않게
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [anchorRef, onClose])

  const pick = (iso: string) => {
    if (!pendingStart || iso < pendingStart) {
      setPendingStart(iso)
      return
    }
    onSelect(pendingStart, iso)
  }

  // 표시할 범위: 고르는 중이면 새 시작일 ~ 마우스 위치, 아니면 현재 기간
  const rangeStart = pendingStart || start
  const rangeEnd = pendingStart ? (hovered >= pendingStart ? hovered : '') : end

  const { year, month } = view
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const moveMonth = (offset: number) => {
    const next = new Date(year, month + offset, 1)
    setView({ year: next.getFullYear(), month: next.getMonth() })
  }

  return createPortal(
    <div
      ref={popupRef}
      className="calendar"
      role="dialog"
      aria-label="기간 선택"
      style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
    >
      <div className="calendar__head">
        <button type="button" className="calendar__nav" onClick={() => moveMonth(-1)} aria-label="이전 달">
          ‹
        </button>
        <strong>
          {year}년 {month + 1}월
        </strong>
        <button type="button" className="calendar__nav" onClick={() => moveMonth(1)} aria-label="다음 달">
          ›
        </button>
      </div>

      <div className="calendar__grid" onMouseLeave={() => setHovered('')}>
        {WEEKDAYS.map((label, index) => (
          <span
            key={label}
            className={`calendar__weekday${index === 0 ? ' calendar__weekday--sun' : ''}${index === 6 ? ' calendar__weekday--sat' : ''}`}
          >
            {label}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />
          const iso = toIso(year, month, day)
          const isStart = iso === rangeStart
          const isEnd = iso === rangeEnd
          const inRange = Boolean(rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd)
          const classes = ['calendar__day']
          if (isStart || isEnd) classes.push('calendar__day--selected')
          if (isStart && rangeEnd && rangeEnd !== rangeStart) classes.push('calendar__day--range-start')
          if (isEnd && rangeStart !== rangeEnd) classes.push('calendar__day--range-end')
          if (inRange) classes.push('calendar__day--in-range')
          if (iso === today) classes.push('calendar__day--today')
          if (index % 7 === 0) classes.push('calendar__day--sun')
          return (
            <button
              key={iso}
              type="button"
              className={classes.join(' ')}
              onClick={() => pick(iso)}
              onMouseEnter={() => setHovered(iso)}
              aria-pressed={isStart || isEnd}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="calendar__foot">
        <span className="calendar__hint">
          {pendingStart ? '종료일을 선택하세요' : '시작일을 선택하세요'}
        </span>
        <button type="button" className="text-btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>,
    document.body,
  )
}
