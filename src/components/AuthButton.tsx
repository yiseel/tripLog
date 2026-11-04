import { Link } from 'react-router-dom'
import { usernameOf, type AuthApi } from '../hooks/useAuth'

interface Props {
  auth: AuthApi
}

/** header용 로그인/로그아웃 버튼 */
export function AuthButton({ auth }: Props) {
  if (auth.loading) return null

  if (auth.user) {
    return (
      <button
        type="button"
        className="btn btn--small btn--ghost auth-btn"
        onClick={() => auth.signOut()}
        title={usernameOf(auth.user)}
      >
        로그아웃
      </button>
    )
  }

  return (
    <Link to="/login" className="btn btn--small btn--ghost auth-btn">
      로그인
    </Link>
  )
}
