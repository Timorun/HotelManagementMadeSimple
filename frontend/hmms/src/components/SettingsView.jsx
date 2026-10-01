import { useCallback, useEffect, useState } from 'react';
import { Copy, ExternalLink, Home, Plus, Save, Settings } from 'lucide-react';
import { createSuite, fetchSettings, fetchSuites, updateSuite } from '../api/backend';
import { useI18n } from '../context/I18nContext';
import { copyTextToClipboard } from '../utils/clipboard';
import BookingImportPanel from './settings/BookingImportPanel';
import CalendarSyncPanel from './settings/CalendarSyncPanel';

const EMPTY_SUITE = { suiteName: '', capacity: 2, active: true };

/**
 * Hotel settings: suites (rooms) and read-only configuration such as mail and public links.
 */
export default function SettingsView() {
  const { tr } = useI18n();
  const [settings, setSettings] = useState(null);
  const [suites, setSuites] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newSuite, setNewSuite] = useState(EMPTY_SUITE);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [settingsData, suiteList] = await Promise.all([fetchSettings(), fetchSuites()]);
      setSettings(settingsData);
      setSuites([...(suiteList || [])].sort((a, b) => a.suiteName.localeCompare(b.suiteName)));
      setDrafts({});
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const draftFor = (suite) => drafts[suite.suiteId] || suite;
  const setDraftField = (suite, field, value) => {
    setDrafts((prev) => ({ ...prev, [suite.suiteId]: { ...draftFor(suite), [field]: value } }));
  };

  const saveSuite = async (suite) => {
    const draft = draftFor(suite);
    setSavingId(suite.suiteId);
    setNotice(null);
    try {
      await updateSuite(suite.suiteId, {
        suiteName: draft.suiteName.trim(),
        capacity: Number(draft.capacity),
        active: Boolean(draft.active),
      });
      setNotice(tr(`${draft.suiteName} saved.`, `${draft.suiteName} guardada.`));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const addSuite = async (event) => {
    event.preventDefault();
    setSavingId('new');
    try {
      await createSuite({ ...newSuite, suiteName: newSuite.suiteName.trim(), capacity: Number(newSuite.capacity) });
      setNewSuite(EMPTY_SUITE);
      setNotice(tr('Suite added.', 'Suite añadida.'));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const copy = async (text) => {
    const ok = await copyTextToClipboard(text);
    setNotice(ok ? tr('Copied to clipboard.', 'Copiado.') : tr('Could not copy.', 'No se pudo copiar.'));
  };

  return (
    <div className="settings-page">
      <div className="card mb-3">
        <div className="card-header">
          <h2><Settings size={28} /> {tr('Settings', 'Ajustes')}</h2>
        </div>
      </div>

      {error && <div className="error-message mb-3">{error}</div>}
      {notice && <div className="success-message mb-3">{notice}</div>}

      <section className="card mb-3">
        <h3 className="section-title"><Home size={18} /> {tr('Suites', 'Suites')}</h3>
        <div className="settings-table-wrap">
          <table className="data-table settings-suites">
            <thead>
              <tr>
                <th>{tr('Name', 'Nombre')}</th>
                <th>{tr('Capacity', 'Capacidad')}</th>
                <th>{tr('Active', 'Activa')}</th>
                <th aria-label={tr('Actions', 'Acciones')} />
              </tr>
            </thead>
            <tbody>
              {suites.map((suite) => {
                const draft = draftFor(suite);
                const changed = Boolean(drafts[suite.suiteId]);
                return (
                  <tr key={suite.suiteId}>
                    <td><input className="form-input" value={draft.suiteName} onChange={(e) => setDraftField(suite, 'suiteName', e.target.value)} /></td>
                    <td><input type="number" min={1} max={20} className="form-input settings-capacity" value={draft.capacity} onChange={(e) => setDraftField(suite, 'capacity', e.target.value)} /></td>
                    <td><input type="checkbox" checked={Boolean(draft.active)} onChange={(e) => setDraftField(suite, 'active', e.target.checked)} aria-label={tr('Active', 'Activa')} /></td>
                    <td>
                      <button type="button" className="btn btn-primary btn-sm" disabled={!changed || savingId === suite.suiteId} onClick={() => saveSuite(suite)}>
                        <Save size={14} /> {tr('Save', 'Guardar')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <form className="settings-add-suite" onSubmit={addSuite}>
          <input className="form-input" placeholder={tr('New suite name', 'Nombre de la nueva suite')} value={newSuite.suiteName} onChange={(e) => setNewSuite((prev) => ({ ...prev, suiteName: e.target.value }))} required />
          <input type="number" min={1} max={20} className="form-input settings-capacity" value={newSuite.capacity} onChange={(e) => setNewSuite((prev) => ({ ...prev, capacity: e.target.value }))} aria-label={tr('Capacity', 'Capacidad')} required />
          <button type="submit" className="btn btn-accent btn-sm" disabled={savingId === 'new'}><Plus size={14} /> {tr('Add suite', 'Añadir suite')}</button>
        </form>
        <p className="field-hint">{tr('Inactive suites are hidden from the calendar and the public booking page.', 'Las suites inactivas no aparecen en el calendario ni en la pagina publica de reservas.')}</p>
      </section>

      <CalendarSyncPanel suites={suites} onChanged={load} onNotice={setNotice} onError={setError} />
      <BookingImportPanel suites={suites} />

      {settings && (
        <section className="card mb-3">
          <h3 className="section-title">{tr('Hotel & email', 'Hotel y correo')}</h3>
          <dl className="settings-info">
            <dt>{tr('Hotel name', 'Nombre del hotel')}</dt><dd>{settings.hotelName}</dd>
            <dt>{tr('Owner email (new requests)', 'Correo del propietario (nuevas solicitudes)')}</dt><dd>{settings.ownerEmail || <em>{tr('not set', 'sin configurar')}</em>}</dd>
            <dt>{tr('Outgoing email', 'Correo saliente')}</dt>
            <dd>
              {settings.mailEnabled
                ? tr(`Enabled, sent from ${settings.mailFrom}`, `Activado, enviado desde ${settings.mailFrom}`)
                : tr('Disabled: emails are only written to the server log', 'Desactivado: los correos solo se escriben en el log del servidor')}
            </dd>
            <dt>{tr('Default phone country', 'Pais por defecto del telefono')}</dt><dd>{settings.defaultPhoneRegion}</dd>
            <dt>{tr('Public booking page', 'Pagina publica de reservas')}</dt>
            <dd className="settings-link">
              <a href={settings.bookingPageUrl} target="_blank" rel="noreferrer">{settings.bookingPageUrl} <ExternalLink size={12} /></a>
              <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => copy(settings.bookingPageUrl)} aria-label={tr('Copy', 'Copiar')}><Copy size={14} /></button>
            </dd>
            <dt>{tr('Guest preferences page', 'Pagina de preferencias del huesped')}</dt>
            <dd className="settings-link">
              <a href={settings.preferencesPageUrl} target="_blank" rel="noreferrer">{settings.preferencesPageUrl} <ExternalLink size={12} /></a>
            </dd>
          </dl>
          <p className="field-hint">
            {tr('These values come from the server configuration (environment variables, see backend/hmms/.env.example).', 'Estos valores vienen de la configuracion del servidor (variables de entorno, ver backend/hmms/.env.example).')}
          </p>
        </section>
      )}
    </div>
  );
}
