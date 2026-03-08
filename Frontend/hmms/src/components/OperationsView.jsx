import { useEffect, useState } from 'react';
import { fetchOperationsDashboard } from '../api/backend';
import { ClipboardCheck, LogIn, LogOut, Sparkles, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function OperationsView() {
  const [arrivalsToday, setArrivalsToday] = useState([]);
  const [departuresToday, setDeparturesToday] = useState([]);
  const [roomsToClean, setRoomsToClean] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    fetchOperationsDashboard()
      .then(({ arrivalsToday, departuresToday, roomsToClean }) => {
        setArrivalsToday(arrivalsToday);
        setDeparturesToday(departuresToday);
        setRoomsToClean(roomsToClean);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading operational data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        Error loading operations data. Please try again.
      </div>
    );
  }

  const currentTime = format(new Date(), 'HH:mm');
  const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div>
      <div className="card mb-3">
        <div className="card-header">
          <div>
            <h2>
              <ClipboardCheck size={28} />
              Daily Operations
            </h2>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>
              {currentDate} • Last updated: {currentTime}
            </p>
          </div>
          <button onClick={loadData} className="btn btn-outline btn-sm">
            <Clock size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3 mb-3">
        <div className="kpi-card" style={{ borderLeftColor: '#27AE60' }}>
          <div className="kpi-header">
            <span className="kpi-title">Arrivals Today</span>
            <div className="kpi-icon" style={{ background: '#27AE60' }}>
              <LogIn size={20} />
            </div>
          </div>
          <div className="kpi-value">{arrivalsToday.length}</div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            Guests checking in
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeftColor: '#E67E22' }}>
          <div className="kpi-header">
            <span className="kpi-title">Departures Today</span>
            <div className="kpi-icon" style={{ background: '#E67E22' }}>
              <LogOut size={20} />
            </div>
          </div>
          <div className="kpi-value">{departuresToday.length}</div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            Guests checking out
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeftColor: '#3498DB' }}>
          <div className="kpi-header">
            <span className="kpi-title">Rooms to Clean</span>
            <div className="kpi-icon" style={{ background: '#3498DB' }}>
              <Sparkles size={20} />
            </div>
          </div>
          <div className="kpi-value">{roomsToClean.length}</div>
          <div className="text-muted" style={{ fontSize: '0.875rem' }}>
            Housekeeping tasks
          </div>
        </div>
      </div>

      {/* Detailed Lists */}
      <div className="grid grid-3">
        {/* Arrivals */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={20} color="#27AE60" />
              Check-ins Today
            </h3>
            <span className="status-badge status-checked-in">{arrivalsToday.length}</span>
          </div>
          <div>
            {arrivalsToday.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {arrivalsToday.map((arrival) => (
                  <li
                    key={arrival.reservationId}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--light-gray)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {arrival.guestName}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                        {arrival.suiteName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', marginTop: '0.25rem' }}>
                        {arrival.numGuests} guest{arrival.numGuests > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)' }}>
                      #{arrival.reservationId}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No check-ins scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Departures */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogOut size={20} color="#E67E22" />
              Check-outs Today
            </h3>
            <span className="status-badge status-pending">{departuresToday.length}</span>
          </div>
          <div>
            {departuresToday.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {departuresToday.map((departure) => (
                  <li
                    key={departure.reservationId}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--light-gray)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {departure.guestName}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>
                        {departure.suiteName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', marginTop: '0.25rem' }}>
                        {departure.numGuests} guest{departure.numGuests > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)' }}>
                      #{departure.reservationId}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No check-outs scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Cleaning */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#3498DB" />
              Housekeeping
            </h3>
            <span className="status-badge status-confirmed">{roomsToClean.length}</span>
          </div>
          <div>
            {roomsToClean.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {roomsToClean.map((room) => (
                  <li
                    key={room.suiteId}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--light-gray)',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {room.suiteName}
                    </div>
                    {room.turnoverRequired && (
                      <span className="status-badge status-pending" style={{ fontSize: '0.7rem' }}>
                        Turnover Required
                      </span>
                    )}
                    {!room.turnoverRequired && (
                      <span className="status-badge status-confirmed" style={{ fontSize: '0.7rem' }}>
                        Standard Clean
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>All rooms are clean</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operational Notes */}
      <div className="card mt-3">
        <div className="card-header">
          <h3 style={{ fontSize: '1.125rem' }}>Quick Notes</h3>
        </div>
        <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
            <li>Ensure all check-in rooms are prepared by 14:00</li>
            <li>Check-out time is 11:00 - coordinate with housekeeping</li>
            <li>Welcome packages ready for VIP arrivals</li>
            <li>Report any maintenance issues immediately</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
