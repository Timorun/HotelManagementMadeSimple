import { useEffect, useState } from 'react';
import { fetchAnalytics, fetchReservations } from '../api/backend';
import { TrendingUp, DollarSign, Calendar, Percent, BarChart3 } from 'lucide-react';
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
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsView() {
  const [analytics, setAnalytics] = useState(null);
  const [trendPoints, setTrendPoints] = useState([]);
  const [revenueByChannel, setRevenueByChannel] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const current = await fetchAnalytics(selectedMonth);
        setAnalytics(current);

        const months = Array.from({ length: 6 }).map((_, idx) => format(subMonths(new Date(`${selectedMonth}-01`), 5 - idx), 'yyyy-MM'));
        const monthlyData = await Promise.all(months.map((month) => fetchAnalytics(month)));
        const toMonthString = (monthValue) => {
          if (Array.isArray(monthValue) && monthValue.length >= 2) {
            const [year, month] = monthValue;
            return `${year}-${String(month).padStart(2, '0')}`;
          }
          return String(monthValue);
        };

        setTrendPoints(monthlyData.map((item) => ({
          label: format(new Date(`${toMonthString(item.month)}-01`), 'MMM'),
          occupancy: item.occupancyPercentage || 0,
        })));

        const monthStart = format(startOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd');
        const reservations = await fetchReservations(monthStart, monthEnd);
        const grouped = reservations.reduce((acc, reservation) => {
          const channel = reservation.channel || 'other';
          acc[channel] = (acc[channel] || 0) + Number(reservation.priceTotal || 0);
          return acc;
        }, {});
        setRevenueByChannel(grouped);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        Error loading analytics data. Please try again.
      </div>
    );
  }

  if (!analytics) return null;

  const occupancyPercentage = Number(analytics.occupancyPercentage || 0);
  const totalRevenue = Number(analytics.totalRevenue || 0);
  const averagePricePerNight = Number(analytics.averagePricePerNight || 0);

  const kpiData = [
    {
      title: 'Total Reservations',
      value: analytics.totalReservations || 0,
      icon: Calendar,
      color: '#3498DB',
      prefix: '',
      suffix: '',
    },
    {
      title: 'Total Revenue',
      value: totalRevenue,
      icon: DollarSign,
      color: '#27AE60',
      prefix: '€',
      suffix: '',
    },
    {
      title: 'Occupancy Rate',
      value: occupancyPercentage ? occupancyPercentage.toFixed(1) : 0,
      icon: Percent,
      color: '#E67E22',
      prefix: '',
      suffix: '%',
    },
    {
      title: 'Avg Daily Rate',
      value: averagePricePerNight ? averagePricePerNight.toFixed(0) : 0,
      icon: TrendingUp,
      color: '#9B59B6',
      prefix: '€',
      suffix: '',
    },
  ];

  const trendData = {
    labels: trendPoints.map(point => point.label),
    datasets: [
      {
        label: 'Occupancy %',
        data: trendPoints.map(point => point.occupancy),
        borderColor: '#E67E22',
        backgroundColor: 'rgba(230, 126, 34, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const revenueByChannelData = {
    labels: Object.keys(revenueByChannel).map(key => key.charAt(0).toUpperCase() + key.slice(1)),
    datasets: [
      {
        label: 'Revenue (€)',
        data: Object.values(revenueByChannel),
        backgroundColor: [
          '#3498DB',
          '#E67E22',
          '#27AE60',
          '#9B59B6',
          '#95A5A6',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <div className="card mb-3">
        <div className="card-header">
          <h2>
            <BarChart3 size={28} />
            Analytics & Reports
          </h2>
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>Select Month:</label>
            <input
              type="month"
              className="form-input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: 'auto' }}
            />
          </div>
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
            <div className="kpi-value">
              {kpi.prefix}{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}{kpi.suffix}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-2 mb-3">
        <div className="card">
          <div className="card-header">
            <h3>Occupancy Trend</h3>
          </div>
          <div style={{ height: '300px', padding: '1rem' }}>
            <Line data={trendData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Revenue by Channel</h3>
          </div>
          <div style={{ height: '300px', padding: '1rem' }}>
            <Bar data={revenueByChannelData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="card">
        <div className="card-header">
          <h3>Detailed Metrics</h3>
        </div>
        <div className="grid grid-3" style={{ gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Average Length of Stay
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              4.2 nights
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Cancellation Rate
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              8.5%
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Revenue Per Available Room
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              €{averagePricePerNight ? (averagePricePerNight * (occupancyPercentage / 100)).toFixed(0) : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="card mt-3">
        <div className="card-header">
          <h3>Key Insights</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <ul style={{ marginLeft: '1.5rem', lineHeight: '2' }}>
            <li>
              <strong>Occupancy is {occupancyPercentage > 70 ? 'strong' : 'moderate'}</strong> at {occupancyPercentage.toFixed(1)}% for the month
            </li>
            <li>
              <strong>Total revenue:</strong> €{totalRevenue.toLocaleString()} from {analytics.totalReservations} reservations
            </li>
            <li>
              <strong>Average daily rate:</strong> €{averagePricePerNight.toFixed(0)} per night
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
