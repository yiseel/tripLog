const KAKAO_SRC = '//dapi.kakao.com/v2/maps/sdk.js'

declare global {
  interface Window {
    kakao?: KakaoNamespace
  }
}

export interface KakaoLatLng {
  getLat: () => number
  getLng: () => number
}

export interface KakaoMap {
  setCenter: (latlng: KakaoLatLng) => void
  setLevel: (level: number) => void
  relayout: () => void
}

export interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void
  setPosition: (latlng: KakaoLatLng) => void
}

export interface KakaoPlace {
  id: string
  place_name: string
  address_name: string
  road_address_name: string
  x: string
  y: string
}

interface KakaoNamespace {
  maps: {
    load: (cb: () => void) => void
    LatLng: new (lat: number, lng: number) => KakaoLatLng
    Map: new (
      container: HTMLElement,
      options: { center: KakaoLatLng; level: number },
    ) => KakaoMap
    Marker: new (options: { position: KakaoLatLng }) => KakaoMarker
    event: {
      addListener: (target: KakaoMap, type: string, handler: (e: { latLng: KakaoLatLng }) => void) => void
    }
    services: {
      Places: new () => {
        keywordSearch: (
          keyword: string,
          callback: (data: KakaoPlace[], status: string) => void,
        ) => void
      }
      Status: { OK: string }
      Geocoder: new () => {
        coord2Address: (
          lng: number,
          lat: number,
          callback: (
            result: Array<{
              address?: { address_name: string }
              road_address?: { address_name: string }
            }>,
            status: string,
          ) => void,
        ) => void
      }
    }
  }
}

let loadPromise: Promise<KakaoNamespace> | null = null

export function getKakaoKey(): string {
  return import.meta.env.VITE_KAKAO_MAP_KEY?.trim() ?? ''
}

export function loadKakaoMaps(): Promise<KakaoNamespace> {
  const key = getKakaoKey()
  if (!key) {
    return Promise.reject(new Error('NO_KAKAO_KEY'))
  }

  if (window.kakao?.maps?.services) {
    return Promise.resolve(window.kakao)
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-maps]')
    if (existing) {
      existing.addEventListener('load', () => {
        window.kakao?.maps.load(() => {
          if (window.kakao) resolve(window.kakao)
          else reject(new Error('KAKAO_LOAD_FAILED'))
        })
      })
      return
    }

    const script = document.createElement('script')
    script.src = `${KAKAO_SRC}?appkey=${key}&libraries=services&autoload=false`
    script.async = true
    script.dataset.kakaoMaps = 'true'
    script.onload = () => {
      if (!window.kakao) {
        reject(new Error('KAKAO_LOAD_FAILED'))
        return
      }
      window.kakao.maps.load(() => {
        if (window.kakao) resolve(window.kakao)
        else reject(new Error('KAKAO_LOAD_FAILED'))
      })
    }
    script.onerror = () => {
      loadPromise = null
      reject(new Error('KAKAO_SCRIPT_ERROR'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
