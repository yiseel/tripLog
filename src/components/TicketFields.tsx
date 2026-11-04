import type { TicketSegment, Tickets, Transport } from '../types/trip'
import { emptySegment } from '../utils/tickets'
import { normalizeTime, typingTime } from '../utils/time'

type TicketTransport = Exclude<Transport, 'car'>
type Leg = keyof Tickets

interface Props {
  transport: TicketTransport
  tickets: Tickets
  onChange: (tickets: Tickets) => void
  /** blur·구간 추가/삭제 때 저장 — 바뀐 값을 바로 넘긴다 */
  onCommit: (tickets: Tickets) => void
}

interface FieldText {
  label: string
  outbound: string
  inbound: string
}

const LABELS: Record<TicketTransport, Record<'name' | 'from' | 'to', FieldText>> = {
  plane: {
    name: { label: '편명', outbound: 'KE701', inbound: 'KE702' },
    from: { label: '출발 공항', outbound: '인천(ICN)', inbound: '나리타(NRT)' },
    to: { label: '도착 공항', outbound: '나리타(NRT)', inbound: '인천(ICN)' },
  },
  train: {
    name: { label: '열차', outbound: 'KTX 101', inbound: 'KTX 110' },
    from: { label: '출발역', outbound: '서울', inbound: '강릉' },
    to: { label: '도착역', outbound: '강릉', inbound: '서울' },
  },
  bus: {
    name: { label: '버스', outbound: '금호고속', inbound: '금호고속' },
    from: { label: '출발 터미널', outbound: '서울고속터미널', inbound: '속초' },
    to: { label: '도착 터미널', outbound: '속초', inbound: '서울고속터미널' },
  },
}

const LEGS: { key: Leg; label: string }[] = [
  { key: 'outbound', label: '가는 편' },
  { key: 'inbound', label: '오는 편' },
]

/** 교통수단별 티켓 세부 입력. 비행기만 경유(구간 추가)를 쓸 수 있다 */
export function TicketFields({ transport, tickets, onChange, onCommit }: Props) {
  const labels = LABELS[transport]
  const isPlane = transport === 'plane'

  /** 화면에 보여줄 구간 — 비어 있으면 빈 구간 하나, 비행기가 아니면 첫 구간만 */
  const visible = (leg: Leg): TicketSegment[] => {
    const segments = tickets[leg].length > 0 ? tickets[leg] : [emptySegment()]
    return isPlane ? segments : segments.slice(0, 1)
  }

  const withSegment = (leg: Leg, index: number, patch: Partial<TicketSegment>): Tickets => {
    const segments = [...visible(leg)]
    segments[index] = { ...segments[index], ...patch }
    return { ...tickets, [leg]: segments }
  }

  const addSegment = (leg: Leg) => {
    const segments = visible(leg)
    // 경유지: 앞 구간의 도착지가 다음 구간의 출발지
    const next = { ...emptySegment(), from: segments[segments.length - 1]?.to ?? '' }
    const updated = { ...tickets, [leg]: [...segments, next] }
    onChange(updated)
    onCommit(updated)
  }

  const removeSegment = (leg: Leg, index: number) => {
    const updated = { ...tickets, [leg]: visible(leg).filter((_, i) => i !== index) }
    onChange(updated)
    onCommit(updated)
  }

  const priceField = (leg: Leg, index: number, segment: TicketSegment) => (
    <label>
      <span>금액</span>
      <input
        inputMode="numeric"
        value={segment.price ? Number(segment.price).toLocaleString('ko-KR') : ''}
        onChange={(e) => onChange(withSegment(leg, index, { price: e.target.value.replace(/[^\d]/g, '') }))}
        onBlur={() => onCommit(tickets)}
        placeholder="예: 59,800"
      />
    </label>
  )

  const textField = (leg: Leg, index: number, segment: TicketSegment, key: 'name' | 'from' | 'to') => (
    <label>
      <span>{labels[key].label}</span>
      <input
        value={segment[key]}
        onChange={(e) => onChange(withSegment(leg, index, { [key]: e.target.value }))}
        onBlur={() => onCommit(tickets)}
        placeholder={`예: ${labels[key][leg]}`}
      />
    </label>
  )

  const timeField = (leg: Leg, index: number, segment: TicketSegment, key: 'departTime' | 'arriveTime') => (
    <label>
      <span>{key === 'departTime' ? '출발 시간' : '도착 시간'}</span>
      <input
        inputMode="numeric"
        value={segment[key]}
        onChange={(e) => onChange(withSegment(leg, index, { [key]: typingTime(e.target.value) }))}
        onBlur={() => {
          // 1120 / 930 → 11:20 / 09:30, 잘못된 값은 입력한 그대로 둔다
          const normalized = normalizeTime(segment[key])
          const updated = normalized === null ? tickets : withSegment(leg, index, { [key]: normalized })
          onChange(updated)
          onCommit(updated)
        }}
        placeholder={key === 'departTime' ? '09:00' : '11:20'}
      />
    </label>
  )

  return (
    <div className="meta-form__tickets">
      {LEGS.map(({ key: leg, label }) => {
        const segments = visible(leg)
        return (
          <fieldset key={leg} className="ticket-leg">
            <legend>{label} 티켓</legend>
            {segments.map((segment, index) => (
              <div key={index} className="ticket-seg">
                {segments.length > 1 && (
                  <div className="ticket-seg__head">
                    <span>{index === 0 ? '1구간' : `${index + 1}구간 · 경유 후`}</span>
                    <button
                      type="button"
                      className="text-btn text-btn--danger"
                      onClick={() => removeSegment(leg, index)}
                    >
                      구간 삭제
                    </button>
                  </div>
                )}
                <div className="ticket-seg__grid">
                  {textField(leg, index, segment, 'name')}
                  {priceField(leg, index, segment)}
                  {textField(leg, index, segment, 'from')}
                  {textField(leg, index, segment, 'to')}
                  {timeField(leg, index, segment, 'departTime')}
                  {timeField(leg, index, segment, 'arriveTime')}
                </div>
              </div>
            ))}
            {isPlane && (
              <button type="button" className="text-btn ticket-leg__add" onClick={() => addSegment(leg)}>
                + 경유 추가
              </button>
            )}
          </fieldset>
        )
      })}
    </div>
  )
}
