import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Percent, Plus, Save, Trash2 } from 'lucide-react';
import { deleteCommissionRate, fetchCommissionRates, saveCommissionRate } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';
import { formatChannel } from '../../utils/channels';

// Valid-from date of a platform's starting rate, which also covers every older booking
const SINCE_THE_START = '2000-01-01';
const PLATFORMS = ['booking.com', 'airbnb', 'expedia', 'other'];
const keyOf = (rate) => `${rate.channel}|${rate.validFrom}`;

/**
 * Commission % per platform, each from a date. A booking uses the rate of the day it was booked,
 * so when booking.com raises its rate, adding the new rate from that date leaves older bookings as
 * they were. Analytics uses these rates to show the commission paid.
 */
export default function CommissionSettingsPanel({ onNotice }) {
  const { tr, dateLocale } = useI18n();
  const [rates, setRates] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [adding, setAdding] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setRates(await fetchCommissionRates() || []);
      setDrafts({});
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const byPlatform = useMemo(() => PLATFORMS.map((channel) => {
    const list = rates.filter((rate) => rate.channel === channel);
    const current = list.filter((rate) => rate.validFrom <= today).at(-1);
    return { channel, list, current };
  }), [rates, today]);

  const run = async (action, message) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onNotice(message);
      setAdding(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fromLabel = (validFrom) => (validFrom === SINCE_THE_START
    ? tr('Since the start', 'Desde el inicio')
    : tr(`From ${format(parseISO(validFrom), 'd MMM yyyy', { locale: dateLocale })}`, `Desde el ${format(parseISO(validFrom), 'd MMM yyyy', { locale: dateLocale })}`));

  const saveRate = (rate) => {
    const value = drafts[keyOf(rate)];
    run(
      () => saveCommissionRate({ channel: rate.channel, validFrom: rate.validFrom, rate: Number(value) }),
      tr(`${formatChannel(rate.channel, tr)}: ${value}% saved.`, `${formatChannel(rate.channel, tr)}: ${value}% guardado.`),
    );
  };

  const addRate = () => {
    const from = format(parseISO(adding.validFrom), 'd MMM yyyy', { locale: dateLocale });
    run(
      () => saveCommissionRate({ channel: adding.channel, validFrom: adding.validFrom, rate: Number(adding.rate) }),
      tr(`${formatChannel(adding.channel, tr)}: ${adding.rate}% from ${from} added.`, `${formatChannel(adding.channel, tr)}: ${adding.rate}% desde el ${from} añadido.`),
    );
  };

  return (
    <section className="card mb-3">
      <h3 className="section-title"><Percent size={18} /> {tr('Platform commission', 'Comisión de las plataformas')}</h3>
      <p className="field-hint mb-2">
        {tr(
          'What booking.com and other platforms keep of each booking; Analytics uses it to show what you pay and what you keep. A booking uses the rate of the day it was booked: when a platform raises its rate, add the new rate from that date and older bookings stay as they were. Direct bookings pay no commission.',
          'Lo que booking.com y otras plataformas se quedan de cada reserva; Analítica lo usa para mostrar lo que pagas y lo que te queda. Cada reserva usa la comisión del día en que se hizo: si una plataforma sube su comisión, añade la nueva desde esa fecha y las reservas anteriores no cambian. Las reservas directas no pagan comisión.',
        )}
      </p>
      {error && <div className="error-message mb-2">{error}</div>}

      <div className="commission-list">
        {byPlatform.map(({ channel, list, current }) => (
          <div key={channel} className="commission-platform">
            <div className="commission-platform-head">
              <strong>{formatChannel(channel, tr)}</strong>
              {current && <span className="commission-now">{tr(`${Number(current.rate)}% now`, `${Number(current.rate)}% ahora`)}</span>}
            </div>
            {list.map((rate, index) => {
              const draft = drafts[keyOf(rate)];
              const changed = draft !== undefined && draft !== '' && Number(draft) !== Number(rate.rate);
              return (
                <div key={keyOf(rate)} className="commission-rate-row">
                  <span className="commission-from">{fromLabel(rate.validFrom)}</span>
                  <label className="commission-input">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      inputMode="decimal"
                      className="form-input"
                      aria-label={`${formatChannel(channel, tr)} ${fromLabel(rate.validFrom)}`}
                      value={draft ?? Number(rate.rate)}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [keyOf(rate)]: e.target.value }))}
                    />
                    <span>%</span>
                  </label>
                  <button type="button" className="btn btn-primary btn-sm" disabled={!changed || busy} onClick={() => saveRate(rate)}>
                    <Save size={14} /> {tr('Save', 'Guardar')}
                  </button>
                  {index > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm btn-icon"
                      disabled={busy}
                      onClick={() => run(() => deleteCommissionRate(channel, rate.validFrom), tr('Rate removed.', 'Comisión eliminada.'))}
                      aria-label={tr('Remove this rate', 'Eliminar esta comisión')}
                      title={tr('Remove this rate', 'Eliminar esta comisión')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
            {adding?.channel === channel ? (
              <div className="commission-rate-row commission-add">
                <label className="commission-input">
                  <span className="commission-from">{tr('New rate from', 'Nueva comisión desde')}</span>
                  <input type="date" className="form-input" value={adding.validFrom} onChange={(e) => setAdding((prev) => ({ ...prev, validFrom: e.target.value }))} />
                </label>
                <label className="commission-input">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    className="form-input"
                    aria-label={tr('New rate', 'Nueva comisión')}
                    value={adding.rate}
                    onChange={(e) => setAdding((prev) => ({ ...prev, rate: e.target.value }))}
                  />
                  <span>%</span>
                </label>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy || !adding.validFrom || adding.rate === ''} onClick={addRate}>
                  <Plus size={14} /> {tr('Add', 'Añadir')}
                </button>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setAdding(null)}>
                  {tr('Cancel', 'Cancelar')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="link-button commission-add-link"
                onClick={() => setAdding({ channel, validFrom: today, rate: current ? String(Number(current.rate)) : '' })}
              >
                {tr('The rate changed on a date? Add the new rate', '¿Cambió la comisión en una fecha? Añade la nueva')}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
