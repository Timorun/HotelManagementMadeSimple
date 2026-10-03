import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, CalendarSync, Copy, RefreshCw, Save } from 'lucide-react';
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

  const when = (value) => format(parseISO(value), 'd MMM HH:mm', { locale: dateLocale });
  // booking.com can only download a public https address, not e.g. http://127.0.0.1:8080
  const unreachable = (url) => Boolean(url) && !url.startsWith('https://');

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
        <li>{tr('In the booking.com extranet, open Calendar, choose the room and find the "Sync calendars" box. Each suite needs its own room type on booking.com, with 1 unit.', 'En la extranet de booking.com abre Calendario, elige la habitación y busca el cuadro "Sincronizar calendarios". Cada suite necesita su propio tipo de habitación en booking.com, con 1 unidad.')}</li>
        <li>{tr('Export calendar: copy booking.com\'s link and paste it below as "Booking.com export link" of the same suite. This app reads it every 15 minutes: booking.com stays block those dates here.', 'Exportar calendario: copia el enlace de booking.com y pégalo abajo como "Enlace de exportación de booking.com" de la misma suite. Esta app lo lee cada 15 minutos: las estancias de booking.com bloquean esas fechas aquí.')}</li>
        <li>{tr('Import calendar: paste this app\'s "Link for booking.com to import" of the suite on booking.com. Booking.com reads it about every 2 hours (or at once with its Refresh button) and closes the dates booked here.', 'Importar calendario: pega en booking.com el "Enlace para importar en booking.com" de la suite. Booking.com lo lee más o menos cada 2 horas (o al momento con su botón Actualizar) y cierra las fechas reservadas aquí.')}</li>
        <li>{tr('The links only carry dates. Imported stays get a placeholder guest: upload the reservations export below to fill in names and prices.', 'Los enlaces solo llevan fechas. Las estancias importadas tienen un huésped provisional: sube abajo la exportación de reservas para completar nombres y precios.')}</li>
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
                      ? tr(`Read from booking.com ${when(suite.icalLastSyncAt)}`, `Leído de booking.com ${when(suite.icalLastSyncAt)}`)
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
                {unreachable(suite.icalExportUrl) ? (
                  <span className="field-hint error calendar-sync-warning">
                    <AlertTriangle size={13} />
                    {tr('Booking.com can\'t reach this address: it must start with https:// and your API\'s domain. On the server, nginx has to pass the Host and X-Forwarded-Proto headers.', 'Booking.com no puede llegar a esta dirección: debe empezar por https:// y el dominio de tu API. En el servidor, nginx tiene que pasar las cabeceras Host y X-Forwarded-Proto.')}
                  </span>
                ) : (
                  <span className="field-hint">
                    {suite.icalExportReadAt
                      ? tr(`Booking.com last read this calendar ${when(suite.icalExportReadAt)}`, `Booking.com leyó este calendario por última vez ${when(suite.icalExportReadAt)}`)
                      : tr('Booking.com hasn\'t read this calendar yet', 'Booking.com aún no ha leído este calendario')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
