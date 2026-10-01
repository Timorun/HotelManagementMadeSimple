import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardCheck, CalendarDays, Hotel, Users, BarChart3, PlusCircle, Inbox, Megaphone, Settings } from 'lucide-react';
import { fetchBookingRequestCount } from '../../api/backend';
import { BOOKING_REQUESTS_CHANGED_EVENT } from '../../utils/events';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useI18n();
  const { logout } = useAuth();

  const tabs = useMemo(() => ([
    { id: 'operations', path: '/today', icon: ClipboardCheck },
    { id: 'calendar', path: '/calendar', icon: CalendarDays },
    { id: 'reservations', path: '/reservations', icon: Hotel },
    { id: 'guests', path: '/guests', icon: Users },
    { id: 'analytics', path: '/analytics', icon: BarChart3 },
    { id: 'requests', path: '/requests', icon: Inbox },
    { id: 'communications', path: '/communications', icon: Megaphone },
    { id: 'settings', path: '/settings', icon: Settings },
  ]), []);
  const [pendingRequests, setPendingRequests] = useState(0);

  // Badge on the Requests tab; refreshed periodically and after a request is handled.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => fetchBookingRequestCount()
      .then((count) => !cancelled && setPendingRequests(count))
      .catch(() => {});
    refresh();
    const interval = setInterval(refresh, 2 * 60 * 1000);
    window.addEventListener(BOOKING_REQUESTS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(BOOKING_REQUESTS_CHANGED_EVENT, refresh);
    };
  }, []);

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
              {tab.id === 'requests' && pendingRequests > 0 && (
                <span className="nav-badge" aria-label={`${pendingRequests} pending`}>{pendingRequests}</span>
              )}
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
