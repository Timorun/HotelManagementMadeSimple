import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import GuestManagement from './components/GuestManagement'
import ReservationManagement from './components/ReservationManagement'
import AnalyticsView from './components/AnalyticsView'
import TodaysOperationsView from './components/TodaysOperationsView'
import CalendarView from './components/CalendarView'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/auth/LoginPage'
import BookingRequestsView from './components/BookingRequestsView'
import CommunicationsView from './components/CommunicationsView'
import SettingsView from './components/SettingsView'
import BookingPage from './components/public/BookingPage'
import PreferencesPage from './components/public/PreferencesPage'
import { useAuth } from './context/AuthContext'
import { useI18n } from './context/I18nContext'

function RequireAuth({ children }) {
  const { isAuthenticated, authLoading } = useAuth()
  const { tr } = useI18n()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">{tr('Loading session...', 'Cargando sesion...')}</p>
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
      {/* Guest-facing pages, no login */}
      <Route path="/book" element={<BookingPage />} />
      <Route path="/preferences" element={<PreferencesPage />} />
      <Route path="/preferences/:token" element={<PreferencesPage />} />
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
                <Route path="/requests" element={<BookingRequestsView />} />
                <Route path="/communications" element={<CommunicationsView />} />
                <Route path="/settings" element={<SettingsView />} />
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

