import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { isSupabaseConfigured } from '../lib/supabase'
import { deleteTrip as deleteTripRow, fetchTrips, migrateLocalTrips, saveTrip } from '../lib/tripsDb'
import type { Place, PlaceDraft, Trip, TripMeta } from '../types/trip'
import { autoTitle } from '../utils/dates'
import { syncDays } from '../utils/days'
import { loadTrips, saveTrips } from '../utils/storage'

/** 새 여행은 날짜를 비워 둔다 — 사용자가 고르기 전까지 오늘 날짜를 미리 넣지 않음 */
function emptyTrip(): Trip {
  const now = new Date().toISOString()

  return {
    id: uuid(),
    title: '',
    region: '',
    startDate: '',
    endDate: '',
    companions: '',
    tripType: 'domestic',
    tickets: { outbound: [], inbound: [] },
    days: [[]],
    createdAt: now,
    updatedAt: now,
  }
}

function errorMessage(error: unknown, action: 'load' | 'save'): string {
  const detail =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  const lead =
    action === 'load' ? '여행을 불러오지 못했습니다.' : 'Supabase에 저장하지 못했습니다.'
  return detail ? `${lead} ${detail}` : lead
}

function patchTrip(trip: Trip, patch: Partial<Trip>): Trip {
  const merged: Trip = { ...trip, ...patch, updatedAt: new Date().toISOString() }
  if (patch.startDate !== undefined || patch.endDate !== undefined) {
    merged.days = syncDays(merged.days, merged.startDate, merged.endDate)
  }
  return merged
}

function placeFromDraft(draft: PlaceDraft, id: string): Place {
  return {
    id,
    name: draft.name.trim(),
    address: draft.address.trim(),
    memo: draft.memo.trim(),
    lat: draft.lat,
    lng: draft.lng,
    startTime: draft.startTime || undefined,
    endTime: draft.endTime || undefined,
    cost: draft.cost,
    area: draft.area?.trim() || undefined,
  }
}

/** undefined = 로그인 확인 중, null = 로그아웃, string = 그 계정의 여행만 */
export function useTrips(userId?: string | null) {
  const [trips, setTrips] = useState<Trip[]>(() => (isSupabaseConfigured ? [] : loadTrips()))
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Trip | null>(null)
  const tripsRef = useRef(trips)
  const draftRef = useRef<Trip | null>(null)
  const userIdRef = useRef(userId)
  const tail = useRef<Promise<void>>(Promise.resolve())
  userIdRef.current = userId

  const commit = useCallback(
    (produce: (current: Trip[]) => { next: Trip[]; persist: () => Promise<void> }) => {
      const run = tail.current.then(async () => {
        const owner = userIdRef.current
        const previous = tripsRef.current
        const { next, persist } = produce(previous)
        if (isSupabaseConfigured && owner !== userIdRef.current) return false
        tripsRef.current = next
        setTrips(next)
        if (!isSupabaseConfigured) {
          saveTrips(next)
          setError('')
          return true
        }
        try {
          await persist()
          if (userIdRef.current !== owner) return false
          if (tripsRef.current === next) saveTrips(next, owner)
          setError('')
          return true
        } catch (caught) {
          if (userIdRef.current === owner && tripsRef.current === next) {
            tripsRef.current = previous
            setTrips(previous)
            saveTrips(previous, owner)
          }
          if (userIdRef.current === owner) setError(errorMessage(caught, 'save'))
          return false
        }
      })
      tail.current = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    },
    [],
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    if (userId === undefined) return
    if (!userId) {
      tripsRef.current = []
      setTrips([])
      setDraft(null)
      draftRef.current = null
      setError('')
      setLoading(false)
      return
    }
    let cancelled = false
    const cached = loadTrips(userId)
    tripsRef.current = cached
    setTrips(cached)
    setLoading(true)
    const run = tail.current.then(async () => {
      if (cancelled) return
      try {
        let migrated = true
        try {
          await migrateLocalTrips(loadTrips(), userId)
        } catch (caught) {
          migrated = false
          if (!cancelled && userIdRef.current === userId) setError(errorMessage(caught, 'load'))
        }
        const remote = await fetchTrips(userId)
        if (cancelled || userIdRef.current !== userId) return
        tripsRef.current = remote
        setTrips(remote)
        saveTrips(remote, userId)
        if (migrated) setError('')
      } catch (caught) {
        if (!cancelled && userIdRef.current === userId) setError(errorMessage(caught, 'load'))
      } finally {
        if (!cancelled && userIdRef.current === userId) setLoading(false)
      }
    })
    tail.current = run.then(
      () => undefined,
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  const setDraftTrip = useCallback((next: Trip | null) => {
    draftRef.current = next
    setDraft(next)
  }, [])

  const getTrip = useCallback(
    (id: string) => (draft?.id === id ? draft : trips.find((trip) => trip.id === id)),
    [trips, draft],
  )

  /** 새 여행은 저장 버튼을 누르기 전까지 목록에 넣지 않고 draft로만 들고 있는다 */
  const createTrip = useCallback(() => {
    const trip = emptyTrip()
    setDraftTrip(trip)
    return trip
  }, [setDraftTrip])

  /** draft면 메모리에서만 바꾸고, 목록에 있는 여행이면 저장까지 한다 */
  const mutateTrip = useCallback(
    (id: string, transform: (trip: Trip) => Trip) => {
      const pending = draftRef.current
      if (pending?.id === id) {
        setDraftTrip(transform(pending))
        return Promise.resolve(true)
      }
      return commit((current) => {
        let updated: Trip | undefined
        const next = current.map((trip) => {
          if (trip.id !== id) return trip
          updated = transform(trip)
          return updated
        })
        return {
          next,
          persist: async () => {
            if (updated) await saveTrip(updated)
          },
        }
      })
    },
    [commit, setDraftTrip],
  )

  const updateTrip = useCallback(
    (id: string, patch: Partial<Trip>) => mutateTrip(id, (trip) => patchTrip(trip, patch)),
    [mutateTrip],
  )

  /** publish: 저장 버튼으로 저장할 때 true — draft를 목록에 추가한다 */
  const saveTripMeta = useCallback(
    async (id: string, meta: TripMeta, publish = false) => {
      const title = meta.title.trim() || autoTitle(meta.region)
      const pending = draftRef.current
      if (!publish || pending?.id !== id) return updateTrip(id, { ...meta, title })
      const trip = patchTrip(pending, { ...meta, title })
      const ok = await commit((current) => ({
        next: [trip, ...current],
        persist: () => saveTrip(trip),
      }))
      if (ok) setDraftTrip(null)
      return ok
    },
    [commit, setDraftTrip, updateTrip],
  )

  const removeTrip = useCallback(
    (id: string) => {
      if (draftRef.current?.id === id) {
        setDraftTrip(null)
        return Promise.resolve(true)
      }
      return commit((current) => ({
        next: current.filter((trip) => trip.id !== id),
        persist: () => deleteTripRow(id),
      }))
    },
    [commit, setDraftTrip],
  )

  const addPlace = useCallback(
    (tripId: string, dayIndex: number, draft: PlaceDraft) => {
      const place = placeFromDraft(draft, uuid())
      return mutateTrip(tripId, (trip) => ({
        ...trip,
        days: trip.days.map((day, index) => (index === dayIndex ? [...day, place] : day)),
        updatedAt: new Date().toISOString(),
      }))
    },
    [mutateTrip],
  )

  const updatePlace = useCallback(
    (tripId: string, dayIndex: number, placeId: string, draft: PlaceDraft) => {
      return mutateTrip(tripId, (trip) => ({
        ...trip,
        days: trip.days.map((day, index) =>
          index === dayIndex
            ? day.map((place) =>
                place.id === placeId
                  ? {
                      ...placeFromDraft(draft, place.id),
                      lat: draft.lat ?? place.lat,
                      lng: draft.lng ?? place.lng,
                    }
                  : place,
              )
            : day,
        ),
        updatedAt: new Date().toISOString(),
      }))
    },
    [mutateTrip],
  )

  const removePlace = useCallback(
    (tripId: string, dayIndex: number, placeId: string) => {
      return mutateTrip(tripId, (trip) => ({
        ...trip,
        days: trip.days.map((day, index) =>
          index === dayIndex ? day.filter((place) => place.id !== placeId) : day,
        ),
        updatedAt: new Date().toISOString(),
      }))
    },
    [mutateTrip],
  )

  const reorderPlaces = useCallback(
    (tripId: string, days: Place[][]) => {
      return mutateTrip(tripId, (trip) => ({ ...trip, days, updatedAt: new Date().toISOString() }))
    },
    [mutateTrip],
  )

  return {
    trips,
    loading,
    error,
    getTrip,
    draftId: draft?.id,
    createTrip,
    updateTrip,
    saveTripMeta,
    deleteTrip: removeTrip,
    addPlace,
    updatePlace,
    removePlace,
    reorderPlaces,
  }
}

export type TripsApi = ReturnType<typeof useTrips>
