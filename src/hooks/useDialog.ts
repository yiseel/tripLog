import { createContext, useContext } from 'react'

export interface DialogOptions {
  title?: string
  message: string
  /** 확인 버튼 문구 (기본: 확인) */
  confirmText?: string
  /** 취소 버튼 문구 (confirm 전용, 기본: 취소) */
  cancelText?: string
  /** 삭제처럼 되돌릴 수 없는 동작이면 확인 버튼을 빨간색으로 */
  danger?: boolean
}

export interface DialogApi {
  /** window.alert 대신 — 닫히면 resolve */
  alert: (options: DialogOptions | string) => Promise<void>
  /** window.confirm 대신 — 확인이면 true */
  confirm: (options: DialogOptions | string) => Promise<boolean>
}

export const DialogContext = createContext<DialogApi | null>(null)

export function useDialog(): DialogApi {
  const api = useContext(DialogContext)
  if (!api) throw new Error('useDialog는 DialogProvider 안에서만 쓸 수 있습니다.')
  return api
}
