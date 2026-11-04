/** Geoapify — 해외 여행 장소 검색·지도. 국내는 카카오맵을 쓴다 */
const API = 'https://api.geoapify.com/v1/geocode'

export const GEOAPIFY_ATTRIBUTION =
  'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | © <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

export interface GeoapifyPlace {
  id: string
  name: string
  address: string
  /** "파리 프랑스" — 장소 카드의 짧은 지역 표시 */
  area: string
  lat: number
  lng: number
}

interface Feature {
  properties: {
    place_id?: string
    name?: string
    formatted?: string
    address_line1?: string
    city?: string
    state?: string
    country?: string
    lat: number
    lon: number
  }
}

export function getGeoapifyKey(): string {
  return import.meta.env.VITE_GEOAPIFY_KEY?.trim() ?? ''
}

/** {r} 은 Leaflet 이 고해상도 화면에서 "@2x" 로 바꿔 준다 */
export function geoapifyTileUrl(): string {
  return `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}{r}.png?apiKey=${getGeoapifyKey()}`
}

function toPlace(feature: Feature, index: number): GeoapifyPlace {
  const p = feature.properties
  return {
    id: p.place_id ?? `${p.lat},${p.lon},${index}`,
    name: p.name || p.address_line1 || p.formatted || '',
    address: p.formatted ?? '',
    // 도시가 없는 결과(국가·지방 단위)는 주(state)로 대신한다
    area: [p.city || p.state, p.country].filter(Boolean).join(' '),
    lat: p.lat,
    lng: p.lon,
  }
}

async function request(path: string, params: Record<string, string>): Promise<GeoapifyPlace[]> {
  const query = new URLSearchParams({ ...params, lang: 'ko', apiKey: getGeoapifyKey() })
  const response = await fetch(`${API}/${path}?${query}`)
  if (!response.ok) throw new Error(`GEOAPIFY_${response.status}`)
  const data = (await response.json()) as { features?: Feature[] }
  return (data.features ?? []).map(toPlace)
}

/** 장소·주소 검색. near 가 있으면 그 근처 결과를 먼저 보여준다 */
export function searchPlaces(text: string, near?: { lat: number; lng: number }): Promise<GeoapifyPlace[]> {
  const params: Record<string, string> = { text, limit: '8' }
  if (near) params.bias = `proximity:${near.lng},${near.lat}`
  return request('autocomplete', params)
}

/** 좌표 → 주소 (지도 클릭) */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoapifyPlace | null> {
  const [place] = await request('reverse', { lat: String(lat), lon: String(lng) })
  return place ?? null
}
