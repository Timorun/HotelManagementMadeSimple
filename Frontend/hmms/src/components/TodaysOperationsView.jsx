import { useEffect, useState } from 'react';
import { fetchOperationsDashboard } from '../api/backend';
import { ClipboardCheck, LogIn, LogOut, Sparkles, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function TodaysOperationsView() {
  const [arrivalsToday, setArrivalsToday] = useState([]);
  const [departuresToday, setDeparturesToday] = useState([]);
  const [roomsToClean, setRoomsToClean] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);

    try {
      const data = await fetchOperationsDashboard();
      setArrivalsToday(data.arrivalsToday || []);
      setDeparturesToday(data.departuresToday || []);
      setRoomsToClean(data.roomsToClean || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading operations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        Could not load today’s operations. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="operations-page">
      <section className="card operations-headbar mb-3">
        <div className="operations-hero-top">
          <div>
            <h2 className="operations-title">
              <ClipboardCheck size={28} />
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="operations-subtitle">
              Last updated {format(lastUpdated, 'HH:mm')}
            </p>
          </div>

          <button
            onClick={() => loadData(true)}
            className="btn btn-outline btn-sm"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="operations-focus-grid mb-3">
        <article className="card operations-column">
          <div className="card-header operations-column-header">
            <h3>
              <LogOut size={18} color="#E67E22" />
              Check-outs
            </h3>
            <span className="status-badge status-pending">{departuresToday.length}</span>
          </div>

          {departuresToday.length > 0 ? (
            <ul className="operations-list">
              {departuresToday.map((departure) => (
                <li key={departure.reservationId} className="operations-item">
                  <div>
                    <div className="operations-item-title">{departure.guestName}</div>
                    <div className="operations-item-sub">{departure.suiteName}
                        <em className="operations-item-sub muted">
                            {pluralize(departure.numGuests, 'guest')} · Ref #{departure.reservationId}
                        </em>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">No check-outs scheduled.</div>
          )}
        </article>

        <article className="card operations-column">
          <div className="card-header operations-column-header">
            <h3>
              <LogIn size={18} color="#27AE60" />
              Check-ins
            </h3>
            <span className="status-badge status-checked-in">{arrivalsToday.length}</span>
          </div>

          {arrivalsToday.length > 0 ? (
            <ul className="operations-list">
              {arrivalsToday.map((arrival) => (
                <li key={arrival.reservationId} className="operations-item">
                  <div>
                    <div className="operations-item-title">{arrival.guestName}</div>
                    <div className="operations-item-sub">{arrival.suiteName}
                        <em className="operations-item-sub muted">
                            {pluralize(arrival.numGuests, 'guest')} · Ref #{arrival.reservationId}
                        </em>
                    </div>                        
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">No check-ins scheduled.</div>
          )}
        </article>
      </section>

      <section className="operations-board">
        <article className="card operations-column">
          <div className="card-header operations-column-header">
            <h3>
              <Sparkles size={18} color="#3498DB" />
              Housekeeping
            </h3>
            <span className="status-badge status-confirmed">{roomsToClean.length}</span>
          </div>

          {roomsToClean.length > 0 ? (
            <ul className="operations-list">
              {roomsToClean.map((room) => (
                <li key={room.suiteId} className="operations-item">
                  <div>
                    <div className="operations-item-title">{room.suiteName}</div>
                    <div className="operations-item-sub muted">
                      Room ready status required before check-in time
                    </div>
                  </div>
                  <span className={`operations-tag ${room.status == "needs_turnover" ? 'warning' : 'info'}`}>
                    {room.status == "needs_turnover" ? 'Turnover clean' : 'Standard clean'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">All rooms are clean and ready.</div>
          )}
        </article>
      </section>
    </div>
  );
}
