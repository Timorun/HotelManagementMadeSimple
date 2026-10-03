import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// Colours checked for colour blindness against the white cards (dataviz reference palette).
// Direct and platform keep their colour everywhere on the page; last year is grey context.
export const COLORS = {
  direct: '#2a78d6',
  platform: '#eb6834',
  awaitingPayment: '#4a3aa7',
  lastYear: '#898781',
  bookedSoFar: '#86b6ef',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  ink: '#0b0b0b',
  inkSecondary: '#52514e',
};

/** A bar series: thin bars with a rounded end, square at the baseline. */
export function barSeries(label, data, color) {
  return {
    label,
    data,
    backgroundColor: color,
    hoverBackgroundColor: color,
    borderRadius: 4,
    borderSkipped: 'start',
    maxBarThickness: 24,
    barPercentage: 0.85,
    categoryPercentage: 0.7,
  };
}

/**
 * Options for a column chart on one value axis.
 * @param {(value: number) => string} formatValue - axis ticks and tooltip values
 * @param {{max?: number, tooltipTitle?: (index: number) => string, tooltipNote?: (datasetIndex: number, index: number) => string}} [extra]
 */
export function columnOptions(formatValue, { max, tooltipTitle, tooltipNote } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: 'rgba(11, 11, 11, 0.12)',
        borderWidth: 1,
        titleColor: COLORS.ink,
        bodyColor: COLORS.ink,
        padding: 10,
        boxWidth: 12,
        boxHeight: 3,
        callbacks: {
          ...(tooltipTitle && { title: (items) => tooltipTitle(items[0].dataIndex) }),
          // Value first, series second
          label: (item) => {
            const note = tooltipNote ? tooltipNote(item.datasetIndex, item.dataIndex) : '';
            return ` ${formatValue(item.parsed.y)} · ${item.dataset.label}${note ? ` (${note})` : ''}`;
          },
          labelColor: (item) => {
            const color = Array.isArray(item.dataset.backgroundColor)
              ? item.dataset.backgroundColor[item.dataIndex]
              : item.dataset.backgroundColor;
            return { borderColor: color, backgroundColor: color };
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: COLORS.axis },
        ticks: { color: COLORS.muted, maxRotation: 0, autoSkip: true },
      },
      y: {
        beginAtZero: true,
        ...(max !== undefined && { max }),
        grid: { color: COLORS.grid, lineWidth: 1 },
        border: { display: false },
        ticks: { color: COLORS.muted, maxTicksLimit: 5, callback: (value) => formatValue(value) },
      },
    },
  };
}
