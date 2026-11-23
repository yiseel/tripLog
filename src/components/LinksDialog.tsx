import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  links: string[]
  onClose: () => void
}

/** "www.a.com"처럼 주소만 적은 링크도 열리도록 https:// 를 붙인다 */
function toHref(link: string): string {
  return /^[a-z][a-z\d+.-]*:/i.test(link) ? link : `https://${link}`
}

/** 기타 예약의 링크 목록 팝업 (정보 화면). 모양은 앱 공용 .dialog 를 쓴다 */
export function LinksDialog({ title, links, onClose }: Props) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // rise 애니메이션의 transform 안에서 fixed 위치가 어긋나지 않도록 body로 포털
  return createPortal(
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dialog links-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="dialog__title">
          🔗 {title}
        </h2>
        <ul className="links-dialog__list">
          {links.map((link, index) => (
            <li key={index}>
              <a href={toHref(link)} target="_blank" rel="noopener noreferrer" title={link}>
                {link}
              </a>
            </li>
          ))}
        </ul>
        <div className="dialog__actions">
          <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
