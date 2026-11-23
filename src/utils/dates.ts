/** Inclusive day count between YYYY-MM-DD strings */
export function dayCount(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0
  }
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return diff + 1
}

export function formatDateDot(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${y}.${m}.${d}`
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''
  const nights = dayCount(startDate, endDate) - 1
  const nightsLabel = nights <= 0 ? '당일' : `${nights}박 ${nights + 1}일`
  return `${formatDateDot(startDate)} ~ ${formatDateDot(endDate)} (${nightsLabel})`
}

export function addDays(iso: string, offset: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 오늘 날짜(브라우저 로컬 시간대) YYYY-MM-DD */
export function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/**
 * 목록 카드 배지용 여행 상태. 날짜가 비어 있거나 이미 끝난 여행은 null.
 * - upcoming: 시작일이 오늘보다 뒤
 * - ongoing: 오늘이 시작일~종료일 사이(종료일이 비면 시작일 하루)
 */
export function tripStatus(startDate: string, endDate: string): 'upcoming' | 'ongoing' | null {
  if (!startDate) return null
  const today = todayIso()
  if (startDate > today) return 'upcoming'
  if (today <= (endDate || startDate)) return 'ongoing'
  return null
}

export function formatDayHeader(startDate: string, dayIndex: number): string {
  // 새 여행은 날짜를 고르기 전까지 시작일이 비어 있다
  if (!startDate) return `${dayIndex + 1}일차`
  const date = addDays(startDate, dayIndex)
  return `${dayIndex + 1}일차 · ${formatDateDot(date)}`
}

export function autoTitle(region: string): string {
  const trimmed = region.trim()
  return trimmed ? `${trimmed} 여행` : '새 여행'
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** "10/20 (월)" */
export function formatShortDateWithWeekday(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

export function formatTimeRange(startTime?: string, endTime?: string): string {
  if (startTime && endTime) return `${startTime} ~ ${endTime}`
  if (startTime) return startTime
  if (endTime) return `~ ${endTime}`
  return ''
}

export function formatCost(cost?: number): string {
  if (cost === undefined) return ''
  return `${cost.toLocaleString('ko-KR')}원`
}
