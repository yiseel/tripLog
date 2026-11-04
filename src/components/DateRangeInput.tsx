import { useCallback, useRef, useState } from 'react'
import { Calendar } from './Calendar'
import { DateInput } from './DateInput'

interface Props {
  start: string
  end: string
  /** 시작일 칸 직접 입력 */
  onStartChange: (value: string) => void
  /** 종료일 칸 직접 입력 */
  onEndChange: (value: string) => void
  /** 달력에서 기간을 한 번에 골랐을 때 */
  onRangeChange: (start: string, end: string) => void
}

/** 기간: [시작일] ~ [종료일] [달력]. 칸은 각각 직접 입력, 달력 하나로 두 날짜를 한 번에 고른다 */
export function DateRangeInput({ start, end, onStartChange, onEndChange, onRangeChange }: Props) {
  const [open, setOpen] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

  return (
    <div ref={rowRef} className="date-range">
      <DateInput value={start} onChange={onStartChange} placeholder="시작일" ariaLabel="시작일" required />
      <span className="date-range__sep" aria-hidden="true">
        ~
      </span>
      <DateInput
        value={end}
        min={start}
        onChange={onEndChange}
        placeholder="종료일"
        ariaLabel="종료일"
        required
      />
      <button
        type="button"
        className={`date-range__picker${open ? ' date-range__picker--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="달력에서 기간 선택"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>
      {open && (
        <Calendar
          start={start}
          end={end}
          anchorRef={rowRef}
          onSelect={(nextStart, nextEnd) => {
            onRangeChange(nextStart, nextEnd)
            setOpen(false)
          }}
          onClose={close}
        />
      )}
    </div>
  )
}
