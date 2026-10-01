import { useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { BedDouble, CalendarCheck, CheckCircle2, Search, Users } from 'lucide-react';
import { fetchPublicAvailability, fetchPublicNationalities, submitBookingRequest } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';
import PhoneInput from '../common/PhoneInput';
import { isValidPhoneOrEmpty } from '../../utils/phone';
import PublicLayout from './PublicLayout';

const today = () => format(new Date(), 'yyyy-MM-dd');

const EMPTY_DETAILS = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nationalityCode: '',
  notes: '',
  marketingConsent: false,
  privacyAccepted: false,
  website: '', // honeypot, hidden from people
};

/**
 * Public page where guests request a stay. Requests arrive as pending reservations
 * that the owner confirms or rejects from the Requests tab.
 */
export default function BookingPage() {
  const { tr, language, dateLocale } = useI18n();
  const [search, setSearch] = useState({
    checkIn: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    checkOut: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    guests: 2,
  });
  const [searchedStay, setSearchedStay] = useState(null);
  const [suites, setSuites] = useState(null);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [nationalities, setNationalities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    fetchPublicNationalities()
      .then((list) => setNationalities([...(list || [])].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setNationalities([]));
  }, []);

  const nights = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(search.checkOut), parseISO(search.checkIn));
    } catch {
      return 0;
    }
  }, [search.checkIn, search.checkOut]);

  const formatDate = (value) => format(parseISO(value), 'EEE d MMM yyyy', { locale: dateLocale });

  const handleSearch = async (event) => {
    event.preventDefault();
    setError(null);
    setSelectedSuite(null);
    if (nights < 1) {
      setError(tr('Check-out must be after check-in.', 'La salida debe ser posterior a la llegada.'));
      return;
    }
    setBusy(true);
    try {
      const available = await fetchPublicAvailability(search.checkIn, search.checkOut, search.guests);
      setSuites(available || []);
      setSearchedStay({ ...search });
    } catch (err) {
      setSuites(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!isValidPhoneOrEmpty(details.phone)) {
      setError(tr('Please enter a valid phone number with country code.', 'Introduce un telefono valido con prefijo del pais.'));
      return;
    }
    setBusy(true);
    try {
      const result = await submitBookingRequest({
        ...details,
        suiteId: selectedSuite.suiteId,
        checkIn: searchedStay.checkIn,
        checkOut: searchedStay.checkOut,
        numGuests: Number(searchedStay.guests),
        language,
      });
      setConfirmation(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setDetail = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  if (confirmation) {
    return (
      <PublicLayout>
        <section className="card public-card public-success">
          <CheckCircle2 size={48} color="var(--success)" />
          <h2>{tr('Request sent!', '¡Solicitud enviada!')}</h2>
          <p>
            {tr(
              'Thank you. We have emailed you a copy of your request and will confirm availability and the price as soon as possible.',
              'Gracias. Te hemos enviado una copia de tu solicitud por correo y te confirmaremos la disponibilidad y el precio lo antes posible.',
            )}
          </p>
          <dl className="public-summary">
            <dt>{tr('Reference', 'Referencia')}</dt><dd>#{confirmation.reference}</dd>
            <dt>{tr('Suite', 'Suite')}</dt><dd>{confirmation.suiteName}</dd>
            <dt>{tr('Check-in', 'Llegada')}</dt><dd>{formatDate(confirmation.checkIn)}</dd>
            <dt>{tr('Check-out', 'Salida')}</dt><dd>{formatDate(confirmation.checkOut)}</dd>
          </dl>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="card public-card">
        <h2 className="public-title"><CalendarCheck size={24} /> {tr('Request a stay', 'Solicita tu estancia')}</h2>
        <p className="public-lead">
          {tr(
            'Choose your dates to see which suites are available. We confirm every request personally by email.',
            'Elige tus fechas para ver que suites estan disponibles. Confirmamos cada solicitud personalmente por correo.',
          )}
        </p>

        <form className="public-search" onSubmit={handleSearch}>
          <label className="form-group">
            <span className="form-label">{tr('Check-in', 'Llegada')}</span>
            <input
              type="date"
              className="form-input"
              min={today()}
              value={search.checkIn}
              onChange={(e) => setSearch((prev) => ({ ...prev, checkIn: e.target.value }))}
              required
            />
          </label>
          <label className="form-group">
            <span className="form-label">{tr('Check-out', 'Salida')}</span>
            <input
              type="date"
              className="form-input"
              min={search.checkIn || today()}
              value={search.checkOut}
              onChange={(e) => setSearch((prev) => ({ ...prev, checkOut: e.target.value }))}
              required
            />
          </label>
          <label className="form-group">
            <span className="form-label">{tr('Guests', 'Huespedes')}</span>
            <input
              type="number"
              className="form-input"
              min={1}
              max={10}
              value={search.guests}
              onChange={(e) => setSearch((prev) => ({ ...prev, guests: e.target.value }))}
              required
            />
          </label>
          <button type="submit" className="btn btn-accent public-search-btn" disabled={busy}>
            <Search size={16} />
            {tr('Check availability', 'Ver disponibilidad')}
          </button>
        </form>

        {error && <div className="error-message mt-2">{error}</div>}
      </section>

      {suites && (
        <section className="card public-card">
          <h3 className="public-subtitle">
            {suites.length > 0
              ? tr(`Available for ${nights} night(s)`, `Disponible para ${nights} noche(s)`)
              : tr('No suites available for these dates', 'No hay suites disponibles para estas fechas')}
          </h3>
          {suites.length === 0 && (
            <p className="public-lead">{tr('Try other dates or fewer guests.', 'Prueba otras fechas o menos huespedes.')}</p>
          )}
          <div className="public-suite-grid">
            {suites.map((suite) => (
              <button
                key={suite.suiteId}
                type="button"
                className={`public-suite ${selectedSuite?.suiteId === suite.suiteId ? 'selected' : ''}`}
                onClick={() => setSelectedSuite(suite)}
              >
                <BedDouble size={22} />
                <span className="public-suite-name">{suite.suiteName}</span>
                <span className="public-suite-meta"><Users size={14} /> {tr(`Up to ${suite.capacity} guests`, `Hasta ${suite.capacity} huespedes`)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selectedSuite && searchedStay && (
        <section className="card public-card">
          <h3 className="public-subtitle">
            {tr('Your details', 'Tus datos')} · {selectedSuite.suiteName}, {formatDate(searchedStay.checkIn)} – {formatDate(searchedStay.checkOut)}
          </h3>
          <form className="public-details" onSubmit={handleSubmit}>
            <label className="form-group">
              <span className="form-label">{tr('First name *', 'Nombre *')}</span>
              <input className="form-input" value={details.firstName} onChange={setDetail('firstName')} autoComplete="given-name" required />
            </label>
            <label className="form-group">
              <span className="form-label">{tr('Last name(s) *', 'Apellido(s) *')}</span>
              <input className="form-input" value={details.lastName} onChange={setDetail('lastName')} autoComplete="family-name" required />
            </label>
            <label className="form-group">
              <span className="form-label">{tr('Email *', 'Correo *')}</span>
              <input type="email" className="form-input" value={details.email} onChange={setDetail('email')} autoComplete="email" required />
            </label>
            <div className="form-group">
              <label className="form-label" htmlFor="public-phone">{tr('Phone (WhatsApp)', 'Telefono (WhatsApp)')}</label>
              <PhoneInput id="public-phone" value={details.phone} onChange={(phone) => setDetails((prev) => ({ ...prev, phone }))} />
            </div>
            <label className="form-group">
              <span className="form-label">{tr('Nationality', 'Nacionalidad')}</span>
              <select className="form-select" value={details.nationalityCode} onChange={setDetail('nationalityCode')}>
                <option value="">{tr('Select…', 'Selecciona…')}</option>
                {nationalities.map((nationality) => (
                  <option key={nationality.nationalityCode} value={nationality.nationalityCode}>{nationality.name}</option>
                ))}
              </select>
            </label>
            <label className="form-group public-full">
              <span className="form-label">{tr('Comments (arrival time, questions…)', 'Comentarios (hora de llegada, preguntas…)')}</span>
              <textarea className="form-textarea" value={details.notes} onChange={setDetail('notes')} rows={3} />
            </label>

            {/* Honeypot: invisible to people, bots tend to fill it in */}
            <input
              type="text"
              name="website"
              className="hp-field"
              tabIndex={-1}
              autoComplete="off"
              value={details.website}
              onChange={setDetail('website')}
              aria-hidden="true"
            />

            <label className="public-check public-full">
              <input type="checkbox" checked={details.privacyAccepted} onChange={setDetail('privacyAccepted')} required />
              <span>
                {tr(
                  'I agree that my details are stored to handle this request and my stay. *',
                  'Acepto que mis datos se guarden para gestionar esta solicitud y mi estancia. *',
                )}
              </span>
            </label>
            <label className="public-check public-full">
              <input type="checkbox" checked={details.marketingConsent} onChange={setDetail('marketingConsent')} />
              <span>
                {tr(
                  'Send me occasional news and offers (you can unsubscribe at any time).',
                  'Enviadme noticias y ofertas ocasionales (puedes darte de baja en cualquier momento).',
                )}
              </span>
            </label>

            <div className="public-full public-submit">
              <button type="submit" className="btn btn-accent" disabled={busy}>
                {busy ? tr('Sending…', 'Enviando…') : tr('Send booking request', 'Enviar solicitud')}
              </button>
              <span className="field-hint">
                {tr('No payment now. We will confirm the price by email.', 'No se paga ahora. Te confirmaremos el precio por correo.')}
              </span>
            </div>
          </form>
          {error && <div className="error-message mt-2">{error}</div>}
        </section>
      )}
    </PublicLayout>
  );
}
