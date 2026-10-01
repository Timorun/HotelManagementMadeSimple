import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MailX, ShieldCheck, Trash2 } from 'lucide-react';
import { fetchPreferences, optOutOfMarketing, requestDataDeletion, requestPreferencesLink } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';
import PublicLayout from './PublicLayout';

/**
 * Guest-facing page to stop marketing messages or request data deletion.
 * /preferences          -> ask for a personal link by email
 * /preferences/:token   -> manage preferences with a signed link
 */
export default function PreferencesPage() {
  const { token } = useParams();
  return (
    <PublicLayout>
      {token ? <ManagePreferences token={token} /> : <RequestLink />}
    </PublicLayout>
  );
}

function RequestLink() {
  const { tr } = useI18n();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPreferencesLink(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card public-card public-narrow">
      <h2 className="public-title"><ShieldCheck size={24} /> {tr('Your communication preferences', 'Tus preferencias de comunicacion')}</h2>
      {sent ? (
        <p className="public-lead">
          {tr(
            'If this address is in our guest list, we have emailed you a personal link. It is valid for 7 days.',
            'Si esta direccion esta en nuestra lista de huespedes, te hemos enviado un enlace personal. Es valido durante 7 dias.',
          )}
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="public-lead">
            {tr(
              'Enter the email you used for your booking. We will send you a personal link to unsubscribe from marketing or to request deletion of your data.',
              'Introduce el correo que usaste en tu reserva. Te enviaremos un enlace personal para darte de baja del marketing o solicitar la eliminacion de tus datos.',
            )}
          </p>
          <label className="form-group">
            <span className="form-label">{tr('Email', 'Correo')}</span>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-accent" disabled={busy}>{tr('Send me the link', 'Enviarme el enlace')}</button>
          {error && <div className="error-message mt-2">{error}</div>}
        </form>
      )}
    </section>
  );
}

function ManagePreferences({ token }) {
  const { tr } = useI18n();
  const [preferences, setPreferences] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchPreferences(token)
      .then(setPreferences)
      .catch((err) => setError(err.message));
  }, [token]);

  const run = async (action) => {
    setBusy(true);
    setError(null);
    try {
      setPreferences(await action(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !preferences) {
    return (
      <section className="card public-card public-narrow">
        <h2 className="public-title">{tr('Link not valid', 'Enlace no valido')}</h2>
        <p className="public-lead">
          {tr('This link is invalid or has expired.', 'Este enlace no es valido o ha caducado.')}{' '}
          <a href="/preferences">{tr('Request a new link', 'Solicitar un nuevo enlace')}</a>
        </p>
      </section>
    );
  }

  if (!preferences) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <section className="card public-card public-narrow">
      <h2 className="public-title"><ShieldCheck size={24} /> {tr(`Hello ${preferences.firstName}`, `Hola ${preferences.firstName}`)}</h2>

      <div className="preferences-block">
        <h3><MailX size={18} /> {tr('Marketing messages', 'Mensajes de marketing')}</h3>
        {preferences.marketingConsent ? (
          <>
            <p>{tr('You currently receive occasional news and offers from us.', 'Actualmente recibes noticias y ofertas ocasionales.')}</p>
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => run(optOutOfMarketing)}>
              {tr('Unsubscribe from marketing', 'Darme de baja del marketing')}
            </button>
          </>
        ) : (
          <p className="preferences-done">
            {tr('You will not receive marketing messages from us.', 'No recibiras mensajes de marketing.')}
          </p>
        )}
      </div>

      <div className="preferences-block">
        <h3><Trash2 size={18} /> {tr('Delete my data', 'Eliminar mis datos')}</h3>
        {preferences.deletionRequested ? (
          <p className="preferences-done">
            {tr(
              'We have received your request and will delete your personal data. Data we must keep by law (e.g. invoices) is kept only as long as required.',
              'Hemos recibido tu solicitud y eliminaremos tus datos personales. Los datos que la ley nos obliga a conservar (p. ej. facturas) se guardan solo el tiempo necesario.',
            )}
          </p>
        ) : confirmDelete ? (
          <>
            <p>{tr('Are you sure? This also unsubscribes you from all messages.', '¿Seguro? Esto tambien te da de baja de todos los mensajes.')}</p>
            <div className="preferences-actions">
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(requestDataDeletion)}>
                {tr('Yes, delete my data', 'Si, eliminar mis datos')}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setConfirmDelete(false)}>{tr('Cancel', 'Cancelar')}</button>
            </div>
          </>
        ) : (
          <>
            <p>{tr(`Ask ${preferences.hotelName} to delete the personal data we hold about you.`, `Pide a ${preferences.hotelName} que elimine los datos personales que tenemos sobre ti.`)}</p>
            <button type="button" className="btn btn-outline" onClick={() => setConfirmDelete(true)}>
              {tr('Request deletion', 'Solicitar eliminacion')}
            </button>
          </>
        )}
      </div>

      {error && <div className="error-message mt-2">{error}</div>}
    </section>
  );
}
