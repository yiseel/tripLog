import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useTrips } from './hooks/useTrips'
import { LoginPage } from './pages/LoginPage'
import { TripCostPage } from './pages/TripCostPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { TripListPage } from './pages/TripListPage'
import { TripNotesPage } from './pages/TripNotesPage'
import { TripViewPage } from './pages/TripViewPage'

export default function App() {
  const auth = useAuth()
  const api = useTrips(auth.loading ? undefined : (auth.user?.id ?? null))

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TripListPage api={api} auth={auth} />} />
        <Route path="/trips/:id" element={<TripViewPage api={api} auth={auth} />} />
        <Route path="/trips/:id/edit" element={<TripDetailPage api={api} auth={auth} />} />
        <Route path="/trips/:id/costs" element={<TripCostPage api={api} auth={auth} />} />
        <Route path="/trips/:id/notes" element={<TripNotesPage api={api} auth={auth} />} />
        <Route path="/login" element={<LoginPage auth={auth} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
