import { Link } from 'react-router-dom';
import { format, isToday, parseISO } from 'date-fns';
import { CalendarClock } from 'lucide-react';
import { formatEuroShort } from '../../utils/money';
import { COLORS } from './chartTheme';

const NIGHT_STATES = ['direct', 'platform', 'awaiting_payment', 'pending'];

function WindowTile({ window, label, tr, money }) {
  const booked = window.nightsAvailable > 0 ? Math.round((window.nightsBooked * 100) / window.nightsAvailable) : 0;
  const empty = window.nightsAvailable - window.nightsBooked - window.nightsAwaitingPayment;
  return (
    <div className="kpi-tile">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{tr(`${booked}% booked`, `${booked}% reservado`)}</span>
      <span className="kpi-note">
        {tr(`${window.nightsBooked} of ${window.nightsAvailable} nights · ${money(window.revenue)}`, `${window.nightsBooked} de ${window.nightsAvailable} noches · ${money(window.revenue)}`)}
      </span>
      <span className="kpi-note">
        {window.nightsAwaitingPayment > 0
          ? tr(`${empty} empty, ${window.nightsAwaitingPayment} waiting for payment`, `${empty} libres, ${window.nightsAwaitingPayment} pendientes de pago`)
          : tr(`${empty} empty nights`, `${empty} noches libres`)}
      </span>
    </div>
  );
}

/** What is booked from today on, with the price of every empty night in the next two weeks. */
export default function OutlookSection({ outlook, tr, dateLocale, locale, money }) {
  const stateLabel = {
    direct: tr('Booked direct', 'Reservada directa'),
    platform: tr('Booked through a platform', 'Reservada por plataforma'),
    awaiting_payment: tr('Waiting for payment', 'Pendiente de pago'),
    pending: tr('New request', 'Solicitud nueva'),
    empty: tr('Empty', 'Libre'),
  };
  const fill = {
    direct: COLORS.direct,
    platform: COLORS.platform,
    awaiting_payment: COLORS.awaitingPayment,
  };
  const isWeekendNight = (date) => [5, 6].includes(parseISO(date).getDay());

  return (
    <section className="card analytics-section">
      <div className="analytics-section-head">
        <h3 className="section-title"><CalendarClock size={18} /> {tr('Coming up', 'Próximamente')}</h3>
        <Link to="/prices" className="btn btn-outline btn-sm">{tr('Change prices', 'Cambiar precios')}</Link>
      </div>
      <p className="analytics-section-lead">{tr('From today, whatever period you chose above.', 'Desde hoy, sea cual sea el periodo elegido arriba.')}</p>

      <div className="kpi-row kpi-row-2">
        <WindowTile window={outlook.next30} label={tr('Next 30 days', 'Próximos 30 días')} tr={tr} money={money} />
        <WindowTile window={outlook.next90} label={tr('Next 90 days', 'Próximos 90 días')} tr={tr} money={money} />
      </div>

      <h4 className="analytics-grid-title">{tr('The next two weeks: empty nights show their price', 'Las próximas dos semanas: las noches libres muestran su precio')}</h4>
      <div className="outlook-grid-wrap">
        <table className="outlook-grid">
          <thead>
            <tr>
              <th className="outlook-suite-col">{tr('Suite', 'Suite')}</th>
              {outlook.days.map((date) => (
                <th key={date} className={`${isWeekendNight(date) ? 'weekend' : ''} ${isToday(parseISO(date)) ? 'today' : ''}`}>
                  <span>{format(parseISO(date), 'EEEEEE', { locale: dateLocale })}</span>
                  {format(parseISO(date), 'd')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {outlook.suites.map((suite) => (
              <tr key={suite.suiteId}>
                <th className="outlook-suite-col" scope="row">{suite.suiteName}</th>
                {suite.nights.map((night) => {
                  const title = `${suite.suiteName} · ${format(parseISO(night.date), 'EEE d MMM', { locale: dateLocale })} · ${stateLabel[night.state]}`
                    + (night.state === 'empty' && night.price != null ? ` · ${formatEuroShort(night.price, locale)}` : '');
                  return (
                    <td
                      key={night.date}
                      className={`outlook-night ${night.state} ${isWeekendNight(night.date) ? 'weekend' : ''}`}
                      style={fill[night.state] ? { background: fill[night.state] } : undefined}
                      title={title}
                    >
                      {night.state === 'empty' && (night.price != null ? formatEuroShort(night.price, locale).replace(/\s?€\s?/, '') : '–')}
                      {night.state === 'pending' && '?'}
                      <span className="sr-only">{title}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chart-legend">
        {NIGHT_STATES.map((state) => (
          <span key={state}>
            <i className={`legend-${state}`} style={fill[state] ? { background: fill[state] } : undefined} />
            {stateLabel[state]}
          </span>
        ))}
        <span><i className="legend-empty" />{tr('Empty: price per night in €', 'Libre: precio por noche en €')}</span>
      </div>
    </section>
  );
}
