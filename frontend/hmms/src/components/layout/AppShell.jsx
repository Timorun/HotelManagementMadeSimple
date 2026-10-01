import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Hotel,
  Inbox,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Plus,
  PlusCircle,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { fetchBookingRequestCount } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { BOOKING_REQUESTS_CHANGED_EVENT } from '../../utils/events';

// On phones the first four tabs live in a bottom bar; the rest go in a "More" sheet.
const PRIMARY_MOBILE_TABS = 4;

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, tr, language, setLanguage } = useI18n();
  const { logout } = useAuth();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

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

  const goTo = (path) => {
    setMoreOpen(false);
    navigate(path);
  };

  const badgeFor = (tab) => (tab.id === 'requests' && pendingRequests > 0 ? (
    <span className="nav-badge" aria-label={`${pendingRequests} pending`}>{pendingRequests}</span>
  ) : null);

  const languageSelect = (
    <select
      className="form-select header-language"
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      aria-label={tr('Language', 'Idioma')}
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>{isMobile ? lang.code.toUpperCase() : lang.label}</option>
      ))}
    </select>
  );

  if (isMobile) {
    const primaryTabs = tabs.slice(0, PRIMARY_MOBILE_TABS);
    const moreTabs = tabs.slice(PRIMARY_MOBILE_TABS);
    const moreActive = moreTabs.some((tab) => tab.path === activePath);

    return (
      <>
        <header className="app-header mobile">
          <div className="header-top">
            <div className="brand-section">
              <h1>{t('appTitle')}</h1>
            </div>
            <div className="header-actions">
              {languageSelect}
              <button className="quick-action-btn icon-only" onClick={handleNewReservationClick} aria-label={t('newReservation')} title={t('newReservation')}>
                <Plus size={20} />
              </button>
              <button className="btn btn-outline btn-icon" onClick={logout} aria-label={t('logout')} title={t('logout')}>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className={`app-content has-bottom-nav${isCalendarRoute ? ' app-content-calendar' : ''}`}>
          {children}
        </main>

        <nav className="bottom-nav" aria-label={tr('Main navigation', 'Navegacion principal')}>
          {primaryTabs.map((tab) => (
            <button key={tab.id} className={activePath === tab.path ? 'active' : ''} onClick={() => goTo(tab.path)}>
              <tab.icon size={20} />
              <span>{t(`tabs.${tab.id}`)}</span>
            </button>
          ))}
          <button className={moreActive || moreOpen ? 'active' : ''} onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>
            <MoreHorizontal size={20} />
            <span>{tr('More', 'Mas')}</span>
            {pendingRequests > 0 && <span className="nav-badge bottom-nav-dot">{pendingRequests}</span>}
          </button>
        </nav>

        {moreOpen && (
          <div className="more-sheet-overlay" onClick={() => setMoreOpen(false)}>
            <div className="more-sheet" role="dialog" aria-label={tr('More', 'Mas')} onClick={(e) => e.stopPropagation()}>
              <div className="more-sheet-head">
                <strong>{tr('More', 'Mas')}</strong>
                <button type="button" className="modal-close" onClick={() => setMoreOpen(false)} aria-label={tr('Close', 'Cerrar')}>
                  <X size={20} />
                </button>
              </div>
              {moreTabs.map((tab) => (
                <button key={tab.id} className={`more-sheet-item ${activePath === tab.path ? 'active' : ''}`} onClick={() => goTo(tab.path)}>
                  <tab.icon size={20} />
                  <span>{t(`tabs.${tab.id}`)}</span>
                  {badgeFor(tab)}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <div className="brand-section">
            <h1>{t('appTitle')}</h1>
            <p className="hotel-subtitle">{t('appSubtitle')}</p>
          </div>
          <div className="header-actions">
            {languageSelect}

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
              {badgeFor(tab)}
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
