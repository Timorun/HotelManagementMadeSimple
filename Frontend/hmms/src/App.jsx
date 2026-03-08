import { useState } from 'react'
import './App.css'
import GuestManagement from './components/GuestManagement'
import SuiteManagement from './components/SuiteManagement'
import ReservationManagement from './components/ReservationManagement'
import NationalityList from './components/NationalityList'
import AnalyticsView from './components/AnalyticsView'
import OperationsView from './components/OperationsView'
import CalendarView from './components/CalendarView'
import { 
  ClipboardCheck, 
  CalendarDays, 
  Hotel, 
  Users, 
  BarChart3,
  PlusCircle 
} from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('operations')

  const tabs = [
    { id: 'operations', label: 'Operations', icon: ClipboardCheck },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'reservations', label: 'Reservations', icon: Hotel },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <div className="brand-section">
            <h1>Carmen Suites</h1>
            <p className="hotel-subtitle">Málaga, Spain</p>
          </div>
          <div className="header-actions">
            <button className="quick-action-btn">
              <PlusCircle size={16} />
              New Reservation
            </button>
            <div className="user-info">
              <div className="user-avatar">CS</div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Hotel Manager</div>
              </div>
            </div>
          </div>
        </div>
        <nav className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-content">
        {activeTab === 'operations' && <OperationsView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'reservations' && <ReservationManagement />}
        {activeTab === 'guests' && <GuestManagement />}
        {activeTab === 'suites' && <SuiteManagement />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'nationalities' && <NationalityList />}
      </main>
    </>
  )
}

export default App

