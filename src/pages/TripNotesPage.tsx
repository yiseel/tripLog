import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { tripPageFallback } from '../components/TripPageFallback'
import type { AuthApi } from '../hooks/useAuth'
import type { TripsApi } from '../hooks/useTrips'
import type { ChecklistItem, NoteItem, Trip } from '../types/trip'
import { autoTitle, formatDateRange } from '../utils/dates'

interface Props {
  api: TripsApi
  auth: AuthApi
}

/** 빈 항목은 저장하지 않는다 (화면에는 남아 있어 이어서 입력할 수 있음) */
function filled<T extends { text: string }>(items: T[]): T[] {
  return items.filter((item) => item.text.trim() !== '')
}

/** /trips/:id/notes — 준비물(체크리스트) | 메모. 바꿀 때마다 바로 저장 */
export function TripNotesPage({ api, auth }: Props) {
  const { id = '' } = useParams()
  const trip = api.getTrip(id)

  const fallback = tripPageFallback(api, auth, trip)
  if (fallback || !trip) return fallback

  // 여행이 바뀌면 입력 상태를 새로 잡도록 key 로 다시 마운트
  return <NotesBoard key={trip.id} api={api} trip={trip} />
}

function NotesBoard({ api, trip }: { api: TripsApi; trip: Trip }) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => trip.checklist ?? [])
  const [notes, setNotes] = useState<NoteItem[]>(() => trip.notes ?? [])
  /** + 로 막 추가한 칸 — 그 칸에 바로 커서를 둔다 */
  const [focusId, setFocusId] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  /** 모바일(좁은 화면)에서 보여 줄 탭 — 넓은 화면은 탭 없이 둘 다 보인다 */
  const [tab, setTab] = useState<'checklist' | 'notes'>('checklist')

  const save = async (patch: Pick<Trip, 'checklist'> | Pick<Trip, 'notes'>) => {
    const ok = await api.updateTrip(trip.id, patch)
    if (!ok) return
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1400)
  }

  const saveChecklist = (items: ChecklistItem[]) => save({ checklist: filled(items) })
  const saveNotes = (items: NoteItem[]) => save({ notes: filled(items) })

  const addChecklistItem = (afterId?: string) => {
    const item: ChecklistItem = { id: uuid(), text: '', done: false }
    const index = afterId ? checklist.findIndex((entry) => entry.id === afterId) + 1 : checklist.length
    setChecklist([...checklist.slice(0, index), item, ...checklist.slice(index)])
    setFocusId(item.id)
  }

  const addNote = () => {
    const item: NoteItem = { id: uuid(), text: '' }
    setNotes([...notes, item])
    setFocusId(item.id)
  }

  const doneCount = filled(checklist).filter((item) => item.done).length
  const totalCount = filled(checklist).length

  return (
    <div className="page page--detail">
      <header className="detail-top">
        <div className="detail-top__inner">
          <Link to={`/trips/${trip.id}`} className="back-link">
            ← Trip Log
          </Link>
          <div className="detail-top__actions">
            {savedFlash && <span className="save-flash">저장됨</span>}
          </div>
        </div>
      </header>

      <div className="detail-body trip-view">
        {api.error && (
          <p className="storage-error" role="alert">
            {api.error}
          </p>
        )}
        <div className="cost-intro">
          <span className="trip-card__label">CHECKLIST &amp; MEMO</span>
          <h1 className="trip-view__title">{trip.title || autoTitle(trip.region)}</h1>
          {trip.startDate && trip.endDate && (
            <p className="meta-panel__range">{formatDateRange(trip.startDate, trip.endDate)}</p>
          )}
        </div>

        <div className="segmented notes-tabs" role="tablist" aria-label="준비물 · 메모">
          {(
            [
              ['checklist', '준비물'],
              ['notes', '메모'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`segmented__item${tab === key ? ' segmented__item--active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={`notes-board notes-board--${tab}`}>
          {/* 왼쪽: 준비물 체크리스트 */}
          <section className="notes-panel notes-panel--checklist">
            <header className="notes-panel__head">
              <h2>준비물</h2>
              <span className="notes-panel__count">
                {doneCount} / {totalCount}
              </span>
              <button
                type="button"
                className="notes-panel__add"
                onClick={() => addChecklistItem()}
                aria-label="준비물 추가"
              >
                +
              </button>
            </header>
            <div className="notes-progress" aria-hidden="true">
              <span style={{ width: totalCount ? `${(doneCount / totalCount) * 100}%` : 0 }} />
            </div>

            {checklist.length === 0 ? (
              <p className="notes-panel__empty">+ 를 눌러 준비물을 추가하세요</p>
            ) : (
              <ul className="notes-list">
                {checklist.map((item) => (
                  <li key={item.id} className={`check-row${item.done ? ' check-row--done' : ''}`}>
                    <input
                      type="checkbox"
                      className="check-row__box"
                      checked={item.done}
                      onChange={() => {
                        const next = checklist.map((entry) =>
                          entry.id === item.id ? { ...entry, done: !entry.done } : entry,
                        )
                        setChecklist(next)
                        saveChecklist(next)
                      }}
                      aria-label={`${item.text || '준비물'} 챙김`}
                    />
                    <input
                      className="check-row__text"
                      value={item.text}
                      onChange={(e) =>
                        setChecklist(
                          checklist.map((entry) =>
                            entry.id === item.id ? { ...entry, text: e.target.value } : entry,
                          ),
                        )
                      }
                      onBlur={() => saveChecklist(checklist)}
                      onKeyDown={(e) => {
                        // Enter: 바로 아래에 새 칸
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault()
                          addChecklistItem(item.id)
                        }
                      }}
                      placeholder="예: 여권, 충전기, 우산"
                      autoFocus={item.id === focusId}
                    />
                    <button
                      type="button"
                      className="notes-row__remove"
                      onClick={() => {
                        const next = checklist.filter((entry) => entry.id !== item.id)
                        setChecklist(next)
                        saveChecklist(next)
                      }}
                      aria-label="준비물 삭제"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 오른쪽: 메모 */}
          <section className="notes-panel notes-panel--notes">
            <header className="notes-panel__head">
              <h2>메모</h2>
              <span className="notes-panel__count">{filled(notes).length}개</span>
              <button type="button" className="notes-panel__add" onClick={addNote} aria-label="메모 추가">
                +
              </button>
            </header>

            {notes.length === 0 ? (
              <p className="notes-panel__empty">+ 를 눌러 메모를 추가하세요</p>
            ) : (
              <ul className="notes-list">
                {notes.map((item) => (
                  <li key={item.id} className="memo-row">
                    <textarea
                      className="memo-row__text"
                      value={item.text}
                      onChange={(e) =>
                        setNotes(
                          notes.map((entry) => (entry.id === item.id ? { ...entry, text: e.target.value } : entry)),
                        )
                      }
                      onBlur={() => saveNotes(notes)}
                      placeholder="예: 환전은 시내에서, 숙소 체크인 15시"
                      rows={2}
                      autoFocus={item.id === focusId}
                    />
                    <button
                      type="button"
                      className="notes-row__remove"
                      onClick={() => {
                        const next = notes.filter((entry) => entry.id !== item.id)
                        setNotes(next)
                        saveNotes(next)
                      }}
                      aria-label="메모 삭제"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
