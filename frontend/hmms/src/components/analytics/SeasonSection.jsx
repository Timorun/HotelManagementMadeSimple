import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { addDays, format, parseISO } from 'date-fns';
import { CalendarRange } from 'lucide-react';
import { COLORS, barSeries, columnOptions } from './chartTheme';

const pct = (part, whole) => (whole > 0 ? (part * 100) / whole : 0);
const percent = (value) => `${Math.round(value)}%`;
const fade = (hex) => `${hex}73`; // ~45% opacity: booked so far, not final
const isFutureMonth = (month, today) => `${month}-01` > today;
const MONDAY = parseISO('2024-01-01');

function Legend({ items }) {
  return (
    <div className="chart-legend">
      {items.map((item) => (
        <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>
      ))}
    </div>
  );
}

/**
 * When the suites are full or empty: month by month for the year (against the year before),
 * and by night of the week for the selected period. Bars stack direct and platform nights,
 * with last year as a grey bar beside them.
 */
export default function SeasonSection({ overview, tr, dateLocale, money, today, compareLabel }) {
  const [measure, setMeasure] = useState('occupancy');
  const { months, weekdays, year } = overview;
  const isFuture = (month) => isFutureMonth(month, today);
  const anyFuture = months.some((row) => isFuture(row.month));

  const monthChart = useMemo(() => {
    const occupancy = measure === 'occupancy';
    const directValues = months.map((row) => (occupancy
      ? pct(row.directNights, row.nightsAvailable)
      : Number(row.directRevenue)));
    const platformValues = months.map((row) => (occupancy
      ? pct(row.nightsSold - row.directNights, row.nightsAvailable)
      : Number(row.revenue) - Number(row.directRevenue)));
    const previousValues = months.map((row) => (occupancy
      ? pct(row.previousNightsSold, row.previousNightsAvailable)
      : Number(row.previousRevenue)));
    const colorsFor = (color) => months.map((row) => (isFutureMonth(row.month, today) ? fade(color) : color));
    return {
      data: {
        labels: months.map((row) => format(parseISO(`${row.month}-01`), 'LLL', { locale: dateLocale })),
        datasets: [
          {
            ...barSeries(tr('Direct', 'Directo'), directValues, colorsFor(COLORS.direct)),
            hoverBackgroundColor: colorsFor(COLORS.direct),
            stack: 'current',
            // Rounded end only when nothing is stacked on top; a white strip separates the two
            borderRadius: (ctx) => (platformValues[ctx.dataIndex] > 0 ? 0 : 4),
            borderWidth: (ctx) => (platformValues[ctx.dataIndex] > 0 ? { top: 2, right: 0, bottom: 0, left: 0 } : 0),
            borderColor: '#ffffff',
          },
          {
            ...barSeries(tr('Platforms', 'Plataformas'), platformValues, colorsFor(COLORS.platform)),
            hoverBackgroundColor: colorsFor(COLORS.platform),
            stack: 'current',
          },
          { ...barSeries(String(year - 1), previousValues, COLORS.lastYear), stack: 'previous' },
        ],
      },
      options: columnOptions(occupancy ? percent : money, {
        max: occupancy ? 100 : undefined,
        tooltipTitle: (index) => format(parseISO(`${months[index].month}-01`), 'LLLL yyyy', { locale: dateLocale }),
        tooltipNote: (datasetIndex, index) => (datasetIndex < 2 && isFutureMonth(months[index].month, today)
          ? tr('booked so far', 'reservado hasta ahora')
          : ''),
      }),
    };
  }, [measure, months, year, dateLocale, tr, money, today]);

  const weekdayChart = useMemo(() => {
    const monday = MONDAY;
    return {
      data: {
        labels: weekdays.map((row) => format(addDays(monday, row.weekday - 1), 'EEE', { locale: dateLocale })),
        datasets: [
          {
            ...barSeries(tr('Direct', 'Directo'), weekdays.map((row) => pct(row.directNights, row.nightsAvailable)), COLORS.direct),
            stack: 'current',
            borderRadius: (ctx) => (weekdays[ctx.dataIndex].nightsSold > weekdays[ctx.dataIndex].directNights ? 0 : 4),
            borderWidth: (ctx) => (weekdays[ctx.dataIndex].nightsSold > weekdays[ctx.dataIndex].directNights
              ? { top: 2, right: 0, bottom: 0, left: 0 } : 0),
            borderColor: '#ffffff',
          },
          {
            ...barSeries(tr('Platforms', 'Plataformas'), weekdays.map((row) => pct(row.nightsSold - row.directNights, row.nightsAvailable)), COLORS.platform),
            stack: 'current',
          },
          {
            ...barSeries(compareLabel, weekdays.map((row) => pct(row.previousNightsSold, row.previousNightsAvailable)), COLORS.lastYear),
            stack: 'previous',
          },
        ],
      },
      options: columnOptions(percent, {
        max: 100,
        tooltipTitle: (index) => format(addDays(monday, weekdays[index].weekday - 1), 'EEEE', { locale: dateLocale }),
      }),
    };
  }, [weekdays, dateLocale, tr, compareLabel]);

  return (
    <section className="card analytics-section">
      <h3 className="section-title"><CalendarRange size={18} /> {tr('When you are full or empty', 'Cuándo estás lleno o vacío')}</h3>

      <div className="analytics-subhead">
        <h4>{tr(`Month by month, ${year} against ${year - 1}`, `Mes a mes, ${year} frente a ${year - 1}`)}</h4>
        <div className="segmented" role="group" aria-label={tr('Show', 'Mostrar')}>
          <button type="button" className={measure === 'occupancy' ? 'on' : ''} aria-pressed={measure === 'occupancy'} onClick={() => setMeasure('occupancy')}>
            {tr('Occupancy', 'Ocupación')}
          </button>
          <button type="button" className={measure === 'revenue' ? 'on' : ''} aria-pressed={measure === 'revenue'} onClick={() => setMeasure('revenue')}>
            {tr('Revenue', 'Ingresos')}
          </button>
        </div>
      </div>
      <Legend items={[
        { label: tr('Direct', 'Directo'), color: COLORS.direct },
        { label: tr('Platforms', 'Plataformas'), color: COLORS.platform },
        { label: String(year - 1), color: COLORS.lastYear },
        ...(anyFuture ? [{ label: tr('Faded: booked so far', 'Claro: reservado hasta ahora'), color: fade(COLORS.direct) }] : []),
      ]}
      />
      <div className="analytics-chart">
        <Bar data={monthChart.data} options={monthChart.options} />
      </div>
      <details className="analytics-details">
        <summary>{tr('Show as a table', 'Ver como tabla')}</summary>
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>{tr('Month', 'Mes')}</th>
                <th>{tr('Occupancy', 'Ocupación')}</th>
                <th>{tr('Nights', 'Noches')}</th>
                <th>{tr('Direct nights', 'Noches directas')}</th>
                <th>{tr('Revenue', 'Ingresos')}</th>
                <th>{`${tr('Occupancy', 'Ocupación')} ${year - 1}`}</th>
                <th>{`${tr('Revenue', 'Ingresos')} ${year - 1}`}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((row) => (
                <tr key={row.month}>
                  <th scope="row">{format(parseISO(`${row.month}-01`), 'LLLL', { locale: dateLocale })}{isFuture(row.month) ? ' *' : ''}</th>
                  <td>{percent(pct(row.nightsSold, row.nightsAvailable))}</td>
                  <td>{row.nightsSold}</td>
                  <td>{row.directNights}</td>
                  <td>{money(row.revenue)}</td>
                  <td>{percent(pct(row.previousNightsSold, row.previousNightsAvailable))}</td>
                  <td>{money(row.previousRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {anyFuture && <p className="field-hint">{tr('* Booked so far.', '* Reservado hasta ahora.')}</p>}
      </details>

      <div className="analytics-subhead">
        <h4>{tr('By night of the week, in the selected period', 'Por noche de la semana, en el periodo elegido')}</h4>
      </div>
      <Legend items={[
        { label: tr('Direct', 'Directo'), color: COLORS.direct },
        { label: tr('Platforms', 'Plataformas'), color: COLORS.platform },
        { label: compareLabel, color: COLORS.lastYear },
      ]}
      />
      <div className="analytics-chart analytics-chart-short">
        <Bar data={weekdayChart.data} options={weekdayChart.options} />
      </div>
      <details className="analytics-details">
        <summary>{tr('Show as a table', 'Ver como tabla')}</summary>
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>{tr('Night', 'Noche')}</th>
                <th>{tr('Occupancy', 'Ocupación')}</th>
                <th>{tr('Direct', 'Directo')}</th>
                <th>{tr('Platforms', 'Plataformas')}</th>
                <th>{compareLabel}</th>
              </tr>
            </thead>
            <tbody>
              {weekdays.map((row) => (
                <tr key={row.weekday}>
                  <th scope="row">{format(addDays(MONDAY, row.weekday - 1), 'EEEE', { locale: dateLocale })}</th>
                  <td>{percent(pct(row.nightsSold, row.nightsAvailable))}</td>
                  <td>{row.directNights}</td>
                  <td>{row.nightsSold - row.directNights}</td>
                  <td>{percent(pct(row.previousNightsSold, row.previousNightsAvailable))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
