interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

/** 한 번에 보여줄 페이지 번호 개수 */
const WINDOW = 5

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  // 현재 페이지를 가운데에 두되 양 끝에서는 범위를 밀어 맞춘다
  const start = Math.max(1, Math.min(page - Math.floor(WINDOW / 2), totalPages - WINDOW + 1))
  const end = Math.min(totalPages, start + WINDOW - 1)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button
        type="button"
        className="pagination__item"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="이전 페이지"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`pagination__item${p === page ? ' pagination__item--active' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="pagination__item"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </nav>
  )
}
