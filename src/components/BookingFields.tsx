import { v4 as uuid } from 'uuid'

/** 숙소(name·address·cost)와 기타 예약(name·memo·cost·links)을 같은 모양으로 입력 */
interface BookingItem {
  id: string
  name: string
  cost?: number
  links?: string[]
}

interface Props<T extends BookingItem> {
  title: string
  /** 두 번째 칸 — 숙소는 address, 기타 예약은 memo */
  detailKey: Exclude<keyof T, 'id' | 'name' | 'cost' | 'links'> & string
  labels: { name: string; detail: string }
  placeholders: { name: string; detail: string; cost: string }
  items: T[]
  createItem: (id: string) => T
  /** 줄마다 "링크 추가" 버튼과 링크 입력 칸(여러 개)을 둔다 — 기타 예약 */
  withLinks?: boolean
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
  withLinks = false,
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

  // 링크 칸: 추가는 화면에만(빈 칸은 저장 안 함), 글자는 blur 때, 삭제는 바로 저장
  const setLinks = (id: string, links: string[]) =>
    items.map((item) => (item.id === id ? { ...item, links } : item))

  const addLink = (item: T) => onChange(setLinks(item.id, [...(item.links ?? []), '']))

  const editLink = (item: T, index: number, value: string) =>
    onChange(setLinks(item.id, (item.links ?? []).map((link, i) => (i === index ? value : link))))

  const removeLink = (item: T, index: number) => {
    const next = setLinks(
      item.id,
      (item.links ?? []).filter((_, i) => i !== index),
    )
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

            {withLinks && (
              <div className="booking__links">
                {(item.links ?? []).map((link, index) => (
                  <div key={index} className="booking__link">
                    <input
                      type="url"
                      inputMode="url"
                      value={link}
                      onChange={(e) => editLink(item, index, e.target.value)}
                      onBlur={() => onCommit(items)}
                      placeholder="예: https://www.example.com/booking/1234"
                      aria-label={`링크 ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="notes-row__remove"
                      onClick={() => removeLink(item, index)}
                      aria-label={`링크 ${index + 1} 삭제`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="booking__link-add" onClick={() => addLink(item)}>
                  🔗 링크 추가
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
