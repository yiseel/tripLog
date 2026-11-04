import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookingFields } from '../components/BookingFields'
import { DateRangeInput } from '../components/DateRangeInput'
import { PlaceModal } from '../components/PlaceModal'
import { TicketFields } from '../components/TicketFields'
import { Timeline } from '../components/Timeline'
import type { AuthApi } from '../hooks/useAuth'
import { useDialog } from '../hooks/useDialog'
import type { TripsApi } from '../hooks/useTrips'
import type {
  Lodging,
  Place,
  PlaceDraft,
  Reservation,
  Tickets,
  Transport,
  TripMeta,
  TripType,
} from '../types/trip'
import { hasLodging, hasReservation } from '../utils/costs'
import { autoTitle, formatDateRange } from '../utils/dates'
import { EMPTY_TICKETS, normalizeTickets } from '../utils/tickets'

interface Props {
  api: TripsApi
  auth: AuthApi
}

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: 'domestic', label: '국내 여행' },
  { value: 'overseas', label: '해외 여행' },
]

const TRANSPORTS: { value: Transport; label: string }[] = [
  { value: 'car', label: '자동차' },
  { value: 'bus', label: '버스' },
  { value: 'train', label: '기차' },
  { value: 'plane', label: '비행기' },
]

/** 필수값 검사 — 문제가 없으면 '' */
function validateMeta(meta: TripMeta): string {
  if (!meta.region.trim()) return '지역은 필수입니다.'
  if (!meta.startDate || !meta.endDate) return '시작일과 종료일은 필수입니다.'
  if (meta.endDate < meta.startDate) return '종료일은 시작일 이후여야 합니다.'
  return ''
}

export function TripDetailPage({ api, auth }: Props) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const dialog = useDialog()
  const trip = api.getTrip(id)

  const [title, setTitle] = useState('')
  const [region, setRegion] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [companions, setCompanions] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [tripType, setTripType] = useState<TripType>('domestic')
  const [transport, setTransport] = useState<Transport | undefined>()
  const [tickets, setTickets] = useState<Tickets>(EMPTY_TICKETS)
  const [purpose, setPurpose] = useState('')
  const [lodgings, setLodgings] = useState<Lodging[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])

  const [modalDay, setModalDay] = useState<number | null>(null)
  const [editing, setEditing] = useState<{ dayIndex: number; place: Place } | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [metaError, setMetaError] = useState('')

  useEffect(() => {
    if (!trip) return
    setTitle(trip.title)
    setRegion(trip.region)
    setStartDate(trip.startDate)
    setEndDate(trip.endDate)
    setCompanions(trip.companions)
    setTripType(trip.tripType ?? 'domestic')
    setTransport(trip.transport)
    setTickets(normalizeTickets(trip.tickets))
    setPurpose(trip.purpose ?? '')
    setLodgings(trip.lodgings ?? [])
    setReservations(trip.reservations ?? [])
    setTitleTouched(Boolean(trip.title && trip.title !== autoTitle(trip.region)))
  }, [trip?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const previewTitle = useMemo(() => {
    if (titleTouched && title.trim()) return title.trim()
    return autoTitle(region)
  }, [title, region, titleTouched])

  if (auth.loading || (auth.user && api.loading && !trip)) {
    return (
      <div className="page page--missing">
        <p>여행을 불러오는 중입니다.</p>
      </div>
    )
  }

  if (auth.available && !auth.user) {
    return (
      <div className="page page--missing">
        <p>로그인하면 나의 여행을 볼 수 있습니다.</p>
        <Link to="/login" className="btn btn--primary">
          로그인
        </Link>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="page page--missing">
        <p>{api.loading ? '여행을 불러오는 중입니다.' : '여행을 찾을 수 없습니다.'}</p>
        {api.error && (
          <p className="storage-error" role="alert">
            {api.error}
          </p>
        )}
        <Link to="/" className="btn btn--primary">
          목록으로
        </Link>
      </div>
    )
  }

  /** 빈 줄은 저장하지 않는다. 한 번도 쓴 적 없으면 undefined(DB 칸을 보내지 않음) */
  const filledOrUndefined = <T,>(items: T[], has: (item: T) => boolean, saved: T[] | undefined) => {
    const filled = items.filter(has)
    return filled.length > 0 || saved !== undefined ? filled : undefined
  }

  const persistMeta = async (next?: Partial<TripMeta>, showError = false) => {
    const payload: TripMeta = {
      title: next?.title ?? title,
      region: next?.region ?? region,
      startDate: next?.startDate ?? startDate,
      endDate: next?.endDate ?? endDate,
      companions: next?.companions ?? companions,
      tripType: next?.tripType ?? tripType,
      transport: next && 'transport' in next ? next.transport : transport,
      tickets: next?.tickets ?? tickets,
      purpose: next?.purpose ?? purpose,
      lodgings: filledOrUndefined(next?.lodgings ?? lodgings, hasLodging, trip.lodgings),
      reservations: filledOrUndefined(next?.reservations ?? reservations, hasReservation, trip.reservations),
    }
    // 필수값(지역·시작일·종료일)이 비어 있으면 저장하지 않는다
    const error = validateMeta(payload)
    if (error) {
      // 자동 저장(blur/선택)에서는 조용히 건너뛰고, 저장 버튼을 눌렀을 때만 안내한다
      if (showError) setMetaError(error)
      return false
    }
    setMetaError('')
    // 저장 버튼(showError)일 때만 새 여행을 목록에 추가한다
    const isDraft = trip.id === api.draftId
    const ok = await api.saveTripMeta(trip.id, payload, showError)
    if (!ok) return false
    // 목록에 추가되기 전의 자동 저장은 실제 저장이 아니므로 "저장됨"을 띄우지 않는다
    if (isDraft && !showError) return true
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1400)
    return true
  }

  const handleSaveClick = async () => {
    const finalTitle = titleTouched && title.trim() ? title.trim() : autoTitle(region)
    // 저장 버튼/Enter로 저장에 성공하면 정보 화면으로 간다 (자동 저장은 머무름)
    if (await persistMeta({ title: finalTitle }, true)) navigate(`/trips/${trip.id}`)
  }

  const handleAddPlace = (dayIndex: number) => {
    setEditing(null)
    setModalDay(dayIndex)
  }

  const handleEditPlace = (dayIndex: number, place: Place) => {
    setModalDay(dayIndex)
    setEditing({ dayIndex, place })
  }

  const handleSubmitPlace = (draft: PlaceDraft) => {
    if (modalDay === null) return
    if (editing) {
      api.updatePlace(trip.id, editing.dayIndex, editing.place.id, draft)
    } else {
      api.addPlace(trip.id, modalDay, draft)
    }
    setEditing(null)
    setModalDay(null)
  }

  const handleDelete = async () => {
    const confirmed = await dialog.confirm({
      title: '여행 삭제',
      message: '이 여행 기록을 삭제할까요?\n삭제한 기록은 되돌릴 수 없습니다.',
      confirmText: '삭제',
      danger: true,
    })
    if (!confirmed) return
    const ok = await api.deleteTrip(trip.id)
    if (ok) navigate('/')
  }

  return (
    <div className="page page--detail">
      <header className="detail-top">
        <div className="detail-top__inner">
          {/* 이미 목록에 있는 여행은 정보 화면으로, 저장 전 새 여행은 목록으로 */}
          <Link to={trip.id === api.draftId ? '/' : `/trips/${trip.id}`} className="back-link">
            ← Trip Log
          </Link>
          <div className="detail-top__actions">
            {savedFlash && <span className="save-flash">저장됨</span>}
            <button type="button" className="btn btn--ghost" onClick={handleDelete}>
              삭제
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSaveClick}
            >
              저장
            </button>
          </div>
        </div>
      </header>

      <div className="detail-body">
      {api.error && (
        <p className="storage-error" role="alert">
          {api.error}
        </p>
      )}
      <section className="meta-panel">
        <div className="meta-panel__intro">
          <p className="brand brand--sm">Trip Log</p>
          <h1>{previewTitle}</h1>
          <p className="meta-panel__range">
            {startDate && endDate ? formatDateRange(startDate, endDate) : '일정을 선택해 주세요'}
          </p>
        </div>

        <form
          className="meta-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSaveClick()
          }}
        >
          <label>
            <span>여행 제목</span>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setTitleTouched(true)
              }}
              onBlur={() => persistMeta()}
              placeholder={autoTitle(region)}
            />
            <small>비워두면 &quot;{autoTitle(region || '지역')}&quot;으로 자동 저장됩니다</small>
          </label>

          <div className="meta-form__field">
            <span>여행 구분</span>
            <div className="segmented" role="radiogroup" aria-label="여행 구분">
              {TRIP_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={tripType === option.value}
                  className={`segmented__item${tripType === option.value ? ' segmented__item--active' : ''}`}
                  onClick={() => {
                    setTripType(option.value)
                    persistMeta({ tripType: option.value })
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label>
            <span>
              지역 <em>*</em>
            </span>
            <input
              value={region}
              onChange={(e) => {
                const value = e.target.value
                setRegion(value)
                if (!titleTouched) setTitle(autoTitle(value))
              }}
              onBlur={() => persistMeta()}
              placeholder="예: 강원도"
              required
            />
          </label>

          <div className="meta-form__field">
            <span>
              기간 <em>*</em>
            </span>
            <DateRangeInput
              start={startDate}
              end={endDate}
              onStartChange={(value) => {
                setStartDate(value)
                const nextEnd = endDate < value ? value : endDate
                if (endDate < value) setEndDate(value)
                persistMeta({ startDate: value, endDate: nextEnd })
              }}
              onEndChange={(value) => {
                setEndDate(value)
                persistMeta({ endDate: value })
              }}
              onRangeChange={(nextStart, nextEnd) => {
                setStartDate(nextStart)
                setEndDate(nextEnd)
                persistMeta({ startDate: nextStart, endDate: nextEnd })
              }}
            />
          </div>

          <label>
            <span>같이 간 사람</span>
            <input
              value={companions}
              onChange={(e) => setCompanions(e.target.value)}
              onBlur={() => persistMeta()}
              placeholder="예: 가족 / 친구들 / 혼자"
            />
          </label>

          <div className="meta-form__field">
            <span>교통수단</span>
            <div className="segmented" role="radiogroup" aria-label="교통수단">
              {TRANSPORTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={transport === option.value}
                  className={`segmented__item${transport === option.value ? ' segmented__item--active' : ''}`}
                  onClick={() => {
                    // 같은 항목을 다시 누르면 선택 해제
                    const value = transport === option.value ? undefined : option.value
                    setTransport(value)
                    // 경유(여러 구간)는 비행기만 — 다른 교통수단으로 바꾸면 첫 구간만 남긴다
                    const nextTickets =
                      value === 'plane'
                        ? tickets
                        : { outbound: tickets.outbound.slice(0, 1), inbound: tickets.inbound.slice(0, 1) }
                    setTickets(nextTickets)
                    persistMeta({ transport: value, tickets: nextTickets })
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {transport && transport !== 'car' && (
            <TicketFields
              transport={transport}
              tickets={tickets}
              onChange={setTickets}
              onCommit={(next) => persistMeta({ tickets: next })}
            />
          )}

          <label>
            <span>목적</span>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              onBlur={() => persistMeta()}
              placeholder="예: 가족 여행 / 휴식 / 맛집 탐방 / 출장"
            />
          </label>

          <BookingFields
            title="숙소"
            detailKey="address"
            labels={{ name: '숙소명', detail: '주소' }}
            placeholders={{ name: '예: 강릉 씨마크 호텔', detail: '예: 강원 강릉시 해안로 406', cost: '예: 240,000' }}
            items={lodgings}
            createItem={(itemId) => ({ id: itemId, name: '', address: '' })}
            onChange={setLodgings}
            onCommit={(next) => persistMeta({ lodgings: next })}
          />

          <BookingFields
            title="기타 예약"
            detailKey="memo"
            labels={{ name: '예약명', detail: '메모' }}
            placeholders={{ name: '예: 아르떼뮤지엄 입장권', detail: '예: 성인 2매, 현장 발권', cost: '예: 34,000' }}
            items={reservations}
            createItem={(itemId) => ({ id: itemId, name: '', memo: '' })}
            onChange={setReservations}
            onCommit={(next) => persistMeta({ reservations: next })}
          />

          {metaError && <p className="form-error">{metaError}</p>}
        </form>
      </section>

      <section className="timeline-section">
        <div className="timeline-section__head">
          <div className="timeline-section__title">
            <h2>일자별 타임라인</h2>
          </div>
          <p>드래그하여 같은 날 순서 변경 · 다른 일자로 이동할 수 있습니다</p>
        </div>
        {/* 스케줄 표는 정보 화면(TripViewPage)에서만 본다 */}
        <Timeline
          startDate={trip.startDate}
          days={trip.days}
          onReorder={(days) => api.reorderPlaces(trip.id, days)}
          onAddPlace={handleAddPlace}
          onEditPlace={handleEditPlace}
        />
      </section>
      </div>

      <PlaceModal
        open={modalDay !== null}
        dayLabel={modalDay !== null ? `${modalDay + 1}일차` : ''}
        initial={editing?.place ?? null}
        overseas={tripType === 'overseas'}
        region={region}
        onClose={() => {
          setModalDay(null)
          setEditing(null)
        }}
        onSubmit={handleSubmitPlace}
        onDelete={
          editing
            ? () => {
                api.removePlace(trip.id, editing.dayIndex, editing.place.id)
                setEditing(null)
                setModalDay(null)
              }
            : undefined
        }
      />
    </div>
  )
}
