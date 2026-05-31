import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAnalyticsReport, fetchNationalities } from '../api/backend';
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
  isValid,
  parseISO,
  startOfMonth,
  subDays,
  subYears,
} from 'date-fns';
import { exportSheetsToExcel } from '../utils/excelExport';
import { useI18n } from '../context/I18nContext';
import { getStatusLabel } from '../api/reservationStatus';

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
const COMPARISON_MODE_SAME_DATES_LAST_YEAR = 'SAME_DATES_LAST_YEAR';
const COMPARISON_MODE_CUSTOM_RANGE = 'CUSTOM_RANGE';

function isCompleteDateValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

export default function AnalyticsView() {
  const { tr, locale, dateLocale } = useI18n();
  const [report, setReport] = useState(null);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePreset, setActivePreset] = useState('mtd');
  const [comparisonMode, setComparisonMode] = useState(COMPARISON_MODE_SAME_DATES_LAST_YEAR);
  const [comparisonFrom, setComparisonFrom] = useState('');
  const [comparisonTo, setComparisonTo] = useState('');
  const [nationalities, setNationalities] = useState([]);
  const [selectedNationalityCode, setSelectedNationalityCode] = useState('all');

  const formatCurrency = useCallback((value, maximumFractionDigits = 0) => (
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: report?.currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(Number(value || 0))
  ), [locale, report?.currency]);

  const formatNumber = useCallback((value, maximumFractionDigits = 0) => (
    Number(value || 0).toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    })
  ), [locale]);

  const formatPercent = useCallback((value, digits = 1) => (
    `${formatNumber(value, digits)}%`
  ), [formatNumber]);

  const formatChannelLabel = useCallback((channel) => {
    if (!channel) return tr('Other', 'Otro');
    if (channel.toLowerCase() === 'booking.com') return 'Booking.com';
    const normalized = channel.replaceAll('_', ' ').toLowerCase();
    const mapped = {
      direct: tr('Direct', 'Directo'),
      website: tr('Website', 'Sitio web'),
      phone: tr('Phone', 'Telefono'),
      'walk in': tr('Walk In', 'Sin reserva'),
    };

    if (mapped[normalized]) {
      return mapped[normalized];
    }

    return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }, [tr]);

  const formatStatusLabel = useCallback((status) => {
    if (!status) return tr('Unknown', 'Desconocido');
    const localized = getStatusLabel(status, tr);
    if (localized === status) {
      return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
    return localized;
  }, [tr]);

  const quickRanges = useMemo(() => ([
    {
      key: 'mtd',
      label: tr('Month To Date', 'Mes hasta hoy'),
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
      label: tr('Current Month', 'Mes actual'),
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
      label: tr('Last 30 Days', 'Ultimos 30 dias'),
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
      label: tr('Last 90 Days', 'Ultimos 90 dias'),
      range: () => {
        const today = new Date();
        return {
          from: format(subDays(today, 89), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        };
      },
    }
  ]), [tr]);

  const applyQuickRange = useCallback((rangeKey) => {
    const selected = quickRanges.find((preset) => preset.key === rangeKey);
    if (!selected) return;

    const { from, to } = selected.range();
    setDateFrom(from);
    setDateTo(to);
    setActivePreset(rangeKey);
  }, [quickRanges]);

  const defaultComparisonRange = useMemo(() => {
    const parsedFrom = parseISO(dateFrom);
    const parsedTo = parseISO(dateTo);
    if (!isValid(parsedFrom) || !isValid(parsedTo)) {
      return { from: '', to: '' };
    }

    return {
      from: format(subYears(parsedFrom, 1), 'yyyy-MM-dd'),
      to: format(subYears(parsedTo, 1), 'yyyy-MM-dd'),
    };
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (comparisonMode !== COMPARISON_MODE_SAME_DATES_LAST_YEAR) {
      return;
    }

    setComparisonFrom(defaultComparisonRange.from);
    setComparisonTo(defaultComparisonRange.to);
  }, [comparisonMode, defaultComparisonRange.from, defaultComparisonRange.to]);

  const sortedNationalities = useMemo(() => (
    [...nationalities].sort((left, right) => {
      const leftLabel = String(left?.name || left?.nationalityCode || '');
      const rightLabel = String(right?.name || right?.nationalityCode || '');
      return leftLabel.localeCompare(rightLabel, locale, { sensitivity: 'base' });
    })
  ), [nationalities, locale]);

  const selectedNationalityLabel = useMemo(() => {
    if (selectedNationalityCode === 'all') {
      return tr('All nationalities', 'Todas las nacionalidades');
    }

    const selectedNationality = sortedNationalities.find((item) => item.nationalityCode === selectedNationalityCode);
    return selectedNationality?.name || selectedNationalityCode;
  }, [selectedNationalityCode, sortedNationalities, tr]);

  const comparisonModeLabel = useMemo(() => {
    const effectiveMode = report?.comparisonMode || comparisonMode;
    if (effectiveMode === COMPARISON_MODE_CUSTOM_RANGE) {
      return tr('Custom range', 'Rango personalizado');
    }
    if (effectiveMode === 'PREVIOUS_EQUAL_DAYS') {
      return tr('Previous period (same length)', 'Periodo anterior (misma duracion)');
    }
    return tr('Same dates last year', 'Mismas fechas del ano pasado');
  }, [report?.comparisonMode, comparisonMode, tr]);

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
      return tr('n/a', 'n/d');
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return tr('n/a', 'n/d');
    }

    const adjusted = reverseDirection ? -numeric : numeric;
    const sign = adjusted > 0 ? '+' : '';
    return `${sign}${adjusted.toFixed(1)}${suffix}`;
  }, [tr]);

  const calculateRelativeChange = useCallback((currentValue, previousValue) => {
    const current = Number(currentValue);
    const previous = Number(previousValue);

    if (!Number.isFinite(current) || !Number.isFinite(previous)) {
      return null;
    }

    if (Math.abs(previous) < 0.00001) {
      return null;
    }

    return ((current - previous) / previous) * 100;
  }, []);

  const metricDefinitions = [
    {
      metric: tr('Average Daily Rate (ADR)', 'Tarifa diaria promedio (ADR)'),
      definition: tr('Total revenue divided by occupied room nights (empty nights excluded).', 'Ingresos totales divididos por noches ocupadas (se excluyen noches vacias).')
    },
    {
      metric: tr('Revenue Per Available Night (RevPAR)', 'Ingreso por noche disponible (RevPAR)'),
      definition: tr('Total revenue divided by all available room nights (empty nights included).', 'Ingresos totales divididos por todas las noches disponibles (incluye noches vacias).')
    },
    {
      metric: tr('Occupancy Percentage', 'Porcentaje de ocupacion'),
      definition: tr('Occupied room nights divided by available room nights for the selected period.', 'Noches ocupadas divididas por noches disponibles para el periodo seleccionado.')
    },
    {
      metric: tr('Cancellation Rate', 'Tasa de cancelacion'),
      definition: tr('Cancelled reservations divided by reservations with check-in dates in the selected period.', 'Reservas canceladas divididas por reservas con fecha de check-in en el periodo seleccionado.')
    }
  ];

  const handleExportAnalytics = useCallback(() => {
    if (!report) return;

    const summary = report.summary || {};
    const previous = report.previousPeriodSummary || {};
    const deltas = report.deltas || {};
    const exportIncludesComparison = !!report.previousPeriodSummary && !!report.deltas;
    const occupancyChangePercentage = calculateRelativeChange(summary.occupancyPercentage, previous.occupancyPercentage);
    const cancellationChangePercentage = calculateRelativeChange(summary.cancellationRate, previous.cancellationRate);

    const summaryRows = [
      { metric: tr('From', 'Desde'), value: report.fromDate },
      { metric: tr('To', 'Hasta'), value: report.toDate },
      { metric: tr('Comparison Enabled', 'Comparacion habilitada'), value: exportIncludesComparison ? tr('Yes', 'Si') : tr('No', 'No') },
      { metric: tr('Comparison From', 'Comparacion desde'), value: exportIncludesComparison ? (report.comparisonFromDate || '') : '' },
      { metric: tr('Comparison To', 'Comparacion hasta'), value: exportIncludesComparison ? (report.comparisonToDate || '') : '' },
      { metric: tr('Comparison Mode', 'Modo de comparacion'), value: exportIncludesComparison ? (report.comparisonMode || '') : tr('DISABLED', 'DESACTIVADO') },
      { metric: tr('Days In Period', 'Dias en el periodo'), value: report.daysInPeriod },
      { metric: tr('Currency', 'Moneda'), value: report.currency || 'EUR' },
      { metric: tr('Nationality Filter', 'Filtro de nacionalidad'), value: selectedNationalityLabel },
      { metric: tr('Total Revenue', 'Ingresos totales'), value: Number(summary.totalRevenue || 0) },
      { metric: tr('Previous Revenue', 'Ingresos del periodo anterior'), value: exportIncludesComparison ? Number(previous.totalRevenue || 0) : '' },
      { metric: tr('Revenue Change %', 'Cambio de ingresos %'), value: exportIncludesComparison ? Number(deltas.revenueChangePercentage || 0) : '' },
      { metric: tr('Occupancy %', 'Ocupacion %'), value: Number(summary.occupancyPercentage || 0) },
      { metric: tr('Occupancy Change %', 'Cambio de ocupacion %'), value: exportIncludesComparison ? Number(occupancyChangePercentage || 0) : '' },
      { metric: 'ADR', value: Number(summary.averageDailyRate || 0) },
      { metric: tr('ADR Change %', 'Cambio ADR %'), value: exportIncludesComparison ? Number(deltas.averageDailyRateChangePercentage || 0) : '' },
      { metric: 'RevPAR', value: Number(summary.revenuePerAvailableNight || 0) },
      { metric: tr('RevPAR Change %', 'Cambio RevPAR %'), value: exportIncludesComparison ? Number(deltas.revParChangePercentage || 0) : '' },
      { metric: tr('Cancellation Rate %', 'Tasa de cancelacion %'), value: Number(summary.cancellationRate || 0) },
      { metric: tr('Cancellation Change %', 'Cambio en cancelaciones %'), value: exportIncludesComparison ? Number(cancellationChangePercentage || 0) : '' },
      { metric: tr('Average Length Of Stay', 'Estancia media'), value: Number(summary.averageLengthOfStay || 0) },
      { metric: tr('Occupied Nights', 'Noches ocupadas'), value: Number(summary.occupiedNights || 0) },
      { metric: tr('Available Nights', 'Noches disponibles'), value: Number(summary.availableNights || 0) },
      { metric: tr('Reservations Overlapping', 'Reservas superpuestas'), value: Number(summary.reservationsOverlappingPeriod || 0) },
      { metric: tr('Reservations Starting', 'Reservas iniciadas'), value: Number(summary.reservationsStartingInPeriod || 0) },
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
      [tr('Summary', 'Resumen')]: summaryRows,
      [tr('DailyTrend', 'TendenciaDiaria')]: dailyRows,
      [tr('Channels', 'Canales')]: channelRows,
      [tr('Statuses', 'Estados')]: statusRows,
      [tr('TopDays', 'MejoresDias')]: topDaysRows,
      [tr('Insights', 'Insights')]: insightRows,
      [tr('Definitions', 'Definiciones')]: definitionRows,
    }, `analytics-report-${dateFrom}_to_${dateTo}.xlsx`);
  }, [report, dateFrom, dateTo, selectedNationalityLabel, formatChannelLabel, formatStatusLabel, calculateRelativeChange, tr]);

  const trendData = useMemo(() => {
    const points = report?.dailyTrend || [];
    return {
      labels: points.map((point) => format(parseISO(point.date), 'dd MMM', { locale: dateLocale })),
      datasets: [
        {
          label: tr('Revenue', 'Ingresos'),
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
          label: tr('Occupancy %', 'Ocupacion %'),
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
  }, [report?.dailyTrend, tr, dateLocale]);

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
              return `${tr('Revenue:', 'Ingresos:')} ${formatCurrency(context.parsed.y, 0)}`;
            }
            return `${tr('Occupancy:', 'Ocupacion:')} ${formatPercent(context.parsed.y, 1)}`;
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
  }), [formatCurrency, formatPercent, tr]);

  const channelData = useMemo(() => {
    const channels = report?.channelPerformance || [];
    return {
      labels: channels.map((channel) => formatChannelLabel(channel.channel)),
      datasets: [
        {
          label: tr('Revenue Share %', 'Cuota de ingresos %'),
          data: channels.map((channel) => Number(channel.revenueSharePercentage || 0)),
          backgroundColor: ['#2563EB', '#F59E0B', '#10B981', '#9333EA', '#64748B', '#EA580C'],
          borderRadius: 6,
        },
      ],
    };
  }, [report?.channelPerformance, formatChannelLabel, tr]);

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
          label: (context) => `${tr('Share:', 'Cuota:')} ${formatPercent(context.parsed.x, 1)}`,
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
  }), [formatPercent, tr]);

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

  const occupancyChangePercentage = useMemo(
    () => calculateRelativeChange(summary.occupancyPercentage, previousSummary.occupancyPercentage),
    [summary.occupancyPercentage, previousSummary.occupancyPercentage, calculateRelativeChange]
  );

  const cancellationChangePercentage = useMemo(
    () => calculateRelativeChange(summary.cancellationRate, previousSummary.cancellationRate),
    [summary.cancellationRate, previousSummary.cancellationRate, calculateRelativeChange]
  );

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
      return `${format(parseISO(from), 'dd MMM yyyy', { locale: dateLocale })} - ${format(parseISO(to), 'dd MMM yyyy', { locale: dateLocale })}`;
    } catch {
      return `${from} - ${to}`;
    }
  }, [report?.fromDate, report?.toDate, dateFrom, dateTo, dateLocale]);

  const previousPeriodLabel = useMemo(() => {
    const formatRangeLabel = (from, to) => {
      const parsedFrom = parseISO(from);
      const parsedTo = parseISO(to);
      if (!isValid(parsedFrom) || !isValid(parsedTo)) {
        return `${from} - ${to}`;
      }

      return `${format(parsedFrom, 'dd MMM yyyy', { locale: dateLocale })} - ${format(parsedTo, 'dd MMM yyyy', { locale: dateLocale })}`;
    };

    if (report?.comparisonFromDate && report?.comparisonToDate) {
      return formatRangeLabel(report.comparisonFromDate, report.comparisonToDate);
    }

    if (comparisonMode === COMPARISON_MODE_CUSTOM_RANGE) {
      if (!comparisonFrom || !comparisonTo) {
        return tr('Comparison unavailable', 'Comparacion no disponible');
      }
      return formatRangeLabel(comparisonFrom, comparisonTo);
    }

    if (comparisonMode === COMPARISON_MODE_SAME_DATES_LAST_YEAR) {
      if (!defaultComparisonRange.from || !defaultComparisonRange.to) {
        return tr('Comparison unavailable', 'Comparacion no disponible');
      }
      return formatRangeLabel(defaultComparisonRange.from, defaultComparisonRange.to);
    }

    const currentStart = report?.fromDate || dateFrom;
    const days = Number(report?.daysInPeriod || selectedRangeDays || 0);
    if (!currentStart || days <= 0) {
      return tr('Comparison unavailable', 'Comparacion no disponible');
    }

    try {
      const currentStartDate = parseISO(currentStart);
      const previousTo = subDays(currentStartDate, 1);
      const previousFrom = subDays(previousTo, days - 1);
      return `${format(previousFrom, 'dd MMM yyyy', { locale: dateLocale })} - ${format(previousTo, 'dd MMM yyyy', { locale: dateLocale })}`;
    } catch {
      return tr('Comparison unavailable', 'Comparacion no disponible');
    }
  }, [
    report?.comparisonFromDate,
    report?.comparisonToDate,
    report?.fromDate,
    report?.daysInPeriod,
    comparisonMode,
    comparisonFrom,
    comparisonTo,
    defaultComparisonRange.from,
    defaultComparisonRange.to,
    dateFrom,
    selectedRangeDays,
    dateLocale,
    tr,
  ]);

  const selectedLengthLabel = useMemo(
    () => `${Number(report?.daysInPeriod || selectedRangeDays || 0)} ${tr('days', 'dias')}`,
    [report?.daysInPeriod, selectedRangeDays, tr]
  );

  const kpiCards = useMemo(() => ([
    {
      title: tr('Total Revenue', 'Ingresos totales'),
      value: formatCurrency(summary.totalRevenue, 0),
      secondary: hasComparisonData
        ? `${tr('Comparison:', 'Comparacion:')} ${formatCurrency(previousSummary.totalRevenue, 0)}`
        : tr('Comparison unavailable', 'Comparacion no disponible'),
      delta: hasComparisonData ? formatDelta(deltas.revenueChangePercentage) : tr('n/a', 'n/d'),
      deltaClassName: hasComparisonData ? deltaClass(deltas.revenueChangePercentage) : 'neutral',
      icon: Euro,
      tone: 'revenue',
    },
    {
      title: tr('Occupancy', 'Ocupacion'),
      value: formatPercent(summary.occupancyPercentage),
      secondary: hasComparisonData
        ? `${tr('Comparison:', 'Comparacion:')} ${formatPercent(previousSummary.occupancyPercentage)}`
        : `${formatNumber(summary.occupiedNights)} ${tr('of', 'de')} ${formatNumber(summary.availableNights)} ${tr('nights', 'noches')}`,
      delta: hasComparisonData ? formatDelta(occupancyChangePercentage) : tr('n/a', 'n/d'),
      deltaClassName: hasComparisonData ? deltaClass(occupancyChangePercentage) : 'neutral',
      icon: Percent,
      tone: 'occupancy',
    },
    {
      title: 'ADR',
      value: formatCurrency(summary.averageDailyRate, 2),
      secondary: hasComparisonData
        ? `${tr('Comparison:', 'Comparacion:')} ${formatCurrency(previousSummary.averageDailyRate, 2)}`
        : tr('Average daily rate on occupied nights', 'Tarifa diaria promedio en noches ocupadas'),
      delta: hasComparisonData ? formatDelta(deltas.averageDailyRateChangePercentage) : tr('n/a', 'n/d'),
      deltaClassName: hasComparisonData ? deltaClass(deltas.averageDailyRateChangePercentage) : 'neutral',
      icon: TrendingUp,
      tone: 'adr',
    },
    {
      title: 'RevPAR',
      value: formatCurrency(summary.revenuePerAvailableNight, 2),
      secondary: hasComparisonData
        ? `${tr('Comparison:', 'Comparacion:')} ${formatCurrency(previousSummary.revenuePerAvailableNight, 2)}`
        : tr('Revenue per available room night', 'Ingreso por noche disponible'),
      delta: hasComparisonData ? formatDelta(deltas.revParChangePercentage) : tr('n/a', 'n/d'),
      deltaClassName: hasComparisonData ? deltaClass(deltas.revParChangePercentage) : 'neutral',
      icon: Activity,
      tone: 'revpar',
    },
    {
      title: tr('Cancellation Rate', 'Tasa de cancelacion'),
      value: formatPercent(summary.cancellationRate),
      secondary: hasComparisonData
        ? `${tr('Comparison:', 'Comparacion:')} ${formatPercent(previousSummary.cancellationRate)}`
        : `${formatNumber(summary.cancelledReservations)} ${tr('cancelled bookings', 'reservas canceladas')}`,
      delta: hasComparisonData ? formatDelta(cancellationChangePercentage, '%', true) : tr('n/a', 'n/d'),
      deltaClassName: hasComparisonData
        ? deltaClass(-(Number(cancellationChangePercentage || 0)))
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
    occupancyChangePercentage,
    cancellationChangePercentage,
    tr,
  ]);

  const hasChartData = (report?.dailyTrend || []).length > 0;
  const hasChannelData = (report?.channelPerformance || []).length > 0;
  const hasStatusData = (report?.reservationStatusBreakdown || []).length > 0;

  useEffect(() => {
    let isMounted = true;

    fetchNationalities()
      .then((items) => {
        if (!isMounted) return;
        setNationalities(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setNationalities([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadReport() {
      if (!isCompleteDateValue(dateFrom) || !isCompleteDateValue(dateTo)) {
        setLoading(false);
        setError(null);
        return;
      }

      if (
        comparisonMode === COMPARISON_MODE_CUSTOM_RANGE
        && (!isCompleteDateValue(comparisonFrom) || !isCompleteDateValue(comparisonTo))
      ) {
        setLoading(false);
        setError(null);
        return;
      }

      const from = parseISO(dateFrom);
      const to = parseISO(dateTo);

      if (!isValid(from) || !isValid(to)) {
        setError(tr('Invalid date format.', 'Formato de fecha invalido.'));
        setLoading(false);
        return;
      }

      if (isAfter(from, to)) {
        setError(tr('From date must be before or equal to To date.', 'La fecha Desde debe ser anterior o igual a la fecha Hasta.'));
        setLoading(false);
        return;
      }

      const analyticsOptions = {
        compare: true,
        comparisonMode,
        nationalityCode: selectedNationalityCode !== 'all' ? selectedNationalityCode : null,
      };

      if (comparisonMode === COMPARISON_MODE_CUSTOM_RANGE) {
        const customFrom = parseISO(comparisonFrom);
        const customTo = parseISO(comparisonTo);

        if (!isValid(customFrom) || !isValid(customTo)) {
          setError(tr('Invalid comparison date format.', 'Formato de fecha de comparacion invalido.'));
          setLoading(false);
          return;
        }

        if (isAfter(customFrom, customTo)) {
          setError(tr('Comparison From date must be before or equal to Comparison To date.', 'La fecha Desde de comparacion debe ser anterior o igual a la fecha Hasta.'));
          setLoading(false);
          return;
        }

        analyticsOptions.comparisonFrom = comparisonFrom;
        analyticsOptions.comparisonTo = comparisonTo;
      }

      setLoading(true);
      setError(null);

      try {
        const analyticsReport = await fetchAnalyticsReport(dateFrom, dateTo, analyticsOptions);
        if (isCancelled) {
          return;
        }
        setReport(analyticsReport);
      } catch (requestError) {
        if (isCancelled) {
          return;
        }
        setError(requestError?.message || tr('Failed to fetch analytics report.', 'No se pudo obtener el informe de analitica.'));
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      isCancelled = true;
    };
  }, [dateFrom, dateTo, comparisonMode, comparisonFrom, comparisonTo, selectedNationalityCode, tr]);

  if (loading && !report) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">{tr('Building analytics dashboard...', 'Construyendo panel de analitica...')}</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="card">
        <div className="error-message">
          <strong>{tr('Analytics Report Error:', 'Error del informe de analitica:')}</strong> {error}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>{tr('No analytics report available for the selected period.', 'No hay informe de analitica disponible para el periodo seleccionado.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <section className="card analytics-hero">
        <div className="analytics-hero-top">
          <div className="analytics-hero-copy">
            <h2 className="analytics-hero-title">
              <BarChart3 size={28} />
              {tr('Analytics Hub', 'Centro de analitica')}
            </h2>
            <p className="analytics-hero-subtitle">
              {tr('Revenue and operations in one view, with a selectable comparison baseline and nationality slicing.', 'Ingresos y operaciones en una sola vista, con una base de comparacion seleccionable y filtro por nacionalidad.')}
            </p>
          </div>

          <div className="analytics-hero-actions">
            {loading && report ? (
              <small className="text-muted">{tr('Updating analytics...', 'Actualizando analitica...')}</small>
            ) : null}
            <button className="btn btn-accent" onClick={handleExportAnalytics}>
              <Download size={16} />
              {tr('Export Analytics Report', 'Exportar informe de analitica')}
            </button>
          </div>
        </div>

        <div className="analytics-control-grid">
          <div className="analytics-control-left">
            <div className="analytics-date-cluster">
              <div>
                <label className="form-label">{tr('From', 'Desde')}</label>
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
                <label className="form-label">{tr('To', 'Hasta')}</label>
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
            </div>

            <div className="analytics-presets">
              <span className="analytics-presets-label">{tr('Quick Range', 'Rango rapido')}</span>
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
            </div>

            <div className="analytics-presets">
              <span className="analytics-presets-label">{tr('Comparison & Filters', 'Comparacion y filtros')}</span>
              <div className="analytics-date-cluster">
                <div>
                  <label className="form-label">{tr('Comparison Mode', 'Modo de comparacion')}</label>
                  <select
                    className="form-select analytics-date-input"
                    value={comparisonMode}
                    onChange={(event) => {
                      const nextMode = event.target.value;
                      setComparisonMode(nextMode);

                      if (
                        nextMode === COMPARISON_MODE_CUSTOM_RANGE
                        && (!comparisonFrom || !comparisonTo)
                      ) {
                        setComparisonFrom(defaultComparisonRange.from);
                        setComparisonTo(defaultComparisonRange.to);
                      }
                    }}
                  >
                    <option value={COMPARISON_MODE_SAME_DATES_LAST_YEAR}>{tr('Same dates last year', 'Mismas fechas del ano pasado')}</option>
                    <option value={COMPARISON_MODE_CUSTOM_RANGE}>{tr('Custom date range', 'Rango de fechas personalizado')}</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">{tr('Nationality', 'Nacionalidad')}</label>
                  <select
                    className="form-select analytics-date-input"
                    value={selectedNationalityCode}
                    onChange={(event) => setSelectedNationalityCode(event.target.value)}
                  >
                    <option value="all">{tr('All nationalities', 'Todas las nacionalidades')}</option>
                    {sortedNationalities.map((nat) => (
                      <option key={nat.nationalityCode} value={nat.nationalityCode}>
                        {nat.name || nat.nationalityCode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {comparisonMode === COMPARISON_MODE_CUSTOM_RANGE && (
                <div className="analytics-date-cluster">
                  <div>
                    <label className="form-label">{tr('Comparison From', 'Comparacion desde')}</label>
                    <input
                      type="date"
                      className="form-input analytics-date-input"
                      value={comparisonFrom}
                      onChange={(event) => setComparisonFrom(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="form-label">{tr('Comparison To', 'Comparacion hasta')}</label>
                    <input
                      type="date"
                      className="form-input analytics-date-input"
                      value={comparisonTo}
                      onChange={(event) => setComparisonTo(event.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="analytics-period-inline">
            <span className="analytics-strip-label">{tr('Selected Period', 'Periodo seleccionado')}</span>
            <strong>{periodLabel || `${dateFrom} - ${dateTo}`}</strong>
            <small className="analytics-strip-subtle">{selectedLengthLabel}</small>
            <small className="analytics-strip-subtle">{tr('Comparison mode:', 'Modo de comparacion:')} {comparisonModeLabel}</small>
            <small className="analytics-strip-subtle">{tr('Compared with', 'Comparado con')} {previousPeriodLabel}</small>
            <small className="analytics-strip-subtle">{tr('Nationality filter:', 'Filtro de nacionalidad:')} {selectedNationalityLabel}</small>

            <small className="analytics-presets-hint">
              {tr('Statistics are compared with the selected baseline. Default baseline uses the same dates from last year.', 'Las estadisticas se comparan con la base seleccionada. Por defecto se usan las mismas fechas del ano pasado.')}
              <br />
              {tr('Switch to custom range to choose exact comparison dates.', 'Cambia a rango personalizado para elegir fechas de comparacion exactas.')}
            </small>
          </div>
        </div>
      </section>

      {error && report ? (
        <section className="card">
          <div className="error-message">
            <strong>{tr('Analytics Report Error:', 'Error del informe de analitica:')}</strong> {error}
          </div>
        </section>
      ) : null}

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
                <span className="analytics-delta neutral">{tr('Comparison unavailable', 'Comparacion no disponible')}</span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="analytics-main-grid">
        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>{tr('Revenue & Occupancy Trajectory', 'Trayectoria de ingresos y ocupacion')}</h3>
            <span>{tr('Daily pattern across the selected period', 'Patron diario durante el periodo seleccionado')}</span>
          </div>
          <div className="analytics-chart-area">
            {hasChartData ? (
              <Line data={trendData} options={trendOptions} />
            ) : (
              <div className="empty-state compact-empty">
                <p>{tr('No daily trend data available for this period.', 'No hay datos de tendencia diaria para este periodo.')}</p>
              </div>
            )}
          </div>
        </article>

        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>{tr('Channel Revenue Concentration', 'Concentracion de ingresos por canal')}</h3>
            <span>{tr('Share of total period revenue by acquisition source', 'Cuota del ingreso total por fuente de adquisicion')}</span>
          </div>
          <div className="analytics-chart-area analytics-chart-area-sm">
            {hasChannelData ? (
              <Bar data={channelData} options={channelOptions} />
            ) : (
              <div className="empty-state compact-empty">
                <p>{tr('No channel mix data available for this period.', 'No hay datos de mezcla de canales para este periodo.')}</p>
              </div>
            )}
          </div>

          {hasChannelData && (
            <div className="analytics-mini-table-wrap">
              <table className="analytics-mini-table">
                <thead>
                  <tr>
                    <th>{tr('Channel', 'Canal')}</th>
                    <th>{tr('Revenue', 'Ingresos')}</th>
                    <th>{tr('Share', 'Cuota')}</th>
                    <th>{tr('ABV', 'VPR')}</th>
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
            <h3>{tr('Strategic Insights', 'Insights estrategicos')}</h3>
            <span>{tr('Auto-generated summary for revenue management and operations', 'Resumen autogenerado para revenue management y operaciones')}</span>
          </div>
          {(report.insights || []).length > 0 ? (
            <ul className="analytics-insight-list">
              {(report.insights || []).map((insight, index) => (
                <li key={`${insight}-${index}`}>{insight}</li>
              ))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">
              <p>{tr('No strategic insights available for this period.', 'No hay insights estrategicos para este periodo.')}</p>
            </div>
          )}
        </article>

        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>{tr('Top Revenue Days', 'Dias de mayor ingreso')}</h3>
            <span>{tr('Best performing days with contextual annotation', 'Dias con mejor rendimiento y anotacion contextual')}</span>
          </div>
          {(report.topRevenueDays || []).length > 0 ? (
            <div className="analytics-mini-table-wrap">
              <table className="analytics-mini-table">
                <thead>
                  <tr>
                    <th>{tr('Date', 'Fecha')}</th>
                    <th>{tr('Revenue', 'Ingresos')}</th>
                    <th>{tr('Occupancy', 'Ocupacion')}</th>
                    <th>{tr('Note', 'Nota')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.topRevenueDays || []).map((day) => (
                    <tr key={day.date}>
                      <td>{format(parseISO(day.date), 'dd MMM yyyy', { locale: dateLocale })}</td>
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
              <p>{tr('No highlighted days available for this period.', 'No hay dias destacados para este periodo.')}</p>
            </div>
          )}
        </article>
      </section>

      <section className="analytics-secondary-grid">
        <article className="card analytics-panel">
          <div className="analytics-panel-head">
            <h3>{tr('Reservation Status Mix', 'Mezcla de estados de reserva')}</h3>
            <span>{tr('Distribution of reservations starting in this period', 'Distribucion de reservas que inician en este periodo')}</span>
          </div>
          <div className="analytics-status-grid">
            <div className="analytics-donut-area">
              {hasStatusData ? (
                <Doughnut data={statusData} options={statusOptions} />
              ) : (
                <div className="empty-state compact-empty">
                  <p>{tr('No status distribution data available.', 'No hay datos de distribucion por estado.')}</p>
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
            <h3>{tr('Metric Guide', 'Guia de metricas')}</h3>
            <span>{tr('Definitions used in this dashboard', 'Definiciones usadas en este panel')}</span>
          </div>
          {metricDefinitions.length > 0 ? (
            <dl className="analytics-definition-list">
              {metricDefinitions.map((item) => (
                <div key={item.metric}>
                  <dt>{item.metric}</dt>
                  <dd>{item.definition}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="empty-state compact-empty">
              <p>{tr('No metric definitions available.', 'No hay definiciones de metricas disponibles.')}</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
