import { useEffect, useState } from 'react';
import { fetchSuites } from '../api/backend';
import { Home, Users, CheckCircle, XCircle } from 'lucide-react';

export default function SuiteManagement() {
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
        <p className="mt-2">Loading suites...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        Error loading suites data. Please try again.
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
            Suite Management
          </h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className={filter === 'all' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFilter('all')}
            >
              All ({suites.length})
            </button>
            <button
              className={filter === 'active' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFilter('active')}
            >
              Active ({activeSuites})
            </button>
            <button
              className={filter === 'inactive' ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
              onClick={() => setFilter('inactive')}
            >
              Inactive ({suites.length - activeSuites})
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3 mb-3">
        <div className="kpi-card" style={{ borderLeftColor: '#27AE60' }}>
          <div className="kpi-header">
            <span className="kpi-title">Active Suites</span>
            <div className="kpi-icon" style={{ background: '#27AE60' }}>
              <Home size={20} />
            </div>
          </div>
          <div className="kpi-value">{activeSuites}</div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            Currently available
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeftColor: '#3498DB' }}>
          <div className="kpi-header">
            <span className="kpi-title">Total Capacity</span>
            <div className="kpi-icon" style={{ background: '#3498DB' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value">{totalCapacity}</div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            Guest capacity
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeftColor: '#E67E22' }}>
          <div className="kpi-header">
            <span className="kpi-title">Average Capacity</span>
            <div className="kpi-icon" style={{ background: '#E67E22' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value">
            {activeSuites > 0 ? (totalCapacity / activeSuites).toFixed(1) : 0}
          </div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            Guests per suite
          </div>
        </div>
      </div>

      {/* Suite Grid */}
      <div className="grid grid-3">
        {filteredSuites.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">🏨</div>
            <p>No suites found</p>
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
                    Suite ID: #{suite.suiteId}
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
                    {suite.capacity} Guests
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                  Maximum capacity
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={suite.active ? 'status-badge status-checked-in' : 'status-badge status-cancelled'}>
                  {suite.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Suite Details Table */}
      <div className="card mt-3">
        <div className="card-header">
          <h3>All Suites Overview</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Suite Name</th>
              <th>Capacity</th>
              <th>Status</th>
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
                    {suite.active ? 'Active' : 'Inactive'}
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
