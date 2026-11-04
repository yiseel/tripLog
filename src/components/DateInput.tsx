import { useState } from 'react'

interface Props {
  /** YYYY-MM-DD 또는 '' */
  value: string
  /** 이 날짜보다 앞은 입력할 수 없다 (종료일 ← 시작일) */
  min?: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  required?: boolean
}

/** 입력 중: 숫자와 구분자(- . /)만 허용하고, 숫자 8자리를 치면 "20261030" → "2026-10-30" */
function typingDate(raw: string): string {
  const value = raw.replace(/[^\d./-]/g, '').slice(0, 10)
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`
  return value
}

/** "20261030" "2026.10.30" "2026/1/5" → "YYYY-MM-DD", 빈 값은 '', 잘못된 값은 null */
function normalizeDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const match =
    trimmed.match(/^(\d{4})(\d{2})(\d{2})$/) ?? trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  // 2026-02-30 처럼 없는 날짜는 다른 날로 넘어가므로 되돌려 비교
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 직접 입력하는 날짜 칸. 달력은 DateRangeInput 이 하나만 띄운다 */
export function DateInput({ value, min, onChange, placeholder = 'YYYY-MM-DD', ariaLabel, required }: Props) {
  const [draft, setDraft] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  const [error, setError] = useState('')

  // 달력 선택이나 시작일 변경으로 바깥 값이 바뀌면 입력 칸도 맞춘다
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value)
    setError('')
  }

  const commit = () => {
    const next = normalizeDate(draft)
    if (next === null) {
      setError('2026-10-30 또는 20261030 형식으로 입력해 주세요')
      return
    }
    if (next && min && next < min) {
      setError('시작일 이후 날짜를 입력해 주세요')
      return
    }
    setError('')
    setDraft(next)
    if (next !== value) onChange(next)
  }

  return (
    <div className={`date-input${error ? ' date-input--invalid' : ''}`}>
      <input
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(typingDate(e.target.value))}
        onBlur={commit}
        onKeyDown={(e) => {
          // Enter는 폼 저장 대신 입력값 확정만 한다 (확정 전 값으로 저장되지 않도록)
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error) || undefined}
        required={required}
      />
      {error && <small className="date-input__error">{error}</small>}
    </div>
  )
}
