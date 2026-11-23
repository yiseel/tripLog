import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthButton } from '../components/AuthButton'
import { Pagination } from '../components/Pagination'
import { TripCard } from '../components/TripCard'
import type { AuthApi } from '../hooks/useAuth'
import type { TripsApi } from '../hooks/useTrips'
import type { Trip, TripType } from '../types/trip'

interface Props {
  api: TripsApi
  auth: AuthApi
}

/** 한 페이지에 보여줄 여행 카드 수 */
const PAGE_SIZE = 10

function tripYears(trip: Trip): number[] {
  const start = Number(trip.startDate.slice(0, 4))
  const end = Number(trip.endDate.slice(0, 4)) || start
  if (!start) return []
  const years: number[] = []
  for (let y = start; y <= end; y++) years.push(y)
  return years
}

export function TripListPage({ api, auth }: Props) {
  const navigate = useNavigate()
  const [year, setYear] = useState('')
  const [tripType, setTripType] = useState<TripType | ''>('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleCreate = () => {
    if (auth.available && !auth.user) {
      navigate('/login')
      return
    }
    const trip = api.createTrip()
    navigate(`/trips/${trip.id}/edit`)
  }

  const years = useMemo(
    () => [...new Set(api.trips.flatMap(tripYears))].sort((a, b) => b - a),
    [api.trips],
  )

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    const matched = api.trips.filter((trip) => {
      // 연도를 걸친 여행(12/30 ~ 1/2)은 양쪽 연도 모두에서 검색됨
      if (year && !tripYears(trip).includes(Number(year))) return false
      // tripType 이 없는 예전 기록은 국내로 본다
      if (tripType && (trip.tripType ?? 'domestic') !== tripType) return false
      if (keyword && !(trip.title || '제목 없음').toLowerCase().includes(keyword)) return false
      return true
    })
    // 시작일이 최근인 여행부터, 같은 날이면 나중에 만든 여행부터
    return matched.sort(
      (a, b) => b.startDate.localeCompare(a.startDate) || b.createdAt.localeCompare(a.createdAt),
    )
  }, [api.trips, year, tripType, query])

  // 삭제 등으로 페이지 수가 줄면 마지막 페이지로 맞춘다
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageTrips = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const changePage = (next: number) => {
    setPage(next)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 카드 목록이 보이는 상태(불러오는 중·로그인 필요·빈 목록·검색 결과 없음이 아님)
  const showList =
    !(auth.loading || (api.loading && api.trips.length === 0)) &&
    !(auth.available && !auth.user) &&
    api.trips.length > 0 &&
    filtered.length > 0

  return (
    <div className="page page--list">
      <header className="hero">
        <div className="hero__veil" aria-hidden="true" />
        <div className="hero__inner">
          {/* 소개 문구 + 로그인 버튼 한 줄, 그 아래 로고 */}
          <div className="hero__top">
            <p className="hero__lead">일자별로 장소를 모아, 여행을 한눈에 남기세요.</p>
            <AuthButton auth={auth} />
          </div>
          <p className="brand">Trip Log</p>

          <div className="trip-search" role="search">
            <select
              className="trip-search__year"
              value={year}
              onChange={(e) => {
                setYear(e.target.value)
                setPage(1)
              }}
              aria-label="연도 선택"
            >
              <option value="">전체 연도</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              className="trip-search__year"
              value={tripType}
              onChange={(e) => {
                setTripType(e.target.value as TripType | '')
                setPage(1)
              }}
              aria-label="여행 구분 선택"
            >
              <option value="">국내·해외</option>
              <option value="domestic">국내 여행</option>
              <option value="overseas">해외 여행</option>
            </select>
            <input
              type="search"
              className="trip-search__query"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="여행 제목 검색"
              aria-label="여행 제목 검색"
            />
          </div>
        </div>
      </header>

      {/* hero(overflow: hidden) 밖에 두고 위로 끌어올려 hero와 list-main 경계에 걸치게 함 */}
      <div className="hero-cta">
        <button type="button" className="btn btn--primary btn--lg" onClick={handleCreate}>
          + 새 여행 작성
        </button>
      </div>

      {/* 개수 · 페이지 위치도 고정 — 카드 목록이 보일 때만 */}
      {showList && (
        <div className="list-summary">
          <div className="trip-search__count">
            <p>
              {year || tripType || query.trim() ? '검색 결과' : '전체 여행'}
              <strong>{filtered.length}</strong>
            </p>
            {totalPages > 1 && (
              <span>
                {currentPage} / {totalPages} 페이지
              </span>
            )}
          </div>
        </div>
      )}

      {/* hero / hero-cta / list-summary 는 고정, 이 영역만 스크롤 */}
      <div className="list-scroll" ref={scrollRef}>
        <main className="list-main">
          {api.error && (
            <p className="storage-error" role="alert">
              {api.error}
            </p>
          )}
          {auth.loading || (api.loading && api.trips.length === 0) ? (
            <div className="empty-state">
              <p>여행을 불러오는 중입니다.</p>
            </div>
          ) : auth.available && !auth.user ? (
            <div className="empty-state">
              <p>로그인하면 나의 여행 기록을 볼 수 있습니다.</p>
              <Link to="/login" className="btn btn--ghost">
                로그인
              </Link>
            </div>
          ) : api.trips.length === 0 ? (
            <div className="empty-state">
              <p>아직 기록된 여행이 없습니다.</p>
              <button type="button" className="btn btn--ghost" onClick={handleCreate}>
                첫 여행 만들기
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>조건에 맞는 여행이 없습니다.</p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setYear('')
                  setTripType('')
                  setQuery('')
                  setPage(1)
                }}
              >
                검색 초기화
              </button>
            </div>
          ) : (
            <>
              <div className="trip-grid">
                {pageTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
              <Pagination page={currentPage} totalPages={totalPages} onChange={changePage} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
