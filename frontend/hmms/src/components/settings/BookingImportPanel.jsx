import { useMemo, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { importBookingExport } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';
import { parseBookingExport } from '../../utils/bookingExport';

const UNIT_MAPPING_KEY = 'hmms_booking_unit_mapping';

function loadUnitMapping() {
  try {
    return JSON.parse(localStorage.getItem(UNIT_MAPPING_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Upload a booking.com reservations export to fill in guest details on calendar-imported
 * stays and add stays that aren't in the app yet. Always previews (dry run) first.
 */
export default function BookingImportPanel({ suites }) {
  const { tr } = useI18n();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [missingColumns, setMissingColumns] = useState([]);
  const [unitMapping, setUnitMapping] = useState(loadUnitMapping);
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const unitTypes = useMemo(() => [...new Set(rows.map((row) => row.unitType || ''))], [rows]);
  const activeSuites = suites.filter((suite) => suite.active);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    setPreview(null);
    setDone(null);
    setError(null);
    if (!file) {
      return;
    }
    try {
      const parsed = parseBookingExport(await file.arrayBuffer());
      setFileName(file.name);
      setRows(parsed.rows);
      setMissingColumns(parsed.missing);
      if (parsed.rows.length === 0) {
        setError(tr('No reservations found in this file.', 'No se encontraron reservas en este archivo.'));
      }
    } catch (err) {
      setError(tr(`Could not read the file: ${err.message}`, `No se pudo leer el archivo: ${err.message}`));
    }
  };

  const setSuiteForUnit = (unitType, suiteId) => {
    setUnitMapping((prev) => {
      const next = { ...prev, [unitType]: suiteId ? Number(suiteId) : undefined };
      try {
        localStorage.setItem(UNIT_MAPPING_KEY, JSON.stringify(next));
      } catch {
        // Mapping is remembered for convenience only.
      }
      return next;
    });
    setPreview(null);
  };

  // With a single suite type in the file and a single suite, map automatically.
  const suiteIdFor = (row) => unitMapping[row.unitType || ''] ?? (activeSuites.length === 1 ? activeSuites[0].suiteId : null);

  const run = async (dryRun) => {
    setBusy(true);
    setError(null);
    try {
      const payload = rows.map(({ unitType: _unitType, ...row }, index) => ({ ...row, suiteId: suiteIdFor(rows[index]) }));
      const result = await importBookingExport(payload, dryRun);
      if (dryRun) {
        setPreview(result);
      } else {
        setDone(result);
        setPreview(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const actionLabel = (action) => ({
    UPDATE: tr('Update', 'Actualizar'),
    CREATE: tr('Create', 'Crear'),
    SKIP: tr('Skip', 'Omitir'),
  }[action] || action);

  return (
    <section className="card mb-3">
      <h3 className="section-title"><FileSpreadsheet size={18} /> {tr('Import booking.com reservations', 'Importar reservas de booking.com')}</h3>
      <p className="field-hint">
        {tr(
          'In the extranet go to Reservations, filter the period (e.g. this month) and click Download. Upload the file here: matching stays get the guest name, country, party size and price; new stays are added.',
          'En la extranet ve a Reservas, filtra el periodo (p. ej. este mes) y pulsa Descargar. Sube aqui el archivo: las estancias coincidentes reciben nombre, pais, numero de personas y precio; las nuevas se añaden.',
        )}
      </p>

      <label className="btn btn-outline btn-sm booking-import-file">
        <Upload size={14} /> {fileName || tr('Choose .xls / .xlsx / .csv file', 'Elegir archivo .xls / .xlsx / .csv')}
        <input type="file" accept=".xls,.xlsx,.csv" onChange={handleFile} hidden />
      </label>

      {missingColumns.length > 0 && (
        <div className="error-message">
          {tr(`Columns not found: ${missingColumns.join(', ')}. Is this a booking.com reservations export?`, `Columnas no encontradas: ${missingColumns.join(', ')}. ¿Es una exportacion de reservas de booking.com?`)}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <h4 className="communications-send-title">{tr('Which suite is each unit type?', '¿Que suite es cada tipo de unidad?')}</h4>
          <div className="booking-import-mapping">
            {unitTypes.map((unitType) => (
              <label key={unitType || 'none'} className="booking-import-map-row">
                <span>{unitType || tr('(no unit type in file)', '(sin tipo de unidad en el archivo)')}</span>
                <select className="form-select" value={unitMapping[unitType] ?? ''} onChange={(e) => setSuiteForUnit(unitType, e.target.value)}>
                  <option value="">{activeSuites.length === 1 ? activeSuites[0].suiteName : tr('Choose suite…', 'Elegir suite…')}</option>
                  {activeSuites.map((suite) => <option key={suite.suiteId} value={suite.suiteId}>{suite.suiteName}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="request-actions">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(true)}>
              {tr(`Preview ${rows.length} reservation(s)`, `Previsualizar ${rows.length} reserva(s)`)}
            </button>
            {preview && (
              <button type="button" className="btn btn-accent btn-sm" disabled={busy || preview.updated + preview.created === 0} onClick={() => run(false)}>
                {tr(`Import: ${preview.updated} update(s), ${preview.created} new`, `Importar: ${preview.updated} actualizacion(es), ${preview.created} nueva(s)`)}
              </button>
            )}
          </div>
        </>
      )}

      {error && <div className="error-message">{error}</div>}
      {done && (
        <div className="success-message">
          {tr(`Imported: ${done.updated} updated, ${done.created} created, ${done.skipped} skipped.`, `Importado: ${done.updated} actualizadas, ${done.created} creadas, ${done.skipped} omitidas.`)}
        </div>
      )}

      {preview && (
        <div className="settings-table-wrap">
          <table className="data-table booking-import-preview">
            <thead>
              <tr>
                <th>{tr('Booking no.', 'N.º reserva')}</th>
                <th>{tr('Guest', 'Huesped')}</th>
                <th>{tr('Dates', 'Fechas')}</th>
                <th>{tr('Action', 'Accion')}</th>
                <th>{tr('Details', 'Detalles')}</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((result) => {
                const row = rows[result.index];
                return (
                  <tr key={result.index} className={`import-${result.action.toLowerCase()}`}>
                    <td>{result.bookingNumber || '—'}</td>
                    <td>{row.guestName || row.bookerName || '—'}</td>
                    <td>{row.checkIn} → {row.checkOut}</td>
                    <td><span className={`consent-badge ${result.action === 'SKIP' ? 'no' : 'yes'}`}>{actionLabel(result.action)}</span></td>
                    <td>{result.message}{result.reservationId ? ` (#${result.reservationId})` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
