import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  ''

export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase가 설정되지 않았습니다. .env에 VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY를 넣어 주세요.',
    )
  }
  return supabase
}
