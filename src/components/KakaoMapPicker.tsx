import { useEffect, useRef, useState } from 'react'
import {
  getKakaoKey,
  loadKakaoMaps,
  type KakaoMap,
  type KakaoMarker,
  type KakaoPlace,
} from '../lib/kakao'

/** 지도에서 고른 장소 — 카카오/Geoapify 공용 */
export interface MapSelection {
  name: string
  address: string
  lat: number
  lng: number
  /** 해외 지도만 — "파리 프랑스" */
  area?: string
}

interface Props {
  onSelect: (selection: MapSelection) => void
}

export function KakaoMapPicker({ onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<KakaoMap | null>(null)
  const markerRef = useRef<KakaoMarker | null>(null)
  const onSelectRef = useRef(onSelect)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<KakaoPlace[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-key' | 'error'>('loading')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    if (!getKakaoKey()) {
      setStatus('no-key')
      return
    }

    let cancelled = false

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapRef.current) return
        const center = new kakao.maps.LatLng(37.5665, 126.978)
        const map = new kakao.maps.Map(mapRef.current, { center, level: 5 })
        mapInstance.current = map
        markerRef.current = new kakao.maps.Marker({ position: center })
        markerRef.current.setMap(map)

        kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
          const latlng = mouseEvent.latLng
          markerRef.current?.setPosition(latlng)
          const geocoder = new kakao.maps.services.Geocoder()
          geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result, st) => {
            if (st !== kakao.maps.services.Status.OK || !result[0]) return
            const addr =
              result[0].road_address?.address_name ||
              result[0].address?.address_name ||
              ''
            onSelectRef.current({
              name: addr.split(' ').slice(-1)[0] || addr,
              address: addr,
              lat: latlng.getLat(),
              lng: latlng.getLng(),
            })
          })
        })

        // Modal may open before layout settles
        requestAnimationFrame(() => map.relayout())
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const runSearch = () => {
    const keyword = query.trim()
    if (!keyword || status !== 'ready') return

    setSearching(true)
    loadKakaoMaps().then((kakao) => {
      const places = new kakao.maps.services.Places()
      places.keywordSearch(keyword, (data, st) => {
        setSearching(false)
        if (st === kakao.maps.services.Status.OK) {
          setResults(data.slice(0, 8))
        } else {
          setResults([])
        }
      })
    })
  }

  const pickPlace = (place: KakaoPlace) => {
    const lat = Number(place.y)
    const lng = Number(place.x)
    loadKakaoMaps().then((kakao) => {
      const latlng = new kakao.maps.LatLng(lat, lng)
      mapInstance.current?.setCenter(latlng)
      mapInstance.current?.setLevel(3)
      markerRef.current?.setPosition(latlng)
    })
    onSelect({
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      lat,
      lng,
    })
    setResults([])
  }

  if (status === 'no-key' || status === 'error') {
    return (
      <div className="map-fallback">
        <p className="map-fallback__title">지도 검색을 사용할 수 없습니다</p>
        <p className="map-fallback__desc">
          {status === 'no-key'
            ? '.env 파일에 VITE_KAKAO_MAP_KEY를 설정하면 카카오맵 검색이 활성화됩니다. 아래 폼에 직접 입력해도 됩니다.'
            : '카카오맵 SDK 로드가 거부되었습니다. 키가 아니라 Web 도메인 등록 문제일 가능성이 큽니다. Kakao Developers → 앱 설정 → 플랫폼 → Web에 http://localhost:5173 을 추가한 뒤 새로고침해 주세요. 그전까지는 아래 폼에 직접 입력할 수 있습니다.'}
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
          placeholder="장소 검색 (예: 속초 중앙시장)"
          aria-label="장소 검색"
        />
        <button type="submit" disabled={searching || status !== 'ready'}>
          {searching ? '검색 중' : '검색'}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="map-picker__results">
          {results.map((place) => (
            <li key={place.id}>
              <button type="button" onClick={() => pickPlace(place)}>
                <strong>{place.place_name}</strong>
                <span>{place.road_address_name || place.address_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="map-picker__canvas" ref={mapRef}>
        {status === 'loading' && <div className="map-picker__loading">지도 불러오는 중…</div>}
      </div>
      <p className="map-picker__hint">지도를 클릭하거나 검색 결과에서 장소를 선택하세요</p>
    </div>
  )
}
