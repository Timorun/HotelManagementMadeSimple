import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import GuestManagement from './components/GuestManagement'
import ReservationManagement from './components/ReservationManagement'
import AnalyticsView from './components/AnalyticsView'
import TodaysOperationsView from './components/TodaysOperationsView'
import CalendarView from './components/CalendarView'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/auth/LoginPage'
import { useAuth } from './context/AuthContext'

function RequireAuth({ children }) {
  const { isAuthenticated, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/today" replace />} />
                <Route path="/today" element={<TodaysOperationsView />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/reservations" element={<ReservationManagement />} />
                <Route path="/guests" element={<GuestManagement />} />
                <Route path="/analytics" element={<AnalyticsView />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App

