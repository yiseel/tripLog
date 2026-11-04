import type { Place } from '../types/trip'

/** 국내(카카오) 주소: "충북 충주시 중앙탑면 중앙탑길 109" → "충북 충주시" */
function shortDomestic(address: string): string {
  const tokens = address.trim().split(/\s+/)
  // 세종은 시·도 아래 시·군·구가 없다 ("세종특별자치시 한누리대로 …")
  if (tokens[0]?.startsWith('세종')) return tokens[0]
  return tokens.slice(0, 2).join(' ')
}

/**
 * 해외(Geoapify) 주소에서 도시·국가 추정: "루브르 박물관, Rue de Rivoli, 75001 파리, 프랑스" → "파리 프랑스".
 * 도시·국가를 따로 저장하기 전에 고른 장소용 — 뒤에서부터 우편번호를 뺀 첫 지명을 도시로 본다.
 */
function shortOverseas(address: string): string {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean)
  const country = parts[parts.length - 1] ?? ''
  for (let i = parts.length - 2; i >= 0; i--) {
    const name = parts[i].replace(/\b[\d-]{3,}\b/g, '').trim()
    if (name && !/\d/.test(name)) return `${name} ${country}`
  }
  return country
}

/** 장소 카드에 붙이는 짧은 지역 표시 */
export function shortArea(place: Pick<Place, 'address' | 'area'>): string {
  if (place.area?.trim()) return place.area.trim()
  const address = place.address.trim()
  if (!address) return ''
  // 카카오 주소는 쉼표가 없고, Geoapify 주소는 쉼표로 구분된다
  return address.includes(',') ? shortOverseas(address) : shortDomestic(address)
}
