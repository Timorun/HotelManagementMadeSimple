import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format, isBefore, parseISO } from 'date-fns';
import { AlertTriangle, BadgeCheck, CalendarClock, Check, Clock, Inbox, Mail, MessageCircle, RefreshCw, X } from 'lucide-react';
import {
  acceptBookingRequest,
  extendPaymentDeadline,
  fetchAwaitingPayment,
  fetchBookingRequests,
  fetchPaymentSettings,
  markBookingRequestPaid,
  rejectBookingRequest,
} from '../api/backend';
import { useI18n } from '../context/I18nContext';
import { formatChannel } from '../utils/channels';
import { BOOKING_REQUESTS_CHANGED_EVENT } from '../utils/events';
import { formatEuro } from '../utils/money';
import { formatPhoneDisplay, toWhatsAppLink } from '../utils/phone';

const DEFAULT_DEADLINE_DAYS = 3;
const isoDate = (date) => format(date, 'yyyy-MM-dd');

/** Today plus the deadline from the settings, but never after the day of arrival. */
function defaultDueDate(reservation, deadlineDays) {
  const today = new Date();
  const due = addDays(today, deadlineDays || DEFAULT_DEADLINE_DAYS);
  const checkIn = parseISO(reservation.checkIn);
  if (isBefore(checkIn, due)) {
    return isoDate(isBefore(checkIn, today) ? today : checkIn);
  }
  return isoDate(due);
}

/**
 * "Solicitudes": new booking requests from the public booking page, and accepted ones waiting for
 * the guest's payment. Accepting holds the dates and emails the payment details; marking a request
 * as paid confirms the booking. The guest is emailed at every step.
 */
export default function BookingRequestsView() {
  const { tr } = useI18n();
  const [pending, setPending] = useState([]);
  const [awaiting, setAwaiting] = useState([]);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingList, awaitingList, paymentSettings] = await Promise.all([
        fetchBookingRequests(),
        fetchAwaitingPayment(),
        fetchPaymentSettings(),
      ]);
      setPending(pendingList || []);
      setAwaiting(awaitingList || []);
      setPayment(paymentSettings);
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

  const handled = async (message) => {
    setNotice(message);
    window.dispatchEvent(new Event(BOOKING_REQUESTS_CHANGED_EVENT));
    await load();
  };

  const hasPaymentMethod = Boolean(payment?.iban || payment?.bizumPhone);
  const overdueCount = awaiting.filter((reservation) => reservation.paymentOverdue).length;

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
            'Accepting a request holds the dates and emails the guest how to pay. When the money arrives, mark it as paid to confirm the booking.',
            'Al aceptar una solicitud se reservan las fechas y se envían al huésped los datos para pagar. Cuando llegue el dinero, márcala como pagada para confirmar la reserva.',
          )}
        </p>
      </div>

      {payment && !hasPaymentMethod && (
        <div className="warning-message mb-3">
          <AlertTriangle size={18} />
          <span>
            {tr('Add your bank account or Bizum number first, so accepted guests know how to pay: ', 'Añade primero tu cuenta bancaria o tu número de Bizum, para que los huéspedes aceptados sepan cómo pagar: ')}
            <Link to="/settings">{tr('Settings, Payments', 'Ajustes, Pagos')}</Link>
          </span>
        </div>
      )}
      {notice && <div className="success-message mb-3">{notice}</div>}
      {error && <div className="error-message mb-3">{error}</div>}

      <h3 className="requests-section-title">
        <Inbox size={18} /> {tr('New requests', 'Solicitudes nuevas')}
        <span className="requests-count">{pending.length}</span>
      </h3>
      {!loading && pending.length === 0 && (
        <p className="requests-empty">{tr('No new requests.', 'No hay solicitudes nuevas.')}</p>
      )}
      <div className="requests-list mb-3">
        {pending.map((reservation) => (
          <BookingRequestCard
            key={reservation.reservationId}
            reservation={reservation}
            deadlineDays={payment?.deadlineDays}
            onHandled={handled}
          />
        ))}
      </div>

      <h3 className="requests-section-title">
        <Clock size={18} /> {tr('Awaiting payment', 'Pendientes de pago')}
        <span className="requests-count">{awaiting.length}</span>
        {overdueCount > 0 && <span className="request-overdue-badge">{tr(`${overdueCount} overdue`, `${overdueCount} vencida(s)`)}</span>}
      </h3>
      {!loading && awaiting.length === 0 && (
        <p className="requests-empty">{tr('Nothing waiting for payment.', 'Nada pendiente de pago.')}</p>
      )}
      <div className="requests-list">
        {awaiting.map((reservation) => (
          <BookingRequestCard key={reservation.reservationId} reservation={reservation} onHandled={handled} />
        ))}
      </div>
    </div>
  );
}

function BookingRequestCard({ reservation, deadlineDays, onHandled }) {
  const { tr, dateLocale, locale } = useI18n();
  const awaitingPayment = reservation.status === 'awaiting_payment';
  // 'accept' | 'reject' for new requests; 'paid' | 'extend' | 'cancel' for unpaid ones
  const [mode, setMode] = useState(null);
  const [price, setPrice] = useState(reservation.priceTotal ?? '');
  const [dueDate, setDueDate] = useState(() => (
    awaitingPayment ? isoDate(addDays(new Date(), deadlineDays || DEFAULT_DEADLINE_DAYS)) : defaultDueDate(reservation, deadlineDays)
  ));
  const [message, setMessage] = useState('');
  const [notifyGuest, setNotifyGuest] = useState(Boolean(reservation.email));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const nights = differenceInCalendarDays(parseISO(reservation.checkOut), parseISO(reservation.checkIn));
  const formatDate = (value) => format(parseISO(value), 'EEE d MMM yyyy', { locale: dateLocale });
  const whatsappLink = toWhatsAppLink(reservation.phone);
  const reference = `#${reservation.reservationId}`;

  const open = (nextMode) => {
    setMode(nextMode);
    setMessage('');
    setError(null);
    if (nextMode === 'extend') {
      setDueDate(isoDate(addDays(new Date(), deadlineDays || DEFAULT_DEADLINE_DAYS)));
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = reservation.reservationId;
      if (mode === 'accept') {
        const priceTotal = price === '' ? null : Number(price);
        if (priceTotal === null || !Number.isFinite(priceTotal) || priceTotal < 0) {
          throw new Error(tr('Enter the total price of the stay.', 'Introduce el precio total de la estancia.'));
        }
        await acceptBookingRequest(id, { priceTotal, paymentDueDate: dueDate, message, notifyGuest });
        await onHandled(tr(`Request ${reference} accepted. It now waits for payment.`, `Solicitud ${reference} aceptada. Ahora espera el pago.`));
      } else if (mode === 'paid') {
        await markBookingRequestPaid(id, { message, notifyGuest });
        await onHandled(tr(`Booking ${reference} is paid and confirmed.`, `Reserva ${reference} pagada y confirmada.`));
      } else if (mode === 'extend') {
        await extendPaymentDeadline(id, { paymentDueDate: dueDate, message, notifyGuest });
        await onHandled(tr(`New payment deadline for ${reference}.`, `Nuevo plazo de pago para ${reference}.`));
      } else {
        await rejectBookingRequest(id, { message, notifyGuest });
        await onHandled(mode === 'cancel'
          ? tr(`Request ${reference} cancelled; the dates are free again.`, `Solicitud ${reference} cancelada; las fechas vuelven a estar libres.`)
          : tr(`Request ${reference} rejected.`, `Solicitud ${reference} rechazada.`));
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const submitLabel = {
    accept: tr('Accept and send payment details', 'Aceptar y enviar datos de pago'),
    reject: tr('Reject request', 'Rechazar solicitud'),
    paid: tr('Confirm booking', 'Confirmar reserva'),
    extend: tr('Save new deadline', 'Guardar nuevo plazo'),
    cancel: tr('Cancel request', 'Cancelar solicitud'),
  }[mode];
  const submitClass = mode === 'reject' || mode === 'cancel' ? 'btn-danger' : 'btn-success';
  const messageLabel = {
    accept: tr('Message to the guest (optional)', 'Mensaje para el huésped (opcional)'),
    reject: tr('Reason / alternative dates (optional)', 'Motivo / fechas alternativas (opcional)'),
    paid: tr('Message to the guest (optional)', 'Mensaje para el huésped (opcional)'),
    extend: tr('Message with the reminder (optional)', 'Mensaje con el recordatorio (opcional)'),
    cancel: tr('Message to the guest (optional)', 'Mensaje para el huésped (opcional)'),
  }[mode];
  const emailLabel = {
    accept: tr('Email the guest the price and payment details', 'Enviar al huésped el precio y los datos de pago'),
    paid: tr('Email the guest the confirmation', 'Enviar al huésped la confirmación'),
    extend: tr('Email the guest a reminder with the new date', 'Enviar al huésped un recordatorio con la nueva fecha'),
  }[mode] || tr('Email the guest', 'Enviar correo al huésped');

  return (
    <article className={`card request-card ${reservation.paymentOverdue ? 'overdue' : ''}`}>
      <div className="request-head">
        <div>
          <div className="request-guest">{reservation.guestDisplayName || reservation.guestName}</div>
          <div className="request-meta">
            {reference} · {formatChannel(reservation.channel, tr)}
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

      {awaitingPayment && (
        <div className={`request-due ${reservation.paymentOverdue ? 'overdue' : ''}`}>
          <CalendarClock size={16} />
          <span>
            {reservation.paymentOverdue
              ? tr(`Payment overdue since ${formatDate(reservation.paymentDueDate)}`, `Pago vencido desde el ${formatDate(reservation.paymentDueDate)}`)
              : tr(`Pay by ${formatDate(reservation.paymentDueDate)}`, `Pagar antes del ${formatDate(reservation.paymentDueDate)}`)}
          </span>
        </div>
      )}

      <dl className="request-stay">
        <div><dt>{tr('Suite', 'Suite')}</dt><dd>{reservation.suiteName}</dd></div>
        <div><dt>{tr('Check-in', 'Llegada')}</dt><dd>{formatDate(reservation.checkIn)}</dd></div>
        <div><dt>{tr('Check-out', 'Salida')}</dt><dd>{formatDate(reservation.checkOut)}</dd></div>
        <div><dt>{tr('Nights', 'Noches')}</dt><dd>{nights}</dd></div>
        <div><dt>{tr('Guests', 'Huéspedes')}</dt><dd>{reservation.numGuests}</dd></div>
        <div>
          <dt>{tr('Price', 'Precio')}</dt>
          <dd>{reservation.priceTotal != null ? formatEuro(reservation.priceTotal, locale) : tr('Not set', 'Sin precio')}</dd>
        </div>
      </dl>
      {reservation.notes && <p className="request-notes">“{reservation.notes}”</p>}

      {mode ? (
        <div className="request-decision">
          {mode === 'accept' && (
            <div className="request-decision-row">
              <label className="form-group">
                <span className="form-label">{tr('Total price (€)', 'Precio total (€)')}</span>
                <input type="number" min="0" step="0.01" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} />
                <span className="field-hint">
                  {reservation.priceTotal != null
                    ? tr('The price the guest saw, from the price calendar.', 'El precio que vio el huésped, del calendario de precios.')
                    : tr('No price in the calendar for all these nights.', 'No hay precio en el calendario para todas estas noches.')}
                </span>
              </label>
              <label className="form-group">
                <span className="form-label">{tr('Pay by', 'Pagar antes del')}</span>
                <input type="date" className="form-input" min={isoDate(new Date())} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            </div>
          )}
          {mode === 'extend' && (
            <label className="form-group">
              <span className="form-label">{tr('New payment deadline', 'Nuevo plazo de pago')}</span>
              <input type="date" className="form-input" min={isoDate(new Date())} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          )}
          {mode === 'paid' && (
            <p className="request-decision-text">
              {tr(
                `Confirm only once ${formatEuro(reservation.priceTotal, locale)} has arrived in your account or by Bizum.`,
                `Confirma solo cuando hayas recibido ${formatEuro(reservation.priceTotal, locale)} en tu cuenta o por Bizum.`,
              )}
            </p>
          )}
          <label className="form-group">
            <span className="form-label">{messageLabel}</span>
            <textarea className="form-textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <label className="public-check">
            <input type="checkbox" checked={notifyGuest} disabled={!reservation.email} onChange={(e) => setNotifyGuest(e.target.checked)} />
            <span>{emailLabel}</span>
          </label>
          <div className="request-actions">
            <button type="button" className={`btn ${submitClass}`} disabled={busy} onClick={submit}>{submitLabel}</button>
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => setMode(null)}>{tr('Back', 'Volver')}</button>
          </div>
        </div>
      ) : (
        <div className="request-actions">
          {awaitingPayment ? (
            <>
              <button type="button" className="btn btn-success" onClick={() => open('paid')}>
                <BadgeCheck size={16} /> {tr('Mark as paid', 'Marcar como pagada')}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => open('extend')}>
                <CalendarClock size={16} /> {tr('More time', 'Más plazo')}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => open('cancel')}>
                <X size={16} /> {tr('Cancel', 'Cancelar')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-success" onClick={() => open('accept')}>
                <Check size={16} /> {tr('Accept', 'Aceptar')}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => open('reject')}>
                <X size={16} /> {tr('Reject', 'Rechazar')}
              </button>
            </>
          )}
        </div>
      )}
      {error && <div className="error-message mt-2">{error}</div>}
    </article>
  );
}
