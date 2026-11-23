/**
 * 장소 종류 — 대분류(식사·관광·숙소·기타)는 입력 화면과 타임라인 색 구분용일 뿐 저장하지 않는다.
 * 저장(Place.category, DB places.category)되는 건 세부값("점심", "소품샵" …)뿐이고,
 * 대분류는 세부값으로 거꾸로 찾는다. 목록에 없는 직접 입력값은 '기타'로 본다.
 */
export type CategoryGroup = 'meal' | 'tour' | 'stay' | 'etc'

export const CATEGORY_GROUPS: { key: CategoryGroup; label: string; options: string[] }[] = [
  { key: 'meal', label: '식사', options: ['아침', '점심', '저녁', '간식', '카페', '술집'] },
  { key: 'tour', label: '관광', options: ['관광지', '체험', '쇼핑', '소품샵'] },
  { key: 'stay', label: '숙소', options: ['호텔', '펜션'] },
  // 목록에 없는 직접 입력값도 기타로 본다
  { key: 'etc', label: '기타', options: ['이동'] },
]

/** 세부값 → 대분류. 비어 있으면 undefined, 목록에 없으면 'etc' */
export function categoryGroup(category?: string): CategoryGroup | undefined {
  const value = category?.trim()
  if (!value) return undefined
  return CATEGORY_GROUPS.find((group) => group.options.includes(value))?.key ?? 'etc'
}
