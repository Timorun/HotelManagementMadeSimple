import { useEffect, useState } from 'react';
import { fetchAnalytics, fetchOperationsDashboard, fetchSuites, fetchGuests } from '../api/backend';
import { Calendar, TrendingUp, Users, Home, DollarSign, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
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
      .catch(setError)
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
      title: 'Total Reservations',
      value: analytics?.totalReservations || 0,
      icon: Calendar,
      color: '#3498DB',
      change: '+12%',
      positive: true,
    },
    {
      title: 'Occupancy Rate',
      value: analytics?.occupancyRate ? `${analytics.occupancyRate.toFixed(1)}%` : '0%',
      icon: Home,
      color: '#27AE60',
      change: '+5.3%',
      positive: true,
    },
    {
      title: 'Total Revenue',
      value: analytics?.totalRevenue ? `€${analytics.totalRevenue.toLocaleString()}` : '€0',
      icon: DollarSign,
      color: '#E67E22',
      change: '+18%',
      positive: true,
    },
    {
      title: 'Avg Daily Rate',
      value: analytics?.averageDailyRate ? `€${analytics.averageDailyRate.toFixed(0)}` : '€0',
      icon: TrendingUp,
      color: '#9B59B6',
      change: '-2.1%',
      positive: false,
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
            <BarChart3 size={28} />
            Dashboard Overview
          </h2>
          <span className="text-muted">Welcome to Carmen Suites Management</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4 mb-3">
        {kpiData.map((kpi, index) => (
          <div key={index} className="kpi-card" style={{ borderLeftColor: kpi.color }}>
            <div className="kpi-header">
              <span className="kpi-title">{kpi.title}</span>
              <div className="kpi-icon" style={{ background: kpi.color }}>
                <kpi.icon size={20} />
              </div>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className={`kpi-change ${kpi.positive ? 'positive' : 'negative'}`}>
              {kpi.positive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              {kpi.change} from last month
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2 mb-3">
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h3>Monthly Revenue Trend</h3>
          </div>
          <div style={{ height: '300px' }}>
            <Bar data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        {/* Occupancy Chart */}
        <div className="card">
          <div className="card-header">
            <h3>Current Occupancy</h3>
          </div>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '250px', height: '250px' }}>
              <Doughnut data={occupancyChartData} options={doughnutOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Operations */}
      <div className="grid grid-3 mb-3">
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem' }}>Arrivals Today</h3>
            <span className="status-badge status-confirmed">{operations?.arrivalsToday?.length || 0}</span>
          </div>
          <div>
            {operations?.arrivalsToday?.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {operations.arrivalsToday.slice(0, 5).map((arrival) => (
                  <li key={arrival.reservationId} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--light-gray)' }}>
                    <div style={{ fontWeight: 600 }}>{arrival.guestName}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>{arrival.suiteName}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No arrivals today</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem' }}>Departures Today</h3>
            <span className="status-badge status-pending">{operations?.departuresToday?.length || 0}</span>
          </div>
          <div>
            {operations?.departuresToday?.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {operations.departuresToday.slice(0, 5).map((departure) => (
                  <li key={departure.reservationId} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--light-gray)' }}>
                    <div style={{ fontWeight: 600 }}>{departure.guestName}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>{departure.suiteName}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>No departures today</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem' }}>Rooms to Clean</h3>
            <span className="status-badge status-checked-in">{operations?.roomsToClean?.length || 0}</span>
          </div>
          <div>
            {operations?.roomsToClean?.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {operations.roomsToClean.slice(0, 5).map((room) => (
                  <li key={room.suiteId} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--light-gray)' }}>
                    <div style={{ fontWeight: 600 }}>{room.suiteName}</div>
                    {room.turnoverRequired && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--warning)' }}>Turnover Required</div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>All rooms clean</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Suite Overview</h3>
          </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{suites.length}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>Total Suites</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                {suites.filter(s => s.active).length}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>Active Suites</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Guest Database</h3>
          </div>
          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{guests.length}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>Total Guests</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>
                {guests.filter(g => g.marketingConsent).length}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)' }}>Marketing Opt-in</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
