import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

/**
 * Supabase Auth는 이메일로만 계정을 만들 수 있어서, 사용자가 입력한 아이디를
 * "아이디@LOGIN_EMAIL_DOMAIN" 형태의 내부용 이메일로 바꿔 쓴다. 실제 메일은 보내지 않는다
 * (대시보드에서 Confirm email 을 꺼 둬야 함).
 */
const LOGIN_EMAIL_DOMAIN = 'triplog.local'

/** 아이디 규칙: 영문 소문자·숫자·밑줄 4~20자 */
const USERNAME_PATTERN = /^[a-z0-9_]{4,20}$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

/** 로그인용 이메일. '@'가 들어 있으면 예전(이메일로 가입한) 계정으로 보고 그대로 쓴다 */
function loginEmail(username: string): string {
  return username.includes('@') ? username : `${username}@${LOGIN_EMAIL_DOMAIN}`
}

/** 화면에 보여줄 아이디 */
export function usernameOf(user: User): string {
  const fromMeta = user.user_metadata?.username
  if (typeof fromMeta === 'string' && fromMeta) return fromMeta
  const email = user.email ?? ''
  return email.endsWith(`@${LOGIN_EMAIL_DOMAIN}`) ? email.split('@')[0] : email
}

function errorMessage(error: { message: string; code?: string }): string {
  if (error.code === 'invalid_credentials') return '아이디 또는 비밀번호가 올바르지 않습니다.'
  if (error.code === 'email_not_confirmed') {
    return '인증이 완료되지 않은 계정입니다. Supabase에서 Confirm email 설정을 꺼 주세요.'
  }
  if (error.code === 'user_already_exists' || error.code === 'email_exists') return '이미 사용 중인 아이디입니다.'
  if (error.code === 'weak_password') return '비밀번호는 6자 이상으로 입력해 주세요.'
  if (error.code === 'email_address_invalid') return '사용할 수 없는 아이디입니다.'
  // Confirm email 이 켜져 있으면 가입할 때마다 메일을 보내려다 발송 한도에 걸린다
  if (error.code === 'over_email_send_rate_limit') {
    return '인증 메일 발송 한도를 넘었습니다. Supabase에서 Confirm email 설정을 꺼 주세요.'
  }
  if (error.code === 'over_request_rate_limit') return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
  return `요청을 처리하지 못했습니다. ${error.message}`
}

async function ensureProfile(user: User) {
  if (!supabase) return
  await supabase.from('profiles').upsert({ id: user.id, username: usernameOf(user) })
}

/** Supabase Auth 세션. Supabase가 설정되지 않으면 로그인을 쓸 수 없다(available=false) */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  /** 성공하면 '', 실패하면 안내 문구 */
  const signIn = useCallback(async (rawUsername: string, password: string) => {
    if (!supabase) return 'Supabase가 설정되지 않아 로그인할 수 없습니다.'
    const username = normalizeUsername(rawUsername)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail(username),
      password,
    })
    if (error) return errorMessage(error)
    if (data.user) await ensureProfile(data.user)
    return ''
  }, [])

  /** 세션이 생기면 {}, 확인이 더 필요하면 notice, 실패하면 error */
  const signUp = useCallback(async (rawUsername: string, password: string) => {
    if (!supabase) return { error: 'Supabase가 설정되지 않아 가입할 수 없습니다.' }
    const username = normalizeUsername(rawUsername)
    if (!USERNAME_PATTERN.test(username)) {
      return { error: '아이디는 영문 소문자·숫자·밑줄(_)로 4~20자 입력해 주세요.' }
    }
    if (password.length < 6) return { error: '비밀번호는 6자 이상으로 입력해 주세요.' }
    const { data, error } = await supabase.auth.signUp({
      email: loginEmail(username),
      password,
      options: { data: { username } },
    })
    if (error) return { error: errorMessage(error) }
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return { error: '이미 사용 중인 아이디입니다.' }
    }
    if (!data.session) {
      return {
        notice: '가입은 되었지만 바로 로그인되지 않았습니다. Supabase에서 Confirm email 설정을 꺼 주세요.',
      }
    }
    if (data.user) await ensureProfile(data.user)
    return {}
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return {
    available: isSupabaseConfigured,
    loading,
    user: session?.user ?? null,
    signIn,
    signUp,
    signOut,
  }
}

export type AuthApi = ReturnType<typeof useAuth>
