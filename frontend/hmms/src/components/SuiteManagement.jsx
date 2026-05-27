import { useEffect, useState } from 'react';
import { fetchSuites } from '../api/backend';
import { Home, Users, CheckCircle, XCircle } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export default function SuiteManagement() {
  const { tr } = useI18n();
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, inactive

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    fetchSuites()
      .then(setSuites)
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  };

  const filteredSuites = suites.filter(suite => {
    if (filter === 'active') return suite.active;
    if (filter === 'inactive') return !suite.active;
    return true;
  });

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">{tr('Loading suites...', 'Cargando suites...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        {tr('Error loading suites data. Please try again.', 'Error al cargar datos de suites. Intentalo de nuevo.')}
      </div>
    );
  }

  const activeSuites = suites.filter(s => s.active).length;
  const totalCapacity = suites.reduce((sum, s) => sum + (s.active ? s.capacity : 0), 0);

  return (
    <div>
      <div className="card mb-3">
        <div className="card-header">
          <h2>
            <Home size={28} />
            {tr('Suite Management', 'Gestion de suites')}
          </h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className={filter === 'all' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFilter('all')}
            >
              {tr('All', 'Todos')} ({suites.length})
            </button>
            <button
              className={filter === 'active' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFilter('active')}
            >
              {tr('Active', 'Activas')} ({activeSuites})
            </button>
            <button
              className={filter === 'inactive' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFilter('inactive')}
            >
              {tr('Inactive', 'Inactivas')} ({suites.length - activeSuites})
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3 mb-3">
        <div className="kpi-card" style={{ borderLeftColor: '#27AE60' }}>
          <div className="kpi-header">
            <span className="kpi-title">{tr('Active Suites', 'Suites activas')}</span>
            <div className="kpi-icon" style={{ background: '#27AE60' }}>
              <Home size={20} />
            </div>
          </div>
          <div className="kpi-value">{activeSuites}</div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            {tr('Currently available', 'Actualmente disponibles')}
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeftColor: '#3498DB' }}>
          <div className="kpi-header">
            <span className="kpi-title">{tr('Total Capacity', 'Capacidad total')}</span>
            <div className="kpi-icon" style={{ background: '#3498DB' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value">{totalCapacity}</div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            {tr('Guest capacity', 'Capacidad de huespedes')}
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeftColor: '#E67E22' }}>
          <div className="kpi-header">
            <span className="kpi-title">{tr('Average Capacity', 'Capacidad media')}</span>
            <div className="kpi-icon" style={{ background: '#E67E22' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value">
            {activeSuites > 0 ? (totalCapacity / activeSuites).toFixed(1) : 0}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            {tr('Guests per suite', 'Huespedes por suite')}
          </div>
        </div>
      </div>

      {/* Suite Grid */}
      <div className="grid grid-3">
        {filteredSuites.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">🏨</div>
            <p>{tr('No suites found', 'No se encontraron suites')}</p>
          </div>
        ) : (
          filteredSuites.map((suite) => (
            <div key={suite.suiteId} className="card">
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                    {suite.suiteName}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                    {tr('Suite ID:', 'ID de suite:')} #{suite.suiteId}
                  </div>
                </div>
                {suite.active ? (
                  <CheckCircle size={24} color="#27AE60" />
                ) : (
                  <XCircle size={24} color="#E74C3C" />
                )}
              </div>

              <div style={{ 
                padding: '1rem', 
                background: suite.active ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)', 
                borderRadius: '8px',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Users size={18} color={suite.active ? '#27AE60' : '#E74C3C'} />
                  <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                    {suite.capacity} {tr('Guests', 'Huespedes')}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                  {tr('Maximum capacity', 'Capacidad maxima')}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={suite.active ? 'status-badge status-checked-in' : 'status-badge status-cancelled'}>
                  {suite.active ? tr('Active', 'Activa') : tr('Inactive', 'Inactiva')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Suite Details Table */}
      <div className="card mt-3">
        <div className="card-header">
          <h3>{tr('All Suites Overview', 'Resumen de todas las suites')}</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{tr('Suite Name', 'Nombre de suite')}</th>
              <th>{tr('Capacity', 'Capacidad')}</th>
              <th>{tr('Status', 'Estado')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuites.map((suite) => (
              <tr key={suite.suiteId}>
                <td>#{suite.suiteId}</td>
                <td style={{ fontWeight: 600 }}>{suite.suiteName}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} color="var(--dark-gray)" />
                    {suite.capacity}
                  </div>
                </td>
                <td>
                  <span className={suite.active ? 'status-badge status-checked-in' : 'status-badge status-cancelled'}>
                    {suite.active ? tr('Active', 'Activa') : tr('Inactive', 'Inactiva')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
