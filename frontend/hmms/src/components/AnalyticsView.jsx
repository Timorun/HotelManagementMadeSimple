import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { BarChart3, Download, Lightbulb } from 'lucide-react';
import { fetchAnalyticsOutlook, fetchAnalyticsOverview } from '../api/backend';
import { useI18n } from '../context/I18nContext';
import { isIsoDate, useSessionState } from '../hooks/useSessionState';
import { buildInsights } from '../utils/analyticsInsights';
import { DEFAULT_PRESET, PERIOD_PRESETS, presetLabel, presetRange } from '../utils/analyticsPeriods';
import { formatChannel } from '../utils/channels';
import { exportSheetsToExcel } from '../utils/excelExport';
import { formatEuro } from '../utils/money';
import ChannelSection from './analytics/ChannelSection';
import KpiTile from './analytics/KpiTile';
import OutlookSection from './analytics/OutlookSection';
import SeasonSection from './analytics/SeasonSection';

const CUSTOM = 'custom';
const isPreset = (value) => value === CUSTOM || PERIOD_PRESETS.includes(value);
const isIsoDateOrEmpty = (value) => value === '' || isIsoDate(value);
const change = (now, before) => (Number(before) > 0 ? ((Number(now) - Number(before)) * 100) / Number(before) : undefined);

/**
 * Analytics: how a period went compared with the same dates last year (direct bookings against
 * platforms and their commission, busy and quiet months and weekdays), and what is booked from
 * today on.
 */
export default function AnalyticsView() {
  const { tr, dateLocale, locale } = useI18n();
  const [preset, setPreset] = useSessionState('analytics.preset', DEFAULT_PRESET, isPreset);
  const [customFrom, setCustomFrom] = useSessionState('analytics.from', '', isIsoDateOrEmpty);
  const [customTo, setCustomTo] = useSessionState('analytics.to', '', isIsoDateOrEmpty);
  const [overview, setOverview] = useState(null);
  const [outlook, setOutlook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const range = useMemo(
    () => (preset === CUSTOM ? { from: customFrom, to: customTo } : presetRange(preset)),
    [preset, customFrom, customTo],
  );
  const rangeReady = isValid(parseISO(range.from)) && isValid(parseISO(range.to)) && range.from <= range.to;

  useEffect(() => {
    if (!rangeReady) {
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    fetchAnalyticsOverview(range.from, range.to)
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
          setError(null);
        }
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, rangeReady]);

  useEffect(() => {
    fetchAnalyticsOutlook().then(setOutlook).catch((err) => setError(err.message));
  }, []);

  const money = useCallback((value) => formatEuro(value, locale, { decimals: 0 }), [locale]);
  const formatDate = useCallback((value) => format(parseISO(value), 'd MMM yyyy', { locale: dateLocale }), [dateLocale]);
  const periodLabel = overview ? `${formatDate(overview.from)} – ${formatDate(overview.to)}` : '';
  const compareLabel = overview ? `${formatDate(overview.compareFrom)} – ${formatDate(overview.compareTo)}` : '';

  const insights = useMemo(() => buildInsights(overview, outlook, {
    tr,
    money,
    weekdayName: (day) => format(parseISO(`2024-01-0${day}`), 'EEEE', { locale: dateLocale }),
    monthName: (month) => format(parseISO(`${month}-01`), 'LLLL', { locale: dateLocale }),
    today,
  }), [overview, outlook, tr, money, dateLocale, today]);

  const exportExcel = () => {
    const { current, previous } = overview;
    const summaryRow = (label, key, render = (value) => value) => ({
      [tr('Measure', 'Medida')]: label,
      [periodLabel]: render(current[key]),
      [compareLabel]: render(previous[key]),
    });
    exportSheetsToExcel({
      [tr('Summary', 'Resumen')]: [
        summaryRow(tr('Revenue (€)', 'Ingresos (€)'), 'revenue', Number),
        summaryRow(tr('Commission (€)', 'Comisión (€)'), 'commission', Number),
        summaryRow(tr('Revenue after commission (€)', 'Ingresos tras comisión (€)'), 'revenueAfterCommission', Number),
        summaryRow(tr('Occupancy (%)', 'Ocupación (%)'), 'occupancy'),
        summaryRow(tr('Nights sold', 'Noches vendidas'), 'nightsSold'),
        summaryRow(tr('Nights available', 'Noches disponibles'), 'nightsAvailable'),
        summaryRow(tr('Average price per night (€)', 'Precio medio por noche (€)'), 'averageNightlyRate', Number),
        summaryRow(tr('Bookings', 'Reservas'), 'bookings'),
        summaryRow(tr('Direct nights', 'Noches directas'), 'directNights'),
        summaryRow(tr('Platform nights', 'Noches por plataforma'), 'platformNights'),
      ],
      [tr('Channels', 'Canales')]: overview.channels.map((row) => ({
        [tr('Channel', 'Canal')]: formatChannel(row.channel, tr),
        [tr('Bookings', 'Reservas')]: row.bookings,
        [tr('Nights', 'Noches')]: row.nights,
        [tr('Revenue (€)', 'Ingresos (€)')]: Number(row.revenue),
        [tr('Commission (€)', 'Comisión (€)')]: Number(row.commission),
        [tr('Nights last year', 'Noches año pasado')]: row.previousNights,
        [tr('Revenue last year (€)', 'Ingresos año pasado (€)')]: Number(row.previousRevenue),
      })),
      [tr('Months', 'Meses')]: overview.months.map((row) => ({
        [tr('Month', 'Mes')]: row.month,
        [tr('Nights sold', 'Noches vendidas')]: row.nightsSold,
        [tr('Nights available', 'Noches disponibles')]: row.nightsAvailable,
        [tr('Direct nights', 'Noches directas')]: row.directNights,
        [tr('Revenue (€)', 'Ingresos (€)')]: Number(row.revenue),
        [tr('Nights sold last year', 'Noches vendidas año pasado')]: row.previousNightsSold,
        [tr('Revenue last year (€)', 'Ingresos año pasado (€)')]: Number(row.previousRevenue),
      })),
      [tr('Weekdays', 'Días de la semana')]: overview.weekdays.map((row) => ({
        [tr('Night', 'Noche')]: format(parseISO(`2024-01-0${row.weekday}`), 'EEEE', { locale: dateLocale }),
        [tr('Nights sold', 'Noches vendidas')]: row.nightsSold,
        [tr('Direct nights', 'Noches directas')]: row.directNights,
        [tr('Nights available', 'Noches disponibles')]: row.nightsAvailable,
        [tr('Nights sold last year', 'Noches vendidas año pasado')]: row.previousNightsSold,
      })),
    }, `analytics-${overview.from}-${overview.to}.xlsx`);
  };

  const kpis = overview && (() => {
    const { current, previous } = overview;
    const vsLastYear = (value) => (value === undefined
      ? undefined
      : `${value > 0 ? '+' : ''}${Math.round(value)}% ${tr('vs last year', 'vs año pasado')}`);
    const occupancyPoints = previous.nightsSold > 0 ? current.occupancy - previous.occupancy : undefined;
    return [
      {
        label: tr('Revenue', 'Ingresos'),
        value: money(current.revenue),
        change: change(current.revenue, previous.revenue),
        note: tr(`${current.bookings} bookings`, `${current.bookings} reservas`),
      },
      {
        label: tr('Commission paid', 'Comisión pagada'),
        value: money(current.commission),
        change: change(current.commission, previous.commission),
        upIsGood: false,
        note: Number(current.platformRevenue) > 0
          ? tr(`${Math.round((current.commission * 100) / current.platformRevenue)}% of platform revenue`, `${Math.round((current.commission * 100) / current.platformRevenue)}% de los ingresos por plataformas`)
          : tr('No platform bookings', 'Sin reservas por plataformas'),
      },
      {
        label: tr('Revenue after commission', 'Ingresos tras comisión'),
        value: money(current.revenueAfterCommission),
        change: change(current.revenueAfterCommission, previous.revenueAfterCommission),
      },
      {
        label: tr('Occupancy', 'Ocupación'),
        value: `${Math.round(current.occupancy)}%`,
        change: occupancyPoints,
        changeLabel: occupancyPoints === undefined
          ? undefined
          : `${occupancyPoints > 0 ? '+' : ''}${Math.round(occupancyPoints)} ${tr('points vs last year', 'puntos vs año pasado')}`,
        note: tr(`${current.nightsSold} of ${current.nightsAvailable} nights`, `${current.nightsSold} de ${current.nightsAvailable} noches`),
      },
      {
        label: tr('Average price per night', 'Precio medio por noche'),
        value: money(current.averageNightlyRate),
        change: change(current.averageNightlyRate, previous.averageNightlyRate),
      },
    ].map((kpi) => ({ ...kpi, changeLabel: kpi.changeLabel ?? vsLastYear(kpi.change) }));
  })();

  return (
    <div className="analytics-page">
      <div className="card">
        <div className="card-header">
          <h2><BarChart3 size={28} /> {tr('Analytics', 'Analítica')}</h2>
        </div>
        <div className="analytics-filters">
          <div className="segmented segmented-wrap" role="group" aria-label={tr('Period', 'Periodo')}>
            {PERIOD_PRESETS.map((value) => (
              <button key={value} type="button" className={preset === value ? 'on' : ''} aria-pressed={preset === value} onClick={() => setPreset(value)}>
                {presetLabel(value, tr)}
              </button>
            ))}
            <button
              type="button"
              className={preset === CUSTOM ? 'on' : ''}
              aria-pressed={preset === CUSTOM}
              onClick={() => {
                if (!customFrom || !customTo) {
                  setCustomFrom(range.from);
                  setCustomTo(range.to);
                }
                setPreset(CUSTOM);
              }}
            >
              {tr('Other dates', 'Otras fechas')}
            </button>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={exportExcel} disabled={!overview}>
            <Download size={16} /> {tr('Excel', 'Excel')}
          </button>
        </div>
        {preset === CUSTOM && (
          <div className="analytics-custom-range">
            <label className="form-group">
              <span className="form-label">{tr('From', 'Desde')}</span>
              <input type="date" className="form-input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </label>
            <label className="form-group">
              <span className="form-label">{tr('To (including)', 'Hasta (incluido)')}</span>
              <input type="date" className="form-input" min={customFrom} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </label>
          </div>
        )}
        {overview && (
          <p className="analytics-period">
            {tr(`${periodLabel}, compared with ${compareLabel}.`, `${periodLabel}, comparado con ${compareLabel}.`)}
            {overview.to > today && ` ${tr('Nights after today: what is booked so far.', 'Noches después de hoy: lo reservado hasta ahora.')}`}
          </p>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {!overview && loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="mt-2">{tr('Loading analytics...', 'Cargando analítica...')}</p>
        </div>
      )}

      {overview && (
        <div className={`analytics-content ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
          <div className="kpi-row">
            {kpis.map((kpi) => <KpiTile key={kpi.label} {...kpi} />)}
          </div>

          {insights.length > 0 && (
            <section className="card analytics-section">
              <h3 className="section-title"><Lightbulb size={18} /> {tr('In short', 'En resumen')}</h3>
              <ul className="analytics-insights">
                {insights.map((insight) => <li key={insight}>{insight}</li>)}
              </ul>
            </section>
          )}

          <ChannelSection
            overview={overview}
            tr={tr}
            money={money}
            periodLabel={tr('This period', 'Este periodo')}
            compareLabel={tr('Last year', 'Año pasado')}
          />
          <SeasonSection
            overview={overview}
            tr={tr}
            dateLocale={dateLocale}
            money={money}
            today={today}
            compareLabel={tr('Last year', 'Año pasado')}
          />
          {outlook && <OutlookSection outlook={outlook} tr={tr} dateLocale={dateLocale} locale={locale} money={money} />}
        </div>
      )}
    </div>
  );
}
