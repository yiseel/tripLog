import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import type { AuthApi } from '../hooks/useAuth'

interface Props {
  auth: AuthApi
}

export function LoginPage({ auth }: Props) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [submitting, setSubmitting] = useState(false)

  if (auth.user) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    setError('')
    setNotice('')
    if (mode === 'signUp') {
      const result = await auth.signUp(username, password)
      setSubmitting(false)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.notice) {
        setError('')
        setNotice(result.notice)
        setMode('signIn')
        return
      }
      navigate('/')
      return
    }
    const message = await auth.signIn(username, password)
    setSubmitting(false)
    if (message) {
      setError(message)
      return
    }
    navigate('/')
  }

  return (
    <div className="page page--login">
      <div className="login-card">
        <Link to="/" className="back-link">
          ← Trip Log
        </Link>
        <h1>{mode === 'signUp' ? '회원가입' : '로그인'}</h1>

        {!auth.available && (
          <p className="storage-error" role="alert">
            Supabase가 설정되지 않아 로그인할 수 없습니다.
          </p>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>아이디</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'signUp' ? '영문 소문자·숫자·밑줄 4~20자' : '아이디'}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              required
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="login-card__note">{notice}</p>}
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !auth.available}
          >
            {submitting ? '처리 중…' : mode === 'signUp' ? '가입하기' : '로그인'}
          </button>
        </form>

        <button
          type="button"
          className="login-card__switch"
          onClick={() => {
            setMode(mode === 'signUp' ? 'signIn' : 'signUp')
            setError('')
            setNotice('')
          }}
        >
          {mode === 'signUp' ? '이미 계정이 있으면 로그인' : '계정이 없으면 회원가입'}
        </button>
      </div>
    </div>
  )
}
