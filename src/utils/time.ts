/** 입력 중: 숫자와 ':'만 허용하고, 숫자 4자리를 치면 "1120" → "11:20" 으로 바꿔 준다 */
export function typingTime(raw: string): string {
  const value = raw.replace(/[^\d:]/g, '').slice(0, 5)
  if (/^\d{4}$/.test(value)) return `${value.slice(0, 2)}:${value.slice(2)}`
  return value
}

/** "9" "930" "0930" "9:30" → "09:30", 빈 값은 '', 잘못된 값은 null */
export function normalizeTime(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return ''
  let h: string
  let m: string
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    h = parts[0]
    m = parts[1] || '0'
  } else if (trimmed.length <= 2) {
    h = trimmed
    m = '0'
  } else {
    h = trimmed.slice(0, -2)
    m = trimmed.slice(-2)
  }
  const hour = Number(h)
  const minute = Number(m)
  if (!h || !/^\d+$/.test(h) || !/^\d*$/.test(m) || hour > 23 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
