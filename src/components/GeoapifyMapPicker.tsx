import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  GEOAPIFY_ATTRIBUTION,
  geoapifyTileUrl,
  getGeoapifyKey,
  reverseGeocode,
  searchPlaces,
  type GeoapifyPlace,
} from '../lib/geoapify'
import type { MapSelection } from './KakaoMapPicker'

interface Props {
  onSelect: (selection: MapSelection) => void
  /** 수정 중인 장소 좌표 — 있으면 그 위치에서 시작 */
  initial?: { lat: number; lng: number }
  /** 여행 지역(예: 도쿄) — 좌표가 없을 때 지도를 그 도시로 옮기고 검색도 그 근처 우선 */
  region?: string
}

const MARKER_STYLE: L.CircleMarkerOptions = {
  radius: 9,
  color: '#214f60',
  weight: 3,
  fillColor: '#A3CCDA',
  fillOpacity: 1,
}

/** 해외 여행용 지도 검색 (Geoapify + Leaflet). KakaoMapPicker 와 같은 모양·동작 */
export function GeoapifyMapPicker({ onSelect, initial, region }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const onSelectRef = useRef(onSelect)
  const nearRef = useRef<{ lat: number; lng: number } | undefined>(initial)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoapifyPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const hasKey = Boolean(getGeoapifyKey())

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const moveMarker = (lat: number, lng: number, zoom?: number) => {
    const map = mapInstance.current
    if (!map) return
    const latlng = L.latLng(lat, lng)
    if (markerRef.current) markerRef.current.setLatLng(latlng)
    else markerRef.current = L.circleMarker(latlng, MARKER_STYLE).addTo(map)
    map.setView(latlng, zoom ?? map.getZoom())
  }

  useEffect(() => {
    if (!hasKey || !mapRef.current) return
    let cancelled = false

    const map = L.map(mapRef.current, { worldCopyJump: true }).setView([20, 0], 2)
    mapInstance.current = map
    L.tileLayer(geoapifyTileUrl(), {
      attribution: GEOAPIFY_ATTRIBUTION,
      maxZoom: 20,
    }).addTo(map)

    if (initial) {
      moveMarker(initial.lat, initial.lng, 15)
    } else if (region?.trim()) {
      searchPlaces(region.trim())
        .then(([city]) => {
          if (cancelled || !city) return
          nearRef.current = { lat: city.lat, lng: city.lng }
          map.setView([city.lat, city.lng], 11)
        })
        .catch(() => undefined)
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      moveMarker(lat, lng)
      reverseGeocode(lat, lng)
        .then((place) => {
          if (cancelled || !place) return
          onSelectRef.current({ name: place.name, address: place.address, area: place.area, lat, lng })
        })
        .catch(() => undefined)
    })

    // 모달이 열리는 중에는 크기가 확정되지 않아 타일이 어긋날 수 있다
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      cancelled = true
      map.remove()
      mapInstance.current = null
      markerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = () => {
    const keyword = query.trim()
    if (!keyword) return
    setSearching(true)
    setSearchError('')
    searchPlaces(keyword, nearRef.current)
      .then((places) => {
        setResults(places)
        if (places.length === 0) setSearchError('검색 결과가 없습니다. 영어나 현지어로 검색해 보세요.')
      })
      .catch(() => {
        setResults([])
        setSearchError('검색하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      })
      .finally(() => setSearching(false))
  }

  const pickPlace = (place: GeoapifyPlace) => {
    moveMarker(place.lat, place.lng, 16)
    onSelect({ name: place.name, address: place.address, area: place.area, lat: place.lat, lng: place.lng })
    setResults([])
  }

  if (!hasKey) {
    return (
      <div className="map-fallback">
        <p className="map-fallback__title">지도 검색을 사용할 수 없습니다</p>
        <p className="map-fallback__desc">
          .env 파일에 VITE_GEOAPIFY_KEY를 설정하면 해외 장소 검색이 활성화됩니다. 아래 폼에 직접 입력해도 됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="map-picker">
      <form
        className="map-picker__search"
        onSubmit={(e) => {
          e.preventDefault()
          runSearch()
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장소 검색 (예: 도쿄 타워, Eiffel Tower)"
          aria-label="장소 검색"
        />
        <button type="submit" disabled={searching}>
          {searching ? '검색 중' : '검색'}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="map-picker__results">
          {results.map((place) => (
            <li key={place.id}>
              <button type="button" onClick={() => pickPlace(place)}>
                <strong>{place.name}</strong>
                <span>{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searchError && <p className="map-picker__hint">{searchError}</p>}

      <div className="map-picker__canvas" ref={mapRef} />
      <p className="map-picker__hint">지도를 클릭하거나 검색 결과에서 장소를 선택하세요 · 해외 지도</p>
    </div>
  )
}
