import { useEffect, useId, useState, type FormEvent } from 'react'
import { useDialog } from '../hooks/useDialog'
import type { Place, PlaceDraft } from '../types/trip'
import { CATEGORY_GROUPS, categoryGroup, type CategoryGroup } from '../utils/category'
import { normalizeTime, typingTime } from '../utils/time'
import { GeoapifyMapPicker } from './GeoapifyMapPicker'
import { KakaoMapPicker, type MapSelection } from './KakaoMapPicker'

/** 세부 종류 셀렉트의 "직접입력" 값 */
const CUSTOM = '__custom'

interface Props {
  open: boolean
  dayLabel: string
  initial?: Place | null
  /** 해외 여행이면 Geoapify 지도, 국내면 카카오맵 */
  overseas?: boolean
  /** 여행 지역 — 해외 지도의 시작 위치·검색 우선 지역 */
  region?: string
  onClose: () => void
  onSubmit: (draft: PlaceDraft) => void
  /** 수정 모드에서만 전달 — 있으면 삭제 버튼 표시 */
  onDelete?: () => void
}

export function PlaceModal({ open, dayLabel, initial, overseas, region, onClose, onSubmit, onDelete }: Props) {
  const titleId = useId()
  const dialog = useDialog()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [cost, setCost] = useState('')
  const [area, setArea] = useState<string | undefined>()
  /** 종류: 대분류(색 구분용, 저장 안 함) / 세부 셀렉트 값(목록 값 또는 CUSTOM) / 직접입력 글자 */
  const [catGroup, setCatGroup] = useState<CategoryGroup | ''>('')
  const [catDetail, setCatDetail] = useState('')
  const [catCustom, setCatCustom] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setAddress(initial?.address ?? '')
    setMemo(initial?.memo ?? '')
    setLat(initial?.lat)
    setLng(initial?.lng)
    setStartTime(initial?.startTime ?? '')
    setEndTime(initial?.endTime ?? '')
    setCost(initial?.cost !== undefined ? String(initial.cost) : '')
    setArea(initial?.area)
    const savedCategory = initial?.category ?? ''
    const savedGroup = categoryGroup(savedCategory)
    const listed = CATEGORY_GROUPS.some((group) => group.options.includes(savedCategory))
    setCatGroup(savedGroup ?? '')
    setCatDetail(savedGroup ? (listed ? savedCategory : CUSTOM) : '')
    setCatCustom(listed ? '' : savedCategory)
    setError('')
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleMapSelect = (selection: MapSelection) => {
    setName(selection.name)
    setAddress(selection.address)
    setLat(selection.lat)
    setLng(selection.lng)
    setArea(selection.area)
    setError('')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('장소명(상호명)은 필수입니다.')
      return
    }
    const start = normalizeTime(startTime)
    const end = normalizeTime(endTime)
    if (start === null || end === null) {
      setError('시간은 11:20 처럼 00:00 ~ 23:59 사이로 입력해 주세요.')
      return
    }
    const category = !catGroup ? '' : catDetail === CUSTOM ? catCustom.trim() : catDetail
    if (catGroup && !category) {
      setError(catDetail === CUSTOM ? '종류를 직접 입력해 주세요.' : '세부 종류를 골라 주세요.')
      return
    }
    if (start && end && end < start) {
      setError('종료 시간은 시작 시간 이후여야 합니다.')
      return
    }
    onSubmit({
      name,
      address,
      memo,
      lat,
      lng,
      startTime: start,
      endTime: end,
      cost: cost ? Number(cost) : undefined,
      area,
      category: category || undefined,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <p className="modal__eyebrow">{dayLabel}</p>
            <h2 id={titleId}>{initial ? '장소 수정' : '장소 추가'}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        {overseas ? (
          <GeoapifyMapPicker
            onSelect={handleMapSelect}
            initial={
              initial?.lat !== undefined && initial?.lng !== undefined
                ? { lat: initial.lat, lng: initial.lng }
                : undefined
            }
            region={region}
          />
        ) : (
          <KakaoMapPicker onSelect={handleMapSelect} />
        )}

        <form className="modal__form" onSubmit={handleSubmit}>
          <label>
            <span>
              장소명(상호명) <em>*</em>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 속초 중앙시장"
              required
              autoFocus
            />
          </label>
          <div className="modal__field">
            <span>종류</span>
            <div className="category-select">
              <select
                value={catGroup}
                onChange={(e) => {
                  const next = e.target.value as CategoryGroup | ''
                  setCatGroup(next)
                  // 세부 목록이 없는 대분류만 바로 직접입력
                  const options = CATEGORY_GROUPS.find((group) => group.key === next)?.options ?? []
                  setCatDetail(next && options.length === 0 ? CUSTOM : '')
                }}
                aria-label="종류 대분류"
              >
                <option value="">선택 안 함</option>
                {CATEGORY_GROUPS.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.label}
                  </option>
                ))}
              </select>
              {catGroup && (
                <select
                  value={catDetail}
                  onChange={(e) => setCatDetail(e.target.value)}
                  aria-label="세부 종류"
                >
                  <option value="" disabled>
                    세부 선택
                  </option>
                  {CATEGORY_GROUPS.find((group) => group.key === catGroup)?.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  <option value={CUSTOM}>직접입력</option>
                </select>
              )}
            </div>
            {catGroup && catDetail === CUSTOM && (
              <input
                value={catCustom}
                onChange={(e) => setCatCustom(e.target.value)}
                placeholder="예: 브런치, 시장, 게스트하우스"
                maxLength={20}
                aria-label="종류 직접입력"
              />
            )}
          </div>
          <label>
            <span>장소 주소</span>
            <input
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                // 주소를 직접 고치면 지도에서 받은 도시·국가와 맞지 않을 수 있어 주소에서 다시 계산하게 둔다
                setArea(undefined)
              }}
              placeholder="선택 입력"
            />
          </label>
          <div className="modal__row">
            <label>
              <span>시간대</span>
              <div className="time-range">
                <input
                  inputMode="numeric"
                  value={startTime}
                  onChange={(e) => setStartTime(typingTime(e.target.value))}
                  onBlur={() => setStartTime(normalizeTime(startTime) ?? startTime)}
                  placeholder="11:20"
                  aria-label="시작 시간"
                />
                <span aria-hidden="true">~</span>
                <input
                  inputMode="numeric"
                  value={endTime}
                  onChange={(e) => setEndTime(typingTime(e.target.value))}
                  onBlur={() => setEndTime(normalizeTime(endTime) ?? endTime)}
                  placeholder="14:20"
                  aria-label="종료 시간"
                />
              </div>
            </label>
            <label>
              <span>비용</span>
              <div className="cost-input">
                <input
                  inputMode="numeric"
                  value={cost ? Number(cost).toLocaleString('ko-KR') : ''}
                  onChange={(e) => setCost(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="선택 입력"
                />
                <span aria-hidden="true">원</span>
              </div>
            </label>
          </div>
          <label>
            <span>간략 메모</span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 닭강정 포장, 주차장 혼잡"
              rows={3}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal__actions">
            {onDelete && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={async () => {
                  const confirmed = await dialog.confirm({
                    title: '장소 삭제',
                    message: `"${initial?.name ?? '이 장소'}"을(를) 삭제할까요?`,
                    confirmText: '삭제',
                    danger: true,
                  })
                  if (confirmed) onDelete()
                }}
              >
                삭제
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn--primary">
              {initial ? '저장하기' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
