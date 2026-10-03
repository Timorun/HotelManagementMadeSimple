import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarSync, Copy, RefreshCw, Save } from 'lucide-react';
import { syncBookingCalendars, updateSuite } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';
import { copyTextToClipboard } from '../../utils/clipboard';

/**
 * Per-suite booking.com calendar sync: the booking.com export URL we read, and our own
 * feed URL that booking.com reads to close dates booked here.
 */
export default function CalendarSyncPanel({ suites, onChanged, onNotice, onError }) {
  const { tr, dateLocale } = useI18n();
  const [urls, setUrls] = useState({});
  const [busy, setBusy] = useState(null);

  const urlFor = (suite) => urls[suite.suiteId] ?? suite.bookingIcalUrl ?? '';

  const saveUrl = async (suite) => {
    setBusy(`save-${suite.suiteId}`);
    try {
      await updateSuite(suite.suiteId, {
        suiteName: suite.suiteName,
        capacity: suite.capacity,
        active: suite.active,
        bookingIcalUrl: urlFor(suite).trim(),
      });
      setUrls((prev) => {
        const next = { ...prev };
        delete next[suite.suiteId];
        return next;
      });
      onNotice(tr(`Calendar URL saved for ${suite.suiteName}.`, `URL del calendario guardada para ${suite.suiteName}.`));
      await onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const describe = (result) => (result.error
    ? `${result.suiteName}: ${result.error}`
    : tr(
      `${result.suiteName}: ${result.created} new, ${result.updated} changed, ${result.cancelled} cancelled${result.conflicts ? `, ${result.conflicts} double booking(s)!` : ''}`,
      `${result.suiteName}: ${result.created} nuevas, ${result.updated} cambiadas, ${result.cancelled} canceladas${result.conflicts ? `, ¡${result.conflicts} doble(s) reserva(s)!` : ''}`,
    ));

  const sync = async (suite) => {
    setBusy(suite ? `sync-${suite.suiteId}` : 'sync-all');
    try {
      const result = await syncBookingCalendars(suite?.suiteId);
      const results = Array.isArray(result) ? result : [result];
      onNotice(results.length
        ? results.map(describe).join(' · ')
        : tr('No suite has a booking.com calendar URL yet.', 'Ninguna suite tiene aun una URL de calendario de booking.com.'));
      await onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text) => {
    const ok = await copyTextToClipboard(text);
    onNotice(ok ? tr('Copied to clipboard.', 'Copiado.') : tr('Could not copy.', 'No se pudo copiar.'));
  };

  return (
    <section className="card mb-3">
      <div className="settings-section-head">
        <h3 className="section-title"><CalendarSync size={18} /> {tr('Booking.com calendar sync', 'Sincronizacion con el calendario de booking.com')}</h3>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => sync(null)} disabled={busy !== null}>
          <RefreshCw size={14} className={busy === 'sync-all' ? 'spin-icon' : ''} /> {tr('Sync all now', 'Sincronizar todo ahora')}
        </button>
      </div>
      <ol className="settings-steps">
        <li>{tr('In the booking.com extranet open Rates & Availability → Sync calendars, and choose "Export calendar" for each room. Paste that link below.', 'En la extranet de booking.com abre Tarifas y disponibilidad → Sincronizar calendarios y elige "Exportar calendario" para cada habitacion. Pega ese enlace abajo.')}</li>
        <li>{tr('Then "Import calendar" on booking.com with this app\'s link for the same suite, so dates booked here are closed there.', 'Despues usa "Importar calendario" en booking.com con el enlace de esta app para la misma suite, asi se cierran alli las fechas reservadas aqui.')}</li>
        <li>{tr('Imported stays appear with a placeholder guest; upload the reservations export below to fill in names and prices. Booking.com refreshes imported calendars every few hours.', 'Las estancias importadas aparecen con un huesped provisional; sube abajo la exportacion de reservas para completar nombres y precios. Booking.com actualiza los calendarios importados cada pocas horas.')}</li>
      </ol>

      <div className="calendar-sync-list">
        {suites.map((suite) => {
          const changed = urlFor(suite) !== (suite.bookingIcalUrl ?? '');
          return (
            <div key={suite.suiteId} className="calendar-sync-row">
              <div className="calendar-sync-name">
                <strong>{suite.suiteName}</strong>
                <span className={`field-hint ${suite.icalLastSyncError ? 'error' : ''}`}>
                  {suite.icalLastSyncError
                    ? tr(`Last sync failed: ${suite.icalLastSyncError}`, `Ultima sincronizacion fallida: ${suite.icalLastSyncError}`)
                    : suite.icalLastSyncAt
                      ? tr(`Synced ${format(parseISO(suite.icalLastSyncAt), 'd MMM HH:mm', { locale: dateLocale })}`, `Sincronizado ${format(parseISO(suite.icalLastSyncAt), 'd MMM HH:mm', { locale: dateLocale })}`)
                      : tr('Not synced yet', 'Aun no sincronizado')}
                </span>
              </div>
              <label className="calendar-sync-field">
                <span className="form-label">{tr('Booking.com export link', 'Enlace de exportacion de booking.com')}</span>
                <div className="calendar-sync-input">
                  <input
                    className="form-input"
                    placeholder="https://admin.booking.com/hotel/hoteladmin/ical.html?t=…"
                    value={urlFor(suite)}
                    onChange={(e) => setUrls((prev) => ({ ...prev, [suite.suiteId]: e.target.value }))}
                  />
                  <button type="button" className="btn btn-primary btn-sm" disabled={!changed || busy !== null} onClick={() => saveUrl(suite)}>
                    <Save size={14} /> {tr('Save', 'Guardar')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm btn-icon"
                    disabled={!suite.bookingIcalUrl || changed || busy !== null}
                    onClick={() => sync(suite)}
                    title={tr('Sync now', 'Sincronizar ahora')}
                    aria-label={tr('Sync now', 'Sincronizar ahora')}
                  >
                    <RefreshCw size={14} className={busy === `sync-${suite.suiteId}` ? 'spin-icon' : ''} />
                  </button>
                </div>
              </label>
              <div className="calendar-sync-field">
                <span className="form-label">{tr('Link for booking.com to import', 'Enlace para importar en booking.com')}</span>
                <div className="calendar-sync-input">
                  <input className="form-input" value={suite.icalExportUrl || ''} readOnly onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => copy(suite.icalExportUrl)} aria-label={tr('Copy', 'Copiar')}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
