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
import { useI18n } from '../context/I18nContext';

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
  const { tr, locale, dateLocale } = useI18n();
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
        <p className="mt-2">{tr('Loading dashboard...', 'Cargando panel...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        {tr('Error loading dashboard data. Please try again.', 'Error al cargar datos del panel. Intentalo de nuevo.')}
      </div>
    );
  }

  const formatCurrency = (value, maximumFractionDigits = 0) => (
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(Number(value || 0))
  );

  const kpiData = [
    {
      title: tr('Arrivals Today', 'Llegadas de hoy'),
      value: operations?.arrivalsToday?.length || 0,
      icon: LogIn,
      color: '#27AE60',
      description: tr('Check-ins', 'Check-ins'),
    },
    {
      title: tr('Departures Today', 'Salidas de hoy'),
      value: operations?.departuresToday?.length || 0,
      icon: LogOut,
      color: '#E67E22',
      description: tr('Check-outs', 'Check-outs'),
    },
    {
      title: tr('Rooms to Clean', 'Habitaciones por limpiar'),
      value: operations?.roomsToClean?.length || 0,
      icon: Sparkles,
      color: '#3498DB',
      description: tr('Housekeeping', 'Limpieza'),
    },
    {
      title: tr('Occupancy Rate', 'Tasa de ocupacion'),
      value: analytics?.occupancyRate ? `${analytics.occupancyRate.toFixed(0)}%` : '0%',
      icon: Home,
      color: '#9B59B6',
      description: tr("Today's suites", 'Suites de hoy'),
    },
  ];

  const occupancyChartData = {
    labels: [tr('Occupied', 'Ocupadas'), tr('Available', 'Disponibles')],
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
    labels: [tr('Jan', 'Ene'), tr('Feb', 'Feb'), tr('Mar', 'Mar'), tr('Apr', 'Abr'), tr('May', 'May'), tr('Jun', 'Jun')],
    datasets: [
      {
        label: tr('Revenue (€)', 'Ingresos (€)'),
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
            {tr("Today's Operations", 'Operaciones de hoy')}
          </h2>
          <span className="text-muted">
            {format(new Date(), 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
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
              {tr('Arrivals Today', 'Llegadas de hoy')}
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
                        {arrival.numGuests} {arrival.numGuests > 1 ? tr('guests', 'huespedes') : tr('guest', 'huesped')}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', textAlign: 'right' }}>
                      {tr('Res', 'Res')} #{arrival.reservationId}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>{tr('No arrivals scheduled', 'No hay llegadas programadas')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Departures */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogOut size={20} color="#E67E22" />
              {tr('Departures Today', 'Salidas de hoy')}
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
                        {departure.numGuests} {departure.numGuests > 1 ? tr('guests', 'huespedes') : tr('guest', 'huesped')}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', textAlign: 'right' }}>
                      {tr('Res', 'Res')} #{departure.reservationId}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>{tr('No departures scheduled', 'No hay salidas programadas')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Housekeeping */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#3498DB" />
              {tr('Rooms to Clean', 'Habitaciones por limpiar')}
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
                    {room.status === "needs_turnover" && (
                      <span className="status-badge status-pending" style={{ fontSize: '0.7rem' }}>
                        {tr('Turnover Required', 'Cambio requerido')}
                      </span>
                    )}
                    {room.status != "needs_turnover" && (
                      <span className="status-badge status-confirmed" style={{ fontSize: '0.7rem' }}>
                        {tr('Standard Clean', 'Limpieza estandar')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p>{tr('All rooms clean', 'Todas las habitaciones limpias')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tertiary: Analytics Overview - Bottom */}
      <div className="card">
        <div className="card-header">
          <h3>{tr('Monthly Overview', 'Resumen mensual')}</h3>
        </div>
        <div className="grid grid-3" style={{ gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              {tr('Total Reservations', 'Reservas totales')}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {analytics?.totalReservations || 0}
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              {tr('Total Revenue', 'Ingresos totales')}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {formatCurrency(analytics?.totalRevenue, 0)}
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              {tr('Avg Price Per Night', 'Precio medio por noche')}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {formatCurrency(analytics?.averagePricePerNight, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
