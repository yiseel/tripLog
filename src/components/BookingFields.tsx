import { v4 as uuid } from 'uuid'

/** 숙소(name·address·cost)와 기타 예약(name·memo·cost)을 같은 모양으로 입력 */
interface BookingItem {
  id: string
  name: string
  cost?: number
}

interface Props<T extends BookingItem> {
  title: string
  /** 두 번째 칸 — 숙소는 address, 기타 예약은 memo */
  detailKey: Exclude<keyof T, 'id' | 'name' | 'cost'> & string
  labels: { name: string; detail: string }
  placeholders: { name: string; detail: string; cost: string }
  items: T[]
  createItem: (id: string) => T
  onChange: (items: T[]) => void
  /** blur·추가·삭제 때 저장 — 바뀐 값을 바로 넘긴다 */
  onCommit: (items: T[]) => void
}

export function BookingFields<T extends BookingItem>({
  title,
  detailKey,
  labels,
  placeholders,
  items,
  createItem,
  onChange,
  onCommit,
}: Props<T>) {
  const update = (id: string, patch: Partial<T>) =>
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const add = () => onChange([...items, createItem(uuid())])

  const remove = (id: string) => {
    const next = items.filter((item) => item.id !== id)
    onChange(next)
    onCommit(next)
  }

  return (
    <div className="booking" role="group" aria-label={title}>
      <div className="booking__head">
        <strong>{title}</strong>
        {items.length > 0 && <span className="booking__count">{items.length}</span>}
        <button type="button" className="booking__add" onClick={add} aria-label={`${title} 추가`}>
          +
        </button>
      </div>

      {items.length === 0 ? (
        <p className="booking__empty">+ 버튼으로 추가할 수 있습니다</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="booking__row">
            <label>
              <span>{labels.name}</span>
              <input
                value={item.name}
                onChange={(e) => update(item.id, { name: e.target.value } as Partial<T>)}
                onBlur={() => onCommit(items)}
                placeholder={placeholders.name}
              />
            </label>
            <label>
              <span>{labels.detail}</span>
              <input
                value={String(item[detailKey] ?? '')}
                onChange={(e) => update(item.id, { [detailKey]: e.target.value } as Partial<T>)}
                onBlur={() => onCommit(items)}
                placeholder={placeholders.detail}
              />
            </label>
            <label>
              <span>금액</span>
              <input
                inputMode="numeric"
                value={item.cost !== undefined ? item.cost.toLocaleString('ko-KR') : ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, '')
                  update(item.id, { cost: digits ? Number(digits) : undefined } as Partial<T>)
                }}
                onBlur={() => onCommit(items)}
                placeholder={placeholders.cost}
              />
            </label>
            <button
              type="button"
              className="notes-row__remove booking__remove"
              onClick={() => remove(item.id)}
              aria-label={`${title} 삭제`}
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  )
}
