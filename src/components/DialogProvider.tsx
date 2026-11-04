import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { DialogContext, type DialogApi, type DialogOptions } from '../hooks/useDialog'

interface OpenDialog extends DialogOptions {
  kind: 'alert' | 'confirm'
  resolve: (ok: boolean) => void
}

function toOptions(options: DialogOptions | string): DialogOptions {
  return typeof options === 'string' ? { message: options } : options
}

/** 앱 전체에서 쓰는 alert/confirm 팝업. 브라우저 기본 팝업 대신 useDialog()로 연다 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<OpenDialog | null>(null)

  const open = useCallback(
    (kind: OpenDialog['kind'], options: DialogOptions | string) =>
      new Promise<boolean>((resolve) => {
        setDialog({ ...toOptions(options), kind, resolve })
      }),
    [],
  )

  const api = useMemo<DialogApi>(
    () => ({
      alert: (options) => open('alert', options).then(() => undefined),
      confirm: (options) => open('confirm', options),
    }),
    [open],
  )

  const close = useCallback(
    (ok: boolean) => {
      dialog?.resolve(ok)
      setDialog(null)
    },
    [dialog],
  )

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && <DialogView dialog={dialog} onClose={close} />}
    </DialogContext.Provider>
  )
}

function DialogView({ dialog, onClose }: { dialog: OpenDialog; onClose: (ok: boolean) => void }) {
  const titleId = useId()
  const messageId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)
  const isConfirm = dialog.kind === 'confirm'

  useEffect(() => {
    confirmRef.current?.focus()
    // 캡처 단계에서 먼저 받아 막아야 아래에 열린 장소 모달의 Esc 닫기가 같이 실행되지 않는다
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  // rise 애니메이션의 transform 안에서 fixed 위치가 어긋나지 않도록 body로 포털
  return createPortal(
    <div className="dialog-backdrop" role="presentation" onClick={() => onClose(false)}>
      <div
        className="dialog"
        role={isConfirm ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={dialog.title ? titleId : undefined}
        aria-describedby={messageId}
        onClick={(e) => e.stopPropagation()}
      >
        {dialog.title && (
          <h2 id={titleId} className="dialog__title">
            {dialog.title}
          </h2>
        )}
        <p id={messageId} className="dialog__message">
          {dialog.message}
        </p>
        <div className="dialog__actions">
          {isConfirm && (
            <button type="button" className="btn btn--ghost" onClick={() => onClose(false)}>
              {dialog.cancelText ?? '취소'}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${dialog.danger ? 'btn--danger-solid' : 'btn--primary'}`}
            onClick={() => onClose(true)}
          >
            {dialog.confirmText ?? '확인'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
