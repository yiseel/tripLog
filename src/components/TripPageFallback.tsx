import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { AuthApi } from '../hooks/useAuth'
import type { TripsApi } from '../hooks/useTrips'
import type { Trip } from '../types/trip'

/** 읽기 전용 여행 화면(정보·비용) 공용: 불러오는 중 / 로그인 필요 / 없는 여행이면 그 화면, 아니면 null */
export function tripPageFallback(api: TripsApi, auth: AuthApi, trip: Trip | undefined): ReactNode {
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
        <Link to="/" className="btn btn--primary">
          목록으로
        </Link>
      </div>
    )
  }

  return null
}
