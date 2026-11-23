export interface Place {
  id: string
  name: string
  address: string
  memo: string
  lat?: number
  lng?: number
  /** HH:MM */
  startTime?: string
  /** HH:MM */
  endTime?: string
  cost?: number
  /** 짧은 지역 표시 "파리 프랑스" — 해외 지도(Geoapify)에서 고를 때만 저장. 없으면 주소에서 계산 */
  area?: string
  /** 장소 분류 "점심", "소품샵", "호텔" 등 자유 텍스트. 나중에 추가된 필드라 optional */
  category?: string
}

export type TripType = 'domestic' | 'overseas'

export type Transport = 'car' | 'bus' | 'train' | 'plane'

/** 티켓 한 구간. 비행기 경유면 한 편(가는/오는 편)에 구간이 여러 개 */
export interface TicketSegment {
  /** 편명·열차·버스 이름 (예: KE701, KTX 101) */
  name: string
  /** 출발지 (공항·역·터미널) */
  from: string
  /** 도착지 */
  to: string
  /** 출발 시간 HH:MM */
  departTime: string
  /** 도착 시간 HH:MM */
  arriveTime: string
  /** 예약 금액(원) — 숫자만 담은 문자열. 비어 있으면 금액 없음 */
  price: string
}

/** 숙소 예약 (여행 정보 → 숙소) */
export interface Lodging {
  id: string
  name: string
  address: string
  /** 원 */
  cost?: number
}

/** 입장권 등 기타 예약 (여행 정보 → 기타 예약) */
export interface Reservation {
  id: string
  name: string
  memo: string
  /** 원 */
  cost?: number
  /** 예약 확인·바우처 등 관련 링크(URL). 나중에 추가된 필드라 optional */
  links?: string[]
}

/** 예전 데이터는 편마다 자유 텍스트였다 — 읽을 때 normalizeTickets 로 구간 배열로 바꾼다 */
export interface Tickets {
  outbound: TicketSegment[]
  inbound: TicketSegment[]
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface NoteItem {
  id: string
  text: string
}

export interface Trip {
  id: string
  title: string
  region: string
  startDate: string
  endDate: string
  companions: string
  tripType?: TripType
  transport?: Transport
  tickets?: Tickets
  /** 여행 목적 (자유 입력) */
  purpose?: string
  /** 숙소 예약 목록 */
  lodgings?: Lodging[]
  /** 기타 예약 목록 (입장권 등) */
  reservations?: Reservation[]
  /** 비용을 나눌 인원 (비용 화면 합계의 1인당 금액). 없으면 1명 */
  headcount?: number
  /** 준비물 체크리스트 (준비물·메모 화면) */
  checklist?: ChecklistItem[]
  /** 여행 메모 (준비물·메모 화면) */
  notes?: NoteItem[]
  /** day index (0 = 1일차) → places */
  days: Place[][]
  createdAt: string
  updatedAt: string
}

export interface TripMeta {
  title: string
  region: string
  startDate: string
  endDate: string
  companions: string
  tripType: TripType
  transport?: Transport
  tickets: Tickets
  purpose: string
  /** undefined 면 저장하지 않음(한 번도 쓴 적 없는 여행) */
  lodgings?: Lodging[]
  reservations?: Reservation[]
}

export interface PlaceDraft {
  name: string
  address: string
  memo: string
  lat?: number
  lng?: number
  startTime?: string
  endTime?: string
  cost?: number
  area?: string
  category?: string
}
