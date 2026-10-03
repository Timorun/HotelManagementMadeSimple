import { Store } from 'lucide-react';
import { formatChannel } from '../../utils/channels';
import { COLORS } from './chartTheme';

// Segments narrower than this get no label inside; the legend and table carry the number
const MIN_LABEL_SHARE = 15;

function ShareBar({ label, direct, platform, tr }) {
  const total = direct + platform;
  const directShare = total > 0 ? (direct * 100) / total : 0;
  const parts = [
    { key: 'direct', nights: direct, share: directShare, color: COLORS.direct, name: tr('Direct', 'Directo') },
    { key: 'platform', nights: platform, share: 100 - directShare, color: COLORS.platform, name: tr('Platforms', 'Plataformas') },
  ].filter((part) => part.nights > 0);
  return (
    <div className="share-row">
      <span className="share-row-label">{label}</span>
      {total === 0 ? (
        <span className="share-empty">{tr('No nights sold', 'Sin noches vendidas')}</span>
      ) : (
        <div className="share-bar" role="img" aria-label={parts.map((part) => `${part.name} ${Math.round(part.share)}%`).join(', ')}>
          {parts.map((part) => (
            <span
              key={part.key}
              className="share-segment"
              style={{ flexBasis: `${part.share}%`, background: part.color }}
              title={`${part.name}: ${Math.round(part.share)}% (${part.nights} ${tr('nights', 'noches')})`}
            >
              {part.share >= MIN_LABEL_SHARE ? `${Math.round(part.share)}%` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Direct bookings (no commission) against booking.com and other platforms. */
export default function ChannelSection({ overview, tr, money, periodLabel, compareLabel }) {
  const { current, previous, channels } = overview;
  return (
    <section className="card analytics-section">
      <h3 className="section-title"><Store size={18} /> {tr('Direct vs platforms', 'Directo vs plataformas')}</h3>
      <p className="analytics-section-lead">
        {tr('Share of the nights sold. Direct bookings pay no commission.', 'Parte de las noches vendidas. Las reservas directas no pagan comisión.')}
      </p>
      <div className="share-bars">
        <ShareBar label={periodLabel} direct={current.directNights} platform={current.platformNights} tr={tr} />
        <ShareBar label={compareLabel} direct={previous.directNights} platform={previous.platformNights} tr={tr} />
      </div>
      <div className="chart-legend">
        <span><i style={{ background: COLORS.direct }} />{tr('Direct', 'Directo')}</span>
        <span><i style={{ background: COLORS.platform }} />{tr('Platforms', 'Plataformas')}</span>
      </div>

      <div className="analytics-table-wrap">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>{tr('Channel', 'Canal')}</th>
              <th>{tr('Bookings', 'Reservas')}</th>
              <th>{tr('Nights', 'Noches')}</th>
              <th>{tr('Revenue', 'Ingresos')}</th>
              <th>{tr('Commission', 'Comisión')}</th>
              <th>{tr('Per night', 'Por noche')}</th>
              <th>{tr('Nights last year', 'Noches año pasado')}</th>
            </tr>
          </thead>
          <tbody>
            {channels.length === 0 && (
              <tr><td colSpan={7} className="analytics-empty-cell">{tr('No nights sold in either period.', 'Sin noches vendidas en ninguno de los dos periodos.')}</td></tr>
            )}
            {channels.map((row) => (
              <tr key={row.channel}>
                <th scope="row">
                  <i className="table-key" style={{ background: row.platform ? COLORS.platform : COLORS.direct }} />
                  {formatChannel(row.channel, tr)}
                </th>
                <td>{row.bookings}</td>
                <td>{row.nights}</td>
                <td>{money(row.revenue)}</td>
                <td>{row.platform ? money(row.commission) : '–'}</td>
                <td>{row.nights > 0 ? money(Number(row.revenue) / row.nights) : '–'}</td>
                <td>{row.previousNights}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="field-hint">
        {tr('Commission uses the rates under Settings, Platform commission: each booking the rate of the day it was booked.', 'La comisión usa los porcentajes de Ajustes, Comisión de las plataformas: cada reserva el del día en que se hizo.')}
      </p>
    </section>
  );
}
