import { useEffect, useState } from 'react';
import { fetchAnalytics, fetchOperationsDashboard, fetchSuites, fetchGuests } from '../api/backend';
import { LogIn, LogOut, Sparkles, Users, Home, BarChart3, ClipboardCheck } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [operations, setOperations] = useState(null);
  const [suites, setSuites] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchAnalytics(),
      fetchOperationsDashboard(),
      fetchSuites(),
      fetchGuests(),
    ])
      .then(([analyticsData, opsData, suitesData, guestsData]) => {
        setAnalytics(analyticsData);
        setOperations(opsData);
        setSuites(suitesData);
        setGuests(guestsData);
      })
      .catch((err) => setError(err?.message || String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        Error loading dashboard data. Please try again.
      </div>
    );
  }

  const kpiData = [
    {
      title: 'Arrivals Today',
      value: operations?.arrivalsToday?.length || 0,
      icon: LogIn,
      color: '#27AE60',
      description: 'Check-ins',
    },
    {
      title: 'Departures Today',
      value: operations?.departuresToday?.length || 0,
      icon: LogOut,
      color: '#E67E22',
      description: 'Check-outs',
    },
    {
      title: 'Rooms to Clean',
      value: operations?.roomsToClean?.length || 0,
      icon: Sparkles,
      color: '#3498DB',
      description: 'Housekeeping',
    },
    {
      title: 'Occupancy Rate',
      value: analytics?.occupancyRate ? `${analytics.occupancyRate.toFixed(0)}%` : '0%',
      icon: Home,
      color: '#9B59B6',
      description: 'Today\'s suites',
    },
  ];

  const occupancyChartData = {
    labels: ['Occupied', 'Available'],
    datasets: [
      {
        data: [
          analytics?.occupancyRate || 0,
          100 - (analytics?.occupancyRate || 0),
        ],
        backgroundColor: ['#27AE60', '#ECF0F1'],
        borderWidth: 0,
      },
    ],
  };

  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue (€)',
        data: [28000, 31000, 29500, 32850, 30200, 33500],
        backgroundColor: '#E67E22',
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div>
      <div className="card mb-3">
        <div className="card-header">
          <h2>
            <ClipboardCheck size={28} />
            Today's Operations
          </h2>
          <span className="text-muted">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Operations Cards - Main Content */}
      <div className="grid grid-3 mb-3">
        {/* Arrivals */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={20} color="#27AE60" />
              Arrivals Today
            </h3>
            <span className="status-badge status-checked-in" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              {operations?.arrivalsToday?.length || 0}
            </span>
          </div>
          <div>
            {operations?.arrivalsToday?.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {operations.arrivalsToday.map((arrival) => (
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', textAlign: 'right' }}>
                      Res #{arrival.reservationId}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>✓ No arrivals scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Departures */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogOut size={20} color="#E67E22" />
              Departures Today
            </h3>
            <span className="status-badge status-pending" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              {operations?.departuresToday?.length || 0}
            </span>
          </div>
          <div>
            {operations?.departuresToday?.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {operations.departuresToday.map((departure) => (
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', textAlign: 'right' }}>
                      Res #{departure.reservationId}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>✓ No departures scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Housekeeping */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#3498DB" />
              Rooms to Clean
            </h3>
            <span className="status-badge status-confirmed" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
              {operations?.roomsToClean?.length || 0}
            </span>
          </div>
          <div>
            {operations?.roomsToClean?.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {operations.roomsToClean.map((room) => (
                  <li
                    key={room.suiteId}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--light-gray)',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                      {room.suiteName}
                    </div>
                    {room.status == "needs_turnover" && (
                      <span className="status-badge status-pending" style={{ fontSize: '0.7rem' }}>
                        Turnover Required
                      </span>
                    )}
                    {room.status != "needs_turnover" && (
                      <span className="status-badge status-confirmed" style={{ fontSize: '0.7rem' }}>
                        Standard Clean
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>✓ All rooms clean</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tertiary: Analytics Overview - Bottom */}
      <div className="card">
        <div className="card-header">
          <h3>Monthly Overview</h3>
        </div>
        <div className="grid grid-3" style={{ gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Total Reservations
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {analytics?.totalReservations || 0}
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Total Revenue
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              €{analytics?.totalRevenue?.toLocaleString() || '0'}
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Avg Price Per Night
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              €{analytics?.averagePricePerNight?.toFixed(0) || '0'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
