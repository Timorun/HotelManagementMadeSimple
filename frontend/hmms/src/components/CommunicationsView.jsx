import { useEffect, useMemo, useState } from 'react';
import { Copy, Mail, Megaphone, MessageCircle, Users } from 'lucide-react';
import {
  fetchGuestPreferencesLink,
  fetchGuests,
  fetchNationalities,
  fetchReservations,
  fetchSettings,
} from '../api/backend';
import { useI18n } from '../context/I18nContext';
import { copyTextToClipboard } from '../utils/clipboard';
import { formatPhoneDisplay, toWhatsAppLink } from '../utils/phone';
import { buildMailtoBatches, hasMarketingConsent, personalize } from '../utils/communications';
import { useSessionState } from '../hooks/useSessionState';

const DRAFT_STORAGE_KEY = 'hmms_communication_draft';

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)) || { subject: '', body: '' };
  } catch {
    return { subject: '', body: '' };
  }
}

/**
 * Compose a message and send it to selected guests: as a BCC email through the
 * mail app (mailto:), or one by one on WhatsApp (wa.me). Guests without marketing
 * consent are excluded by default and need explicit confirmation.
 */
export default function CommunicationsView() {
  const { tr } = useI18n();
  const [guests, setGuests] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState('');
  const [audience, setAudience] = useSessionState('communications.audience', 'consented');
  const [nationality, setNationality] = useState('all');
  const [contactFilter, setContactFilter] = useState('any');
  const [stayFrom, setStayFrom] = useState('');
  const [stayTo, setStayTo] = useState('');
  const [stayGuestIds, setStayGuestIds] = useState(null);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [draft, setDraft] = useState(loadDraft);
  const [includeFooter, setIncludeFooter] = useState(true);

  useEffect(() => {
    Promise.all([fetchGuests(), fetchNationalities(), fetchSettings()])
      .then(([guestList, nationalityList, settingsData]) => {
        setGuests((guestList || []).filter((guest) => !guest.anonymized));
        setNationalities(nationalityList || []);
        setSettings(settingsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Draft persistence is a convenience only.
    }
  }, [draft]);

  // "Stayed between" filter: guests with a reservation starting in the range.
  useEffect(() => {
    if (!stayFrom || !stayTo) {
      setStayGuestIds(null);
      return;
    }
    let cancelled = false;
    fetchReservations(stayFrom, stayTo)
      .then((reservations) => {
        if (!cancelled) {
          setStayGuestIds(new Set((reservations || [])
            .filter((reservation) => reservation.status !== 'cancelled')
            .map((reservation) => Number(reservation.guestId))));
        }
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [stayFrom, stayTo]);

  const visibleGuests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return guests
      .filter((guest) => audience === 'all' || hasMarketingConsent(guest))
      .filter((guest) => nationality === 'all' || guest.nationalityCode === nationality)
      .filter((guest) => {
        if (contactFilter === 'email') return Boolean(guest.email);
        if (contactFilter === 'phone') return Boolean(toWhatsAppLink(guest.phone));
        return true;
      })
      .filter((guest) => !stayGuestIds || stayGuestIds.has(Number(guest.guestId)))
      .filter((guest) => !query || `${guest.firstName} ${guest.lastName} ${guest.email || ''}`.toLowerCase().includes(query))
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`));
  }, [guests, audience, nationality, contactFilter, stayGuestIds, search]);

  const selectedGuests = useMemo(
    () => guests.filter((guest) => selectedIds.has(guest.guestId)),
    [guests, selectedIds],
  );

  const consentWarning = (guest) => (
    guest.marketingOptOutAt
      ? tr(
        `${guest.firstName} ${guest.lastName} has opted out of marketing. Only contact them about their stay. Select anyway?`,
        `${guest.firstName} ${guest.lastName} se ha dado de baja del marketing. Contactale solo sobre su estancia. ¿Seleccionar igualmente?`,
      )
      : tr(
        `${guest.firstName} ${guest.lastName} has not given marketing consent. Only contact them about their stay. Select anyway?`,
        `${guest.firstName} ${guest.lastName} no ha dado su consentimiento de marketing. Contactale solo sobre su estancia. ¿Seleccionar igualmente?`,
      )
  );

  const toggleGuest = (guest) => {
    const isSelected = selectedIds.has(guest.guestId);
    if (!isSelected && !hasMarketingConsent(guest) && !window.confirm(consentWarning(guest))) {
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isSelected) {
        next.delete(guest.guestId);
      } else {
        next.add(guest.guestId);
      }
      return next;
    });
  };

  // "Select all" only picks guests who consented; others must be ticked one by one.
  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleGuests.filter(hasMarketingConsent).forEach((guest) => next.add(guest.guestId));
      return next;
    });
  };

  const skippedByConsent = visibleGuests.filter((guest) => !hasMarketingConsent(guest)).length;

  const emailFooter = includeFooter && settings?.preferencesPageUrl
    ? `\n\n--\n${tr('Unsubscribe or request deletion of your data', 'Darte de baja o solicitar la eliminacion de tus datos')}: ${settings.preferencesPageUrl}`
    : '';

  const emailRecipients = selectedGuests.filter((guest) => guest.email);
  const mailBatches = useMemo(() => buildMailtoBatches({
    to: settings?.ownerEmail || '',
    bcc: emailRecipients.map((guest) => guest.email),
    subject: draft.subject,
    body: personalize(draft.body, null) + emailFooter,
  }), [emailRecipients, settings?.ownerEmail, draft.subject, draft.body, emailFooter]);

  const openWhatsApp = async (guest) => {
    if (!hasMarketingConsent(guest) && !window.confirm(consentWarning(guest))) {
      return;
    }
    // Open the window synchronously so popup blockers allow it, then point it at wa.me.
    const popup = window.open('', '_blank');
    let footer = '';
    if (includeFooter) {
      try {
        const link = await fetchGuestPreferencesLink(guest.guestId);
        footer = `\n\n${tr('Unsubscribe or delete your data', 'Darte de baja o eliminar tus datos')}: ${link}`;
      } catch {
        footer = settings?.preferencesPageUrl ? `\n\n${settings.preferencesPageUrl}` : '';
      }
    }
    const link = toWhatsAppLink(guest.phone, personalize(draft.body, guest.firstName) + footer);
    if (popup) {
      popup.location.href = link;
    } else {
      window.location.assign(link);
    }
  };

  const copyEmails = async () => {
    const ok = await copyTextToClipboard(emailRecipients.map((guest) => guest.email).join(', '));
    setNotice(ok
      ? tr(`${emailRecipients.length} email addresses copied.`, `${emailRecipients.length} correos copiados.`)
      : tr('Could not copy to clipboard.', 'No se pudo copiar.'));
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div className="communications-page">
      <div className="card mb-3">
        <div className="card-header">
          <h2><Megaphone size={28} /> {tr('Communications', 'Comunicaciones')}</h2>
        </div>
        <p className="quick-view-subtitle">
          {tr(
            'Write a message once, then send it as a BCC email from your mail app or one by one on WhatsApp. Each message includes a link to unsubscribe or request data deletion.',
            'Escribe un mensaje una vez y envialo como correo en CCO desde tu aplicacion de correo o uno a uno por WhatsApp. Cada mensaje incluye un enlace para darse de baja o pedir la eliminacion de datos.',
          )}
        </p>
      </div>

      {error && <div className="error-message mb-3">{error}</div>}
      {notice && <div className="success-message mb-3">{notice}</div>}

      <div className="communications-grid">
        <section className="card">
          <h3 className="section-title"><Users size={18} /> {tr('Recipients', 'Destinatarios')}</h3>
          <div className="communications-filters">
            <input className="form-input" placeholder={tr('Search name or email…', 'Buscar nombre o correo…')} value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="form-select" value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="consented">{tr('With marketing consent', 'Con consentimiento de marketing')}</option>
              <option value="all">{tr('All guests', 'Todos los huespedes')}</option>
            </select>
            <select className="form-select" value={nationality} onChange={(e) => setNationality(e.target.value)}>
              <option value="all">{tr('All nationalities', 'Todas las nacionalidades')}</option>
              {nationalities.map((item) => <option key={item.nationalityCode} value={item.nationalityCode}>{item.name}</option>)}
            </select>
            <select className="form-select" value={contactFilter} onChange={(e) => setContactFilter(e.target.value)}>
              <option value="any">{tr('Any contact', 'Cualquier contacto')}</option>
              <option value="email">{tr('Has email', 'Con correo')}</option>
              <option value="phone">{tr('Has WhatsApp number', 'Con WhatsApp')}</option>
            </select>
            <label className="communications-range">
              <span>{tr('Stayed between', 'Estancia entre')}</span>
              <input type="date" className="form-input" value={stayFrom} onChange={(e) => setStayFrom(e.target.value)} />
              <input type="date" className="form-input" value={stayTo} onChange={(e) => setStayTo(e.target.value)} />
            </label>
          </div>

          <div className="communications-toolbar">
            <span>{tr(`${visibleGuests.length} shown · ${selectedIds.size} selected`, `${visibleGuests.length} mostrados · ${selectedIds.size} seleccionados`)}</span>
            <div>
              <button type="button" className="btn btn-outline btn-sm" onClick={selectAllVisible}>{tr('Select all with consent', 'Seleccionar todos con consentimiento')}</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedIds(new Set())}>{tr('Clear', 'Limpiar')}</button>
            </div>
          </div>
          {audience === 'all' && skippedByConsent > 0 && (
            <p className="field-hint">
              {tr(`${skippedByConsent} guest(s) without marketing consent are not included in "select all".`, `${skippedByConsent} huesped(es) sin consentimiento no se incluyen en "seleccionar todos".`)}
            </p>
          )}

          <ul className="communications-list">
            {visibleGuests.map((guest) => {
              const consented = hasMarketingConsent(guest);
              return (
                <li key={guest.guestId} className={selectedIds.has(guest.guestId) ? 'selected' : ''}>
                  <label>
                    <input type="checkbox" checked={selectedIds.has(guest.guestId)} onChange={() => toggleGuest(guest)} />
                    <span className="communications-name">{guest.firstName} {guest.lastName}</span>
                  </label>
                  <span className="communications-contact">
                    {guest.email || '—'}{guest.phone ? ` · ${formatPhoneDisplay(guest.phone)}` : ''}
                  </span>
                  <span className={`consent-badge ${consented ? 'yes' : guest.marketingOptOutAt ? 'opted-out' : 'no'}`}>
                    {consented ? tr('Consent', 'Consentimiento') : guest.marketingOptOutAt ? tr('Opted out', 'Baja') : tr('No consent', 'Sin consentimiento')}
                  </span>
                </li>
              );
            })}
            {visibleGuests.length === 0 && <li className="empty-state compact-empty">{tr('No guests match these filters.', 'Ningun huesped coincide con los filtros.')}</li>}
          </ul>
        </section>

        <section className="card">
          <h3 className="section-title"><Mail size={18} /> {tr('Message', 'Mensaje')}</h3>
          <label className="form-group">
            <span className="form-label">{tr('Subject (email)', 'Asunto (correo)')}</span>
            <input className="form-input" value={draft.subject} onChange={(e) => setDraft((prev) => ({ ...prev, subject: e.target.value }))} />
          </label>
          <label className="form-group">
            <span className="form-label">{tr('Message', 'Mensaje')}</span>
            <textarea className="form-textarea" rows={8} value={draft.body} onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))} />
            <span className="field-hint">
              {tr('{firstName} is replaced with the guest\'s first name on WhatsApp; group emails leave it out.', '{firstName} se sustituye por el nombre del huesped en WhatsApp; en correos de grupo se omite.')}
            </span>
          </label>
          <label className="public-check">
            <input type="checkbox" checked={includeFooter} onChange={(e) => setIncludeFooter(e.target.checked)} />
            <span>{tr('Add unsubscribe / delete-my-data link', 'Añadir enlace de baja / eliminacion de datos')}</span>
          </label>

          <h4 className="communications-send-title">{tr('Send by email', 'Enviar por correo')}</h4>
          {emailRecipients.length === 0 ? (
            <p className="field-hint">{tr('Select guests with an email address.', 'Selecciona huespedes con correo.')}</p>
          ) : (
            <div className="communications-actions">
              {mailBatches.map((batch, index) => (
                <a key={batch.href} className="btn btn-primary btn-sm" href={batch.href}>
                  <Mail size={14} />
                  {mailBatches.length > 1
                    ? tr(`Open mail app (${index + 1}/${mailBatches.length}, ${batch.count})`, `Abrir correo (${index + 1}/${mailBatches.length}, ${batch.count})`)
                    : tr(`Open mail app (${batch.count} in BCC)`, `Abrir correo (${batch.count} en CCO)`)}
                </a>
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={copyEmails}><Copy size={14} /> {tr('Copy addresses', 'Copiar correos')}</button>
            </div>
          )}

          <h4 className="communications-send-title">{tr('Send on WhatsApp', 'Enviar por WhatsApp')}</h4>
          {selectedGuests.filter((guest) => toWhatsAppLink(guest.phone)).length === 0 ? (
            <p className="field-hint">{tr('Select guests with a phone number.', 'Selecciona huespedes con telefono.')}</p>
          ) : (
            <ul className="communications-wa-list">
              {selectedGuests.filter((guest) => toWhatsAppLink(guest.phone)).map((guest) => (
                <li key={guest.guestId}>
                  <span>{guest.firstName} {guest.lastName}</span>
                  <button type="button" className="btn btn-success btn-sm" onClick={() => openWhatsApp(guest)} disabled={!draft.body.trim()}>
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
