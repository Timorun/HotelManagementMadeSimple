import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAnalyticsReport } from '../api/backend';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Download,
  Euro,
  Percent,
  TrendingUp,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Filler,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isAfter,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns';
import { exportSheetsToExcel } from '../utils/excelExport';

ChartJS.register(
  ArcElement,
  Filler,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
);

const EMPTY_OBJECT = {};

export default function AnalyticsView() {
  const [report, setReport] = useState(null);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePreset, setActivePreset] = useState('mtd');

  const formatCurrency = useCallback((value, maximumFractionDigits = 0) => (
    new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: report?.currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(Number(value || 0))
  ), [report?.currency]);

  const formatNumber = useCallback((value, maximumFractionDigits = 0) => (
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    })
  ), []);

  const formatPercent = useCallback((value, digits = 1) => (
    `${Number(value || 0).toFixed(digits)}%`
  ), []);

  const formatChannelLabel = useCallback((channel) => {
    if (!channel) return 'Other';
    if (channel.toLowerCase() === 'booking.com') return 'Booking.com';
    return channel.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, []);

  const formatStatusLabel = useCallback((status) => {
    if (!status) return 'Unknown';
    return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, []);

  const quickRanges = useMemo(() => ([
    {
      key: 'mtd',
      label: 'Month To Date',
      range: () => {
        const today = new Date();
        return {
          from: format(startOfMonth(today), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'thisMonth',
      label: 'Current Month (Full)',
      range: () => {
        const today = new Date();
        return {
          from: format(startOfMonth(today), 'yyyy-MM-dd'),
          to: format(endOfMonth(today), 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'last30',
      label: 'Last 30 Days',
      range: () => {
        const today = new Date();
        return {
          from: format(subDays(today, 29), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'last90',
      label: 'Last 90 Days',
      range: () => {
        const today = new Date();
        return {
          from: format(subDays(today, 89), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        };
      },
    },
    {
      key: 'ytd',
      label: 'Year To Date',
      range: () => {
        const today = new Date();
        return {
          from: format(startOfYear(today), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        };
      },
    },
  ]), []);

  const applyQuickRange = useCallback((rangeKey) => {
    const selected = quickRanges.find((preset) => preset.key === rangeKey);
    if (!selected) return;

    const { from, to } = selected.range();
    setDateFrom(from);
    setDateTo(to);
    setActivePreset(rangeKey);
  }, [quickRanges]);

  const deltaClass = useCallback((value) => {
    if (value === null || value === undefined || value === '') return 'neutral';

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'neutral';

    if (numeric > 0.01) return 'positive';
    if (numeric < -0.01) return 'negative';
    return 'neutral';
  }, []);

  const formatDelta = useCallback((value, suffix = '%', reverseDirection = false) => {
    if (value === null || value === undefined || value === '') {
      return 'n/a';
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 'n/a';
    }

    const adjusted = reverseDirection ? -numeric : numeric;
    const sign = adjusted > 0 ? '+' : '';
    return `${sign}${adjusted.toFixed(1)}${suffix}`;
  }, []);

  const handleExportAnalytics = useCallback(() => {
    if (!report) return;

    const summary = report.summary || {};
    const previous = report.previousPeriodSummary || {};
    const deltas = report.deltas || {};
    const exportIncludesComparison = !!report.previousPeriodSummary && !!report.deltas;

    const summaryRows = [
      { metric: 'From', value: report.fromDate },
      { metric: 'To', value: report.toDate },
      { metric: 'Comparison Enabled', value: exportIncludesComparison ? 'Yes' : 'No' },
      { metric: 'Comparison From', value: exportIncludesComparison ? (report.comparisonFromDate || '') : '' },
      { metric: 'Comparison To', value: exportIncludesComparison ? (report.comparisonToDate || '') : '' },
      { metric: 'Comparison Mode', value: exportIncludesComparison ? (report.comparisonMode || '') : 'DISABLED' },
      { metric: 'Days In Period', value: report.daysInPeriod },
      { metric: 'Currency', value: report.currency || 'EUR' },
      { metric: 'Total Revenue', value: Number(summary.totalRevenue || 0) },
      { metric: 'Previous Revenue', value: exportIncludesComparison ? Number(previous.totalRevenue || 0) : '' },
      { metric: 'Revenue Change %', value: exportIncludesComparison ? Number(deltas.revenueChangePercentage || 0) : '' },
      { metric: 'Occupancy %', value: Number(summary.occupancyPercentage || 0) },
      { metric: 'Occupancy Delta pp', value: exportIncludesComparison ? Number(deltas.occupancyChangePercentagePoints || 0) : '' },
      { metric: 'ADR', value: Number(summary.averageDailyRate || 0) },
      { metric: 'ADR Change %', value: exportIncludesComparison ? Number(deltas.averageDailyRateChangePercentage || 0) : '' },
      { metric: 'RevPAR', value: Number(summary.revenuePerAvailableNight || 0) },
      { metric: 'RevPAR Change %', value: exportIncludesComparison ? Number(deltas.revParChangePercentage || 0) : '' },
      { metric: 'Cancellation Rate %', value: Number(summary.cancellationRate || 0) },
      { metric: 'Average Length Of Stay', value: Number(summary.averageLengthOfStay || 0) },
      { metric: 'Occupied Nights', value: Number(summary.occupiedNights || 0) },
      { metric: 'Available Nights', value: Number(summary.availableNights || 0) },
      { metric: 'Reservations Overlapping', value: Number(summary.reservationsOverlappingPeriod || 0) },
      { metric: 'Reservations Starting', value: Number(summary.reservationsStartingInPeriod || 0) },
    ];

    const dailyRows = (report.dailyTrend || []).map((point) => ({
      date: point.date,
      occupiedNights: point.occupiedNights,
      availableNights: point.availableNights,
      occupancyPercentage: Number(point.occupancyPercentage || 0),
      revenue: Number(point.revenue || 0),
      averageDailyRate: Number(point.averageDailyRate || 0),
      revenuePerAvailableNight: Number(point.revenuePerAvailableNight || 0),
      arrivals: point.arrivals,
      departures: point.departures,
    }));

    const channelRows = (report.channelPerformance || []).map((channel) => ({
      channel: formatChannelLabel(channel.channel),
      revenue: Number(channel.revenue || 0),
      reservations: channel.reservations,
      occupiedNights: channel.occupiedNights,
      revenueSharePercentage: Number(channel.revenueSharePercentage || 0),
      averageBookingValue: Number(channel.averageBookingValue || 0),
    }));

    const statusRows = (report.reservationStatusBreakdown || []).map((status) => ({
      status: formatStatusLabel(status.status),
      count: status.count,
      sharePercentage: Number(status.sharePercentage || 0),
    }));

    const topDaysRows = (report.topRevenueDays || []).map((day) => ({
      date: day.date,
      revenue: Number(day.revenue || 0),
      occupancyPercentage: Number(day.occupancyPercentage || 0),
      note: day.note,
    }));

    const insightRows = (report.insights || []).map((insight, index) => ({
      order: index + 1,
      insight,
    }));

    const definitionRows = Object.entries(report.metricDefinitions || {}).map(([metric, definition]) => ({
      metric,
      definition,
    }));

    exportSheetsToExcel({
      Summary: summaryRows,
      DailyTrend: dailyRows,
      Channels: channelRows,
      Statuses: statusRows,
      TopDays: topDaysRows,
      Insights: insightRows,
      Definitions: definitionRows,
    }, `analytics-report-${dateFrom}_to_${dateTo}.xlsx`);
  }, [report, dateFrom, dateTo, formatChannelLabel, formatStatusLabel]);

  const trendData = useMemo(() => {
    const points = report?.dailyTrend || [];
    return {
      labels: points.map((point) => format(parseISO(point.date), 'dd MMM')),
      datasets: [
        {
          label: 'Revenue',
          data: points.map((point) => Number(point.revenue || 0)),
          yAxisID: 'yRevenue',
          borderColor: '#16A34A',
          backgroundColor: 'rgba(22, 163, 74, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2.5,
        },
        {
          label: 'Occupancy %',
          data: points.map((point) => Number(point.occupancyPercentage || 0)),
          yAxisID: 'yPercent',
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [report?.dailyTrend]);

  const trendOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.dataset.yAxisID === 'yRevenue') {
              return `Revenue: ${formatCurrency(context.parsed.y, 0)}`;
            }
            return `Occupancy: ${context.parsed.y.toFixed(1)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 12,
        },
      },
      yRevenue: {
        position: 'left',
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value, 0),
        },
      },
      yPercent: {
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
    },
  }), [formatCurrency]);

  const channelData = useMemo(() => {
    const channels = report?.channelPerformance || [];
    return {
      labels: channels.map((channel) => formatChannelLabel(channel.channel)),
      datasets: [
        {
          label: 'Revenue Share %',
          data: channels.map((channel) => Number(channel.revenueSharePercentage || 0)),
          backgroundColor: ['#2563EB', '#F59E0B', '#10B981', '#9333EA', '#64748B', '#EA580C'],
          borderRadius: 6,
        },
      ],
    };
  }, [report?.channelPerformance, formatChannelLabel]);

  const channelOptions = useMemo(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `Share: ${Number(context.parsed.x || 0).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
    },
  }), []);

  const statusData = useMemo(() => {
    const statuses = report?.reservationStatusBreakdown || [];
    return {
      labels: statuses.map((status) => formatStatusLabel(status.status)),
      datasets: [
        {
          data: statuses.map((status) => Number(status.count || 0)),
          backgroundColor: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'],
          borderWidth: 0,
        },
      ],
    };
  }, [report?.reservationStatusBreakdown, formatStatusLabel]);

  const statusOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
    cutout: '65%',
  }), []);

  const summary = report?.summary || EMPTY_OBJECT;
  const previousSummary = report?.previousPeriodSummary || EMPTY_OBJECT;
  const deltas = report?.deltas || EMPTY_OBJECT;

  const selectedRangeDays = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(dateTo), parseISO(dateFrom)) + 1;
    } catch {
      return 0;
    }
  }, [dateFrom, dateTo]);

  const hasComparisonData = !!report?.previousPeriodSummary && !!report?.deltas;

  const periodLabel = useMemo(() => {
    const from = report?.fromDate || dateFrom;
    const to = report?.toDate || dateTo;
    if (!from || !to) {
      return null;
    }

    try {
      return `${format(parseISO(from), 'dd MMM yyyy')} - ${format(parseISO(to), 'dd MMM yyyy')}`;
    } catch {
      return `${from} - ${to}`;
    }
  }, [report?.fromDate, report?.toDate, dateFrom, dateTo]);

  const previousPeriodLabel = useMemo(() => {
    if (report?.comparisonFromDate && report?.comparisonToDate) {
      return `${format(parseISO(report.comparisonFromDate), 'dd MMM yyyy')} - ${format(parseISO(report.comparisonToDate), 'dd MMM yyyy')}`;
    }

    const currentStart = report?.fromDate || dateFrom;
    const days = Number(report?.daysInPeriod || selectedRangeDays || 0);
    if (!currentStart || days <= 0) {
      return 'Baseline unavailable';
    }

    try {
      const currentStartDate = parseISO(currentStart);
      const previousTo = subDays(currentStartDate, 1);
      const previousFrom = subDays(previousTo, days - 1);
      return `${format(previousFrom, 'dd MMM yyyy')} - ${format(previousTo, 'dd MMM yyyy')}`;
    } catch {
      return 'Baseline unavailable';
    }
  }, [report?.comparisonFromDate, report?.comparisonToDate, report?.fromDate, report?.daysInPeriod, dateFrom, selectedRangeDays]);

  const selectedLengthLabel = useMemo(
    () => `${Number(report?.daysInPeriod || selectedRangeDays || 0)} days`,
    [report?.daysInPeriod, selectedRangeDays]
  );

  const kpiCards = useMemo(() => ([
    {
      title: 'Total Revenue',
      value: formatCurrency(summary.totalRevenue, 0),
      secondary: hasComparisonData
        ? `Baseline: ${formatCurrency(previousSummary.totalRevenue, 0)}`
        : 'Baseline unavailable',
      delta: hasComparisonData ? formatDelta(deltas.revenueChangePercentage) : 'n/a',
      deltaClassName: hasComparisonData ? deltaClass(deltas.revenueChangePercentage) : 'neutral',
      icon: Euro,
      tone: 'revenue',
    },
    {
      title: 'Occupancy',
      value: formatPercent(summary.occupancyPercentage),
      secondary: hasComparisonData
        ? `Baseline: ${formatPercent(previousSummary.occupancyPercentage)}`
        : `${formatNumber(summary.occupiedNights)} of ${formatNumber(summary.availableNights)} nights`,
      delta: hasComparisonData ? formatDelta(deltas.occupancyChangePercentagePoints, 'pp') : 'n/a',
      deltaClassName: hasComparisonData ? deltaClass(deltas.occupancyChangePercentagePoints) : 'neutral',
      icon: Percent,
      tone: 'occupancy',
    },
    {
      title: 'ADR',
      value: formatCurrency(summary.averageDailyRate, 2),
      secondary: hasComparisonData
        ? `Baseline: ${formatCurrency(previousSummary.averageDailyRate, 2)}`
        : 'Average daily rate on occupied nights',
      delta: hasComparisonData ? formatDelta(deltas.averageDailyRateChangePercentage) : 'n/a',
      deltaClassName: hasComparisonData ? deltaClass(deltas.averageDailyRateChangePercentage) : 'neutral',
      icon: TrendingUp,
      tone: 'adr',
    },
    {
      title: 'RevPAR',
      value: formatCurrency(summary.revenuePerAvailableNight, 2),
      secondary: hasComparisonData
        ? `Baseline: ${formatCurrency(previousSummary.revenuePerAvailableNight, 2)}`
        : 'Revenue per available room night',
      delta: hasComparisonData ? formatDelta(deltas.revParChangePercentage) : 'n/a',
      deltaClassName: hasComparisonData ? deltaClass(deltas.revParChangePercentage) : 'neutral',
      icon: Activity,
      tone: 'revpar',
    },
    {
      title: 'Cancellation Rate',
      value: formatPercent(summary.cancellationRate),
      secondary: hasComparisonData
        ? `Baseline: ${formatPercent(previousSummary.cancellationRate)}`
        : `${formatNumber(summary.cancelledReservations)} cancelled bookings`,
      delta: hasComparisonData ? formatDelta(deltas.cancellationRateChangePercentagePoints, 'pp', true) : 'n/a',
      deltaClassName: hasComparisonData
        ? deltaClass(-(Number(deltas.cancellationRateChangePercentagePoints || 0)))
        : 'neutral',
      icon: AlertTriangle,
      tone: 'risk',
    }
  ]), [
    summary,
    previousSummary,
    deltas,
    formatCurrency,
    formatPercent,
    formatNumber,
    formatDelta,
    deltaClass,
    hasComparisonData,
  ]);

  const hasChartData = (report?.dailyTrend || []).length > 0;
  const hasChannelData = (report?.channelPerformance || []).length > 0;
  const hasStatusData = (report?.reservationStatusBreakdown || []).length > 0;

  useEffect(() => {
    async function loadReport() {
      let from;
      let to;

      try {
        from = parseISO(dateFrom);
        to = parseISO(dateTo);
      } catch {
        setError('Invalid date format.');
        setLoading(false);
        setReport(null);
        return;
      }

      if (isAfter(from, to)) {
        setError('From date must be before or equal to To date.');
        setLoading(false);
        setReport(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const analyticsReport = await fetchAnalyticsReport(dateFrom, dateTo, true);
        setReport(analyticsReport);
      } catch (requestError) {
        setError(requestError?.message || 'Failed to fetch analytics report.');
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Building analytics dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error-message">
          <strong>Analytics Report Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>No analytics report available for the selected period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <section className="card analytics-hero">
        <div className="analytics-hero-top">
          <div>
            <h2 className="analytics-hero-title">
              <BarChart3 size={28} />
              Analytics Hub
            </h2>
            <p className="analytics-hero-subtitle">
              Revenue and operations in one view, automatically compared with the immediately preceding period of equal length.
            </p>
          </div>

          <button className="btn btn-accent" onClick={handleExportAnalytics}>
            <Download size={16} />
            Export Analytics Report
          </button>
        </div>

        <div className="analytics-control-grid">
          <div>
            <label className="form-label">From</label>
            <input
              type="date"
              className="form-input analytics-date-input"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setActivePreset('custom');
              }}
            />
          </div>
          <div>
            <label className="form-label">To</label>
            <input
              type="date"
              className="form-input analytics-date-input"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setActivePreset('custom');
              }}
            />
          </div>
          <div className="analytics-presets">
            <span className="analytics-presets-label">Quick Range</span>
            <div className="analytics-presets-buttons">
              {quickRanges.map((preset) => (
                <button
                  key={preset.key}
                  className={`analytics-preset-btn ${activePreset === preset.key ? 'active' : ''}`}
                  onClick={() => applyQuickRange(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <small className="analytics-presets-hint">
              Baseline comparison is always on and uses the immediately preceding window with equal length.
            </small>
          </div>
        </div>

        <div className="analytics-period-strip">
          <div className="analytics-period-main">
            <span className="analytics-strip-label">Selected Period</span>
            <strong>{periodLabel || `${dateFrom} - ${dateTo}`}</strong>
            <small className="analytics-strip-subtle">Compared with {previousPeriodLabel}</small>
            <small className="analytics-strip-subtle">{selectedLengthLabel}</small>
          </div>
        </div>
      </section>

      <section className="analytics-kpi-grid">
        {kpiCards.map((card) => (
          <article key={card.title} className={`analytics-kpi-card tone-${card.tone}`}>
            <div className="analytics-kpi-head">
              <span>{card.title}</span>
              <card.icon size={18} />
            </div>
            <div className="analytics-kpi-value">{card.value}</div>
            <div className="analytics-kpi-foot">
              <span>{card.secondary}</span>
              {hasComparisonData ? (
                <span className={`analytics-delta ${card.deltaClassName}`}>{card.delta}</span>
              ) : (
                <span className="analytics-delta neutral">Baseline unavailable</span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="analytics-main-grid">
        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>Revenue & Occupancy Trajectory</h3>
            <span>Daily pattern across the selected period</span>
          </div>
          <div className="analytics-chart-area">
            {hasChartData ? (
              <Line data={trendData} options={trendOptions} />
            ) : (
              <div className="empty-state compact-empty">
                <p>No daily trend data available for this period.</p>
              </div>
            )}
          </div>
        </article>

        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>Channel Revenue Concentration</h3>
            <span>Share of total period revenue by acquisition source</span>
          </div>
          <div className="analytics-chart-area analytics-chart-area-sm">
            {hasChannelData ? (
              <Bar data={channelData} options={channelOptions} />
            ) : (
              <div className="empty-state compact-empty">
                <p>No channel mix data available for this period.</p>
              </div>
            )}
          </div>

          {hasChannelData && (
            <div className="analytics-mini-table-wrap">
              <table className="analytics-mini-table">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Revenue</th>
                    <th>Share</th>
                    <th>ABV</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.channelPerformance || []).slice(0, 5).map((channel) => (
                    <tr key={channel.channel}>
                      <td>{formatChannelLabel(channel.channel)}</td>
                      <td>{formatCurrency(channel.revenue, 0)}</td>
                      <td>{formatPercent(channel.revenueSharePercentage)}</td>
                      <td>{formatCurrency(channel.averageBookingValue, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <section className="analytics-secondary-grid">
        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>Strategic Insights</h3>
            <span>Auto-generated summary for revenue management and operations</span>
          </div>
          {(report.insights || []).length > 0 ? (
            <ul className="analytics-insight-list">
              {(report.insights || []).map((insight, index) => (
                <li key={`${insight}-${index}`}>{insight}</li>
              ))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">
              <p>No strategic insights available for this period.</p>
            </div>
          )}
        </article>

        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>Top Revenue Days</h3>
            <span>Best performing days with contextual annotation</span>
          </div>
          {(report.topRevenueDays || []).length > 0 ? (
            <div className="analytics-mini-table-wrap">
              <table className="analytics-mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Revenue</th>
                    <th>Occupancy</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.topRevenueDays || []).map((day) => (
                    <tr key={day.date}>
                      <td>{format(parseISO(day.date), 'dd MMM yyyy')}</td>
                      <td>{formatCurrency(day.revenue, 0)}</td>
                      <td>{formatPercent(day.occupancyPercentage)}</td>
                      <td>{day.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <p>No highlighted days available for this period.</p>
            </div>
          )}
        </article>
      </section>

      <section className="analytics-secondary-grid">
        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>Reservation Status Mix</h3>
            <span>Distribution of reservations starting in this period</span>
          </div>
          <div className="analytics-status-grid">
            <div className="analytics-donut-area">
              {hasStatusData ? (
                <Doughnut data={statusData} options={statusOptions} />
              ) : (
                <div className="empty-state compact-empty">
                  <p>No status distribution data available.</p>
                </div>
              )}
            </div>
            <div>
              <ul className="analytics-status-list">
                {(report.reservationStatusBreakdown || []).map((status) => (
                  <li key={status.status}>
                    <span>{formatStatusLabel(status.status)}</span>
                    <strong>{formatNumber(status.count)} ({formatPercent(status.sharePercentage)})</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>Metric Playbook</h3>
            <span>Definitions used in this dashboard</span>
          </div>
          {Object.entries(report.metricDefinitions || {}).length > 0 ? (
            <dl className="analytics-definition-list">
              {Object.entries(report.metricDefinitions || {}).map(([metric, definition]) => (
                <div key={metric}>
                  <dt>{metric}</dt>
                  <dd>{definition}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="empty-state compact-empty">
              <p>No metric definitions available.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
