import { useCallback, useEffect, useState } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Check, Inbox, Mail, MessageCircle, RefreshCw, X } from 'lucide-react';
import { confirmBookingRequest, fetchBookingRequests, rejectBookingRequest } from '../api/backend';
import { useI18n } from '../context/I18nContext';
import { formatChannel } from '../utils/channels';
import { BOOKING_REQUESTS_CHANGED_EVENT } from '../utils/events';
import { formatPhoneDisplay, toWhatsAppLink } from '../utils/phone';


/**
 * "Solicitudes": pending reservations (mostly from the public booking page) that the owner
 * confirms, with a price, or rejects. The guest is emailed either way.
 */
export default function BookingRequestsView() {
  const { tr, dateLocale } = useI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await fetchBookingRequests());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handled = (reservation, message) => {
    setRequests((prev) => prev.filter((item) => item.reservationId !== reservation.reservationId));
    setNotice(message);
    window.dispatchEvent(new Event(BOOKING_REQUESTS_CHANGED_EVENT));
  };

  return (
    <div>
      <div className="card mb-3">
        <div className="card-header">
          <h2><Inbox size={28} /> {tr('Booking requests', 'Solicitudes de reserva')}</h2>
          <button type="button" className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            {tr('Refresh', 'Actualizar')}
          </button>
        </div>
        <p className="quick-view-subtitle">
          {tr(
            'Pending reservations, e.g. from the public booking page. Confirming or rejecting emails the guest.',
            'Reservas pendientes, p. ej. de la pagina publica de reservas. Al confirmar o rechazar se envia un correo al huesped.',
          )}
        </p>
      </div>

      {notice && <div className="success-message mb-3">{notice}</div>}
      {error && <div className="error-message mb-3">{error}</div>}

      {!loading && requests.length === 0 && (
        <div className="card empty-state">
          <Inbox size={40} style={{ opacity: 0.5 }} />
          <p>{tr('No pending requests.', 'No hay solicitudes pendientes.')}</p>
        </div>
      )}

      <div className="requests-list">
        {requests.map((reservation) => (
          <BookingRequestCard
            key={reservation.reservationId}
            reservation={reservation}
            tr={tr}
            dateLocale={dateLocale}
            onHandled={handled}
          />
        ))}
      </div>
    </div>
  );
}

function BookingRequestCard({ reservation, tr, dateLocale, onHandled }) {
  const [mode, setMode] = useState(null); // 'confirm' | 'reject'
  const [price, setPrice] = useState(reservation.priceTotal ?? '');
  const [message, setMessage] = useState('');
  const [notifyGuest, setNotifyGuest] = useState(Boolean(reservation.email));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const nights = differenceInCalendarDays(parseISO(reservation.checkOut), parseISO(reservation.checkIn));
  const formatDate = (value) => format(parseISO(value), 'EEE d MMM yyyy', { locale: dateLocale });
  const whatsappLink = toWhatsAppLink(reservation.phone);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'confirm') {
        const priceTotal = price === '' ? null : Number(price);
        if (priceTotal !== null && (!Number.isFinite(priceTotal) || priceTotal < 0)) {
          throw new Error(tr('Enter a valid price.', 'Introduce un precio valido.'));
        }
        await confirmBookingRequest(reservation.reservationId, { priceTotal, message, notifyGuest });
        onHandled(reservation, tr(`Request #${reservation.reservationId} confirmed.`, `Solicitud #${reservation.reservationId} confirmada.`));
      } else {
        await rejectBookingRequest(reservation.reservationId, { message, notifyGuest });
        onHandled(reservation, tr(`Request #${reservation.reservationId} rejected.`, `Solicitud #${reservation.reservationId} rechazada.`));
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <article className="card request-card">
      <div className="request-head">
        <div>
          <div className="request-guest">{reservation.guestDisplayName || reservation.guestName}</div>
          <div className="request-meta">
            #{reservation.reservationId} · {formatChannel(reservation.channel, tr)}
            {reservation.createdAt && ` · ${tr('received', 'recibida')} ${format(parseISO(reservation.createdAt), 'd MMM HH:mm', { locale: dateLocale })}`}
          </div>
        </div>
        <div className="request-contact">
          {reservation.email && (
            <a className="btn btn-outline btn-sm" href={`mailto:${reservation.email}`}><Mail size={14} /> {reservation.email}</a>
          )}
          {whatsappLink && (
            <a className="btn btn-outline btn-sm" href={whatsappLink} target="_blank" rel="noreferrer">
              <MessageCircle size={14} /> {formatPhoneDisplay(reservation.phone)}
            </a>
          )}
        </div>
      </div>

      <dl className="request-stay">
        <div><dt>{tr('Suite', 'Suite')}</dt><dd>{reservation.suiteName}</dd></div>
        <div><dt>{tr('Check-in', 'Llegada')}</dt><dd>{formatDate(reservation.checkIn)}</dd></div>
        <div><dt>{tr('Check-out', 'Salida')}</dt><dd>{formatDate(reservation.checkOut)}</dd></div>
        <div><dt>{tr('Nights', 'Noches')}</dt><dd>{nights}</dd></div>
        <div><dt>{tr('Guests', 'Huespedes')}</dt><dd>{reservation.numGuests}</dd></div>
      </dl>
      {reservation.notes && <p className="request-notes">“{reservation.notes}”</p>}

      {mode ? (
        <div className="request-decision">
          {mode === 'confirm' && (
            <label className="form-group">
              <span className="form-label">{tr('Total price (€)', 'Precio total (€)')}</span>
              <input type="number" min="0" step="0.01" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          )}
          <label className="form-group">
            <span className="form-label">
              {mode === 'confirm'
                ? tr('Message to the guest (optional)', 'Mensaje para el huesped (opcional)')
                : tr('Reason / alternative dates (optional)', 'Motivo / fechas alternativas (opcional)')}
            </span>
            <textarea className="form-textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <label className="public-check">
            <input type="checkbox" checked={notifyGuest} disabled={!reservation.email} onChange={(e) => setNotifyGuest(e.target.checked)} />
            <span>{tr('Email the guest', 'Enviar correo al huesped')}</span>
          </label>
          <div className="request-actions">
            <button type="button" className={`btn ${mode === 'confirm' ? 'btn-success' : 'btn-danger'}`} disabled={busy} onClick={submit}>
              {mode === 'confirm' ? tr('Confirm reservation', 'Confirmar reserva') : tr('Reject request', 'Rechazar solicitud')}
            </button>
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setMode(null)}>{tr('Back', 'Volver')}</button>
          </div>
        </div>
      ) : (
        <div className="request-actions">
          <button type="button" className="btn btn-success" onClick={() => setMode('confirm')}><Check size={16} /> {tr('Confirm', 'Confirmar')}</button>
          <button type="button" className="btn btn-outline" onClick={() => setMode('reject')}><X size={16} /> {tr('Reject', 'Rechazar')}</button>
        </div>
      )}
      {error && <div className="error-message mt-2">{error}</div>}
    </article>
  );
}
