import { useCallback, useEffect, useState } from 'react';
import { fetchAnalytics, fetchAnalyticsReport } from '../api/backend';
import { TrendingUp, DollarSign, Calendar, Percent, BarChart3, Download } from 'lucide-react';
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
import { addMonths, endOfMonth, format, isAfter, parseISO, startOfMonth } from 'date-fns';
import { exportRowsToExcel } from '../utils/excelExport';

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
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toMonthString = useCallback((monthValue) => {
    if (Array.isArray(monthValue) && monthValue.length >= 2) {
      const [year, month] = monthValue;
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    return String(monthValue);
  }, []);

  const listMonthsInRange = useCallback((fromDate, toDate) => {
    const startMonth = startOfMonth(parseISO(fromDate));
    const endMonth = startOfMonth(parseISO(toDate));
    const months = [];
    let current = startMonth;

    while (!isAfter(current, endMonth) && months.length < 24) {
      months.push(format(current, 'yyyy-MM'));
      current = addMonths(current, 1);
    }

    return months;
  }, []);

  const formatChannelLabel = useCallback((channel) => {
    if (!channel) {
      return 'Other';
    }

    if (channel.toLowerCase() === 'booking.com') {
      return 'Booking.com';
    }

    return channel.charAt(0).toUpperCase() + channel.slice(1);
  }, []);

  const formatMetric = useCallback((value, decimals = 0) => (
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  ), []);

  const handleExportAnalytics = useCallback(() => {
    if (!analytics) {
      return;
    }

    const averageDailyRate = Number((analytics.averageDailyRate ?? analytics.averagePricePerNight) || 0);
    const rows = [
      { section: 'Report Period', metric: 'From', value: dateFrom },
      { section: 'Report Period', metric: 'To', value: dateTo },
      { section: 'Summary', metric: 'Total Reservations (Overlapping Stay)', value: Number(analytics.totalReservations || 0) },
      { section: 'Summary', metric: 'Total Revenue', value: Number(analytics.totalRevenue || 0) },
      { section: 'Summary', metric: 'Occupancy Percentage', value: Number(analytics.occupancyPercentage || 0) },
      { section: 'Summary', metric: 'Average Daily Rate (ADR)', value: averageDailyRate },
      { section: 'Summary', metric: 'Revenue Per Available Room Night (RevPAR)', value: Number(analytics.revenuePerAvailableNight || 0) },
      { section: 'Summary', metric: 'Occupied Nights', value: Number(analytics.totalNights || 0) },
      { section: 'Summary', metric: 'Available Nights', value: Number(analytics.availableNights || 0) },
      { section: 'Summary', metric: 'Average Length of Stay', value: Number(analytics.averageLengthOfStay || 0) },
      { section: 'Summary', metric: 'Cancellation Rate', value: Number(analytics.cancellationRate || 0) },
      { section: 'Summary', metric: 'Cancelled Reservations', value: Number(analytics.cancelledReservations || 0) },
      { section: 'Summary', metric: 'Reservations Starting In Period', value: Number(analytics.reservationsStartingInPeriod || 0) },
      { section: 'Definition', metric: 'ADR Formula', value: 'Total Revenue / Occupied Nights (excludes empty nights)' },
      { section: 'Definition', metric: 'RevPAR Formula', value: 'Total Revenue / Available Room Nights (includes empty nights)' },
      { section: 'Definition', metric: 'Cancellation Rate Formula', value: 'Cancelled Reservations / Reservations Starting In Period' },
    ];

    const channelEntries = Object.entries(analytics.revenueByChannel || {});
    channelEntries.forEach(([channel, revenue]) => {
      rows.push({
        section: 'Revenue by Channel',
        metric: formatChannelLabel(channel),
        value: Number(revenue || 0),
      });
    });

    exportRowsToExcel(rows, `analytics-report-${dateFrom}_to_${dateTo}.xlsx`, 'Analytics');
  }, [analytics, dateFrom, dateTo, formatChannelLabel]);

  useEffect(() => {
    async function load() {
      const from = parseISO(dateFrom);
      const to = parseISO(dateTo);

      if (isAfter(from, to)) {
        setError('From date must be before or equal to To date.');
        setLoading(false);
        setAnalytics(null);
        setTrendPoints([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const report = await fetchAnalyticsReport(dateFrom, dateTo);
        setAnalytics(report);

        const months = listMonthsInRange(dateFrom, dateTo);
        const monthlyData = await Promise.all(months.map((month) => fetchAnalytics(month)));
        setTrendPoints(monthlyData.map((item) => ({
          label: format(parseISO(`${toMonthString(item.month)}-01`), 'MMM yy'),
          occupancy: Number(item.occupancyPercentage || 0),
        })));
      } catch (err) {
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [dateFrom, dateTo, listMonthsInRange, toMonthString]);

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
  const averageDailyRate = Number((analytics.averageDailyRate ?? analytics.averagePricePerNight) || 0);
  const revenuePerAvailableNight = Number(analytics.revenuePerAvailableNight || 0);
  const averageLengthOfStay = Number(analytics.averageLengthOfStay || 0);
  const cancellationRate = Number(analytics.cancellationRate || 0);
  const totalNights = Number(analytics.totalNights || 0);
  const availableNights = Number(analytics.availableNights || 0);
  const cancelledReservations = Number(analytics.cancelledReservations || 0);
  const reservationsStartingInPeriod = Number(analytics.reservationsStartingInPeriod || 0);

  const revenueByChannelEntries = Object.entries(analytics.revenueByChannel || {}).sort(
    (a, b) => Number(b[1] || 0) - Number(a[1] || 0)
  );

  const kpiData = [
    {
      title: 'Total Reservations',
      value: analytics.totalReservations || 0,
      icon: Calendar,
      color: '#3498DB',
      decimals: 0,
      prefix: '',
      suffix: '',
    },
    {
      title: 'Total Revenue',
      value: totalRevenue,
      icon: DollarSign,
      color: '#27AE60',
      decimals: 0,
      prefix: '€',
      suffix: '',
    },
    {
      title: 'Occupancy Rate',
      value: occupancyPercentage,
      icon: Percent,
      color: '#E67E22',
      decimals: 1,
      prefix: '',
      suffix: '%',
    },
    {
      title: 'Avg Daily Rate (ADR)',
      value: averageDailyRate,
      icon: TrendingUp,
      color: '#9B59B6',
      decimals: 2,
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
    labels: revenueByChannelEntries.map(([channel]) => formatChannelLabel(channel)),
    datasets: [
      {
        label: 'Revenue (€)',
        data: revenueByChannelEntries.map(([, revenue]) => Number(revenue || 0)),
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
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              alignItems: 'end',
            }}
          >
            <div>
              <label className="form-label">From:</label>
              <input
                type="date"
                className="form-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">To:</label>
              <input
                type="date"
                className="form-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <button className="btn btn-outline" onClick={handleExportAnalytics}>
              <Download size={16} />
              Export Excel
            </button>
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
              {kpi.prefix}{formatMetric(kpi.value, kpi.decimals)}{kpi.suffix}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-2 mb-3">
        <div className="card">
          <div className="card-header">
            <h3>Occupancy Trend (Monthly)</h3>
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
            {revenueByChannelEntries.length > 0 ? (
              <Bar data={revenueByChannelData} options={chartOptions} />
            ) : (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <p>No revenue by channel data for the selected period.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="card">
        <div className="card-header">
          <h3>Detailed Metrics</h3>
        </div>
        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Average Length of Stay
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {formatMetric(averageLengthOfStay, 2)} nights
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--dark-gray)' }}>
              Calculated over reservations starting in this range.
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Cancellation Rate
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {formatMetric(cancellationRate, 2)}%
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--dark-gray)' }}>
              {cancelledReservations} cancelled / {reservationsStartingInPeriod} reservations starting in this range.
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Occupied Nights
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {formatMetric(totalNights, 0)} / {formatMetric(availableNights, 0)}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--dark-gray)' }}>
              Occupied room nights out of all available room nights.
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.5rem' }}>
              Revenue Per Available Room Night (RevPAR)
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              €{formatMetric(revenuePerAvailableNight, 2)}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--dark-gray)' }}>
              Includes empty nights in the denominator.
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">
          <h3>Metric Definitions</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <ul style={{ marginLeft: '1.25rem', lineHeight: '1.9' }}>
            <li><strong>ADR (Average Daily Rate):</strong> Total revenue divided by occupied nights only. Empty nights are excluded.</li>
            <li><strong>RevPAR:</strong> Total revenue divided by all available room nights. Empty nights are included.</li>
            <li><strong>Occupancy Rate:</strong> Occupied room nights divided by available room nights for the selected period.</li>
            <li><strong>Cancellation Rate:</strong> Cancelled reservations divided by reservations with check-in dates in the selected period.</li>
          </ul>
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
              <strong>Occupancy is {occupancyPercentage > 70 ? 'strong' : 'moderate'}</strong> at {occupancyPercentage.toFixed(1)}% for the selected period
            </li>
            <li>
              <strong>Total revenue:</strong> €{totalRevenue.toLocaleString()} from {analytics.totalReservations} reservations overlapping this range
            </li>
            <li>
              <strong>Average daily rate (occupied nights only):</strong> €{averageDailyRate.toFixed(2)} per occupied night
            </li>
            <li>
              <strong>RevPAR (includes empty nights):</strong> €{revenuePerAvailableNight.toFixed(2)} per available room night
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
