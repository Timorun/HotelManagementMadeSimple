import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardCheck, CalendarDays, Hotel, Users, BarChart3, PlusCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useI18n();
  const { user, logout } = useAuth();

  const tabs = useMemo(() => ([
    { id: 'operations', path: '/today', icon: ClipboardCheck },
    { id: 'calendar', path: '/calendar', icon: CalendarDays },
    { id: 'reservations', path: '/reservations', icon: Hotel },
    { id: 'guests', path: '/guests', icon: Users },
    { id: 'analytics', path: '/analytics', icon: BarChart3 },
  ]), []);

  const activePath = location.pathname;
  const isCalendarRoute = activePath === '/calendar';

  const handleNewReservationClick = () => {
    if (activePath === '/reservations') {
      navigate('/reservations?new=1');
      return;
    }

    navigate(`/reservations?new=1&returnTo=${encodeURIComponent(activePath)}`);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <div className="brand-section">
            <h1>{t('appTitle')}</h1>
            <p className="hotel-subtitle">{t('appSubtitle')}</p>
          </div>
          <div className="header-actions">
            <select
              className="form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ width: '140px' }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>

            <button className="quick-action-btn" onClick={handleNewReservationClick}>
              <PlusCircle size={16} />
              {t('newReservation')}
            </button>

            <button className="btn btn-outline" onClick={logout}>
              {t('logout')}
            </button>
          </div>
        </div>

        <nav className="nav-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activePath === tab.path ? 'active' : ''}
              onClick={() => navigate(tab.path)}
            >
              <tab.icon size={18} />
              {t(`tabs.${tab.id}`)}
            </button>
          ))}
        </nav>
      </header>

      <main className={`app-content${isCalendarRoute ? ' app-content-calendar' : ''}`}>
        {children}
      </main>
    </>
  );
}
