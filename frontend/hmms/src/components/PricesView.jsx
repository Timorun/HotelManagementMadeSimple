import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, isToday, parseISO, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Euro, Save, Trash2 } from 'lucide-react';
import { fetchRates, fetchSuites, setRates } from '../api/backend';
import { useI18n } from '../context/I18nContext';
import { isIsoDate, useSessionState } from '../hooks/useSessionState';
import { formatEuroShort } from '../utils/money';

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]; // ISO: 1 = Monday ... 7 = Sunday
const isoDate = (date) => format(date, 'yyyy-MM-dd');
const isoWeekday = (date) => ((date.getDay() + 6) % 7) + 1;
const rateKey = (suiteId, date) => `${suiteId}|${date}`;

/**
 * Price per night for each suite and date. Guests see the total of their stay on the booking
 * page; a stay with a night without a price shows "price on request".
 */
export default function PricesView() {
  const { tr, dateLocale, locale } = useI18n();
  const [monthIso, setMonthIso] = useSessionState('prices.month', () => isoDate(startOfMonth(new Date())), isIsoDate);
  const month = useMemo(() => startOfMonth(parseISO(monthIso)), [monthIso]);
  const days = useMemo(() => eachDayOfInterval({ start: month, end: endOfMonth(month) }), [month]);
  const [suites, setSuites] = useState([]);
  const [rates, setRatesByKey] = useState({});
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const formRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [suiteList, rateList] = await Promise.all([
        fetchSuites(),
        fetchRates(isoDate(month), isoDate(endOfMonth(month))),
      ]);
      const activeSuites = (suiteList || []).filter((suite) => suite.active).sort((a, b) => a.suiteName.localeCompare(b.suiteName));
      setSuites(activeSuites);
      setRatesByKey(Object.fromEntries((rateList || []).map((rate) => [rateKey(rate.suiteId, rate.date), rate.price])));
      setForm((current) => current || {
        suiteIds: activeSuites.map((suite) => suite.suiteId),
        from: isoDate(new Date() > month ? new Date() : month),
        to: isoDate(endOfMonth(month)),
        weekdays: ALL_WEEKDAYS,
        price: '',
      });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (field, value) => setForm((prev) => ({
    ...prev,
    [field]: prev[field].includes(value) ? prev[field].filter((item) => item !== value) : [...prev[field], value].sort((a, b) => a - b),
  }));

  const save = async (clear) => {
    setError(null);
    setNotice(null);
    if (!clear && (form.price === '' || !Number.isFinite(Number(form.price)) || Number(form.price) < 0)) {
      setError(tr('Enter the price per night.', 'Introduce el precio por noche.'));
      return;
    }
    if (form.weekdays.length === 0) {
      setError(tr('Choose at least one day of the week.', 'Elige al menos un día de la semana.'));
      return;
    }
    setSaving(true);
    try {
      const result = await setRates({
        suiteIds: form.suiteIds,
        from: form.from,
        to: form.to,
        weekdays: form.weekdays.length === ALL_WEEKDAYS.length ? [] : form.weekdays,
        price: clear ? null : Number(form.price),
      });
      setNotice(clear
        ? tr(`Prices removed for ${result.nights} night(s).`, `Precios eliminados para ${result.nights} noche(s).`)
        : tr(`Price saved for ${result.nights} night(s).`, `Precio guardado para ${result.nights} noche(s).`));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Tapping a cell prepares the form for that suite and date
  const editCell = (suite, day) => {
    const date = isoDate(day);
    const price = rates[rateKey(suite.suiteId, date)];
    setForm((prev) => ({ ...prev, suiteIds: [suite.suiteId], from: date, to: date, weekdays: ALL_WEEKDAYS, price: price ?? '' }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const inSelection = (suiteId, day) => {
    if (!form || !form.suiteIds.includes(suiteId) || !form.from || !form.to) {
      return false;
    }
    const date = isoDate(day);
    return date >= form.from && date <= form.to && form.weekdays.includes(isoWeekday(day));
  };

  // Monday-first weekday names in the page language
  const weekdayNames = useMemo(() => {
    const monday = parseISO('2024-01-01');
    return ALL_WEEKDAYS.map((day) => format(addDays(monday, day - 1), 'EEEEEE', { locale: dateLocale }));
  }, [dateLocale]);

  return (
    <div className="prices-page">
      <div className="card mb-3">
        <div className="card-header">
          <h2><Euro size={28} /> {tr('Prices', 'Precios')}</h2>
        </div>
        <p className="quick-view-subtitle">
          {tr(
            'Price per night for each suite and date. Guests see the total for their stay on the booking page; if a night has no price, they see "price on request".',
            'Precio por noche de cada suite y fecha. Los huéspedes ven el total de su estancia en la página de reservas; si una noche no tiene precio, ven "precio a consultar".',
          )}
        </p>
      </div>

      {error && <div className="error-message mb-3">{error}</div>}
      {notice && <div className="success-message mb-3">{notice}</div>}

      {form && (
        <section className="card mb-3" ref={formRef}>
          <h3 className="section-title">{tr('Set prices', 'Poner precios')}</h3>
          <div className="prices-form">
            <div className="form-group prices-form-full">
              <span className="form-label">{tr('Suites', 'Suites')}</span>
              <div className="chip-toggle-group">
                {suites.map((suite) => (
                  <button
                    key={suite.suiteId}
                    type="button"
                    className={`chip-toggle ${form.suiteIds.includes(suite.suiteId) ? 'on' : ''}`}
                    aria-pressed={form.suiteIds.includes(suite.suiteId)}
                    onClick={() => toggle('suiteIds', suite.suiteId)}
                  >
                    {suite.suiteName}
                  </button>
                ))}
                <button type="button" className="link-button" onClick={() => setForm((prev) => ({ ...prev, suiteIds: suites.map((suite) => suite.suiteId) }))}>
                  {tr('All', 'Todas')}
                </button>
              </div>
            </div>
            <div className="form-group prices-form-full">
              <span className="form-label">{tr('Nights of the week', 'Noches de la semana')}</span>
              <div className="chip-toggle-group">
                {ALL_WEEKDAYS.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    className={`chip-toggle weekday ${form.weekdays.includes(day) ? 'on' : ''}`}
                    aria-pressed={form.weekdays.includes(day)}
                    onClick={() => toggle('weekdays', day)}
                  >
                    {weekdayNames[index]}
                  </button>
                ))}
                <button type="button" className="link-button" onClick={() => setForm((prev) => ({ ...prev, weekdays: ALL_WEEKDAYS }))}>{tr('All', 'Todas')}</button>
                <button type="button" className="link-button" onClick={() => setForm((prev) => ({ ...prev, weekdays: [5, 6] }))}>{tr('Fri + Sat', 'Vie + Sáb')}</button>
              </div>
            </div>
            <label className="form-group">
              <span className="form-label">{tr('From', 'Desde')}</span>
              <input type="date" className="form-input" value={form.from} onChange={(e) => setForm((prev) => ({ ...prev, from: e.target.value }))} />
            </label>
            <label className="form-group">
              <span className="form-label">{tr('To (including)', 'Hasta (incluido)')}</span>
              <input type="date" className="form-input" min={form.from} value={form.to} onChange={(e) => setForm((prev) => ({ ...prev, to: e.target.value }))} />
            </label>
            <label className="form-group">
              <span className="form-label">{tr('Price per night (€)', 'Precio por noche (€)')}</span>
              <input type="number" min="0" step="0.01" inputMode="decimal" className="form-input" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} />
            </label>
            <div className="prices-form-actions">
              <button type="button" className="btn btn-primary" disabled={saving || form.suiteIds.length === 0} onClick={() => save(false)}>
                <Save size={16} /> {tr('Save price', 'Guardar precio')}
              </button>
              <button type="button" className="btn btn-outline" disabled={saving || form.suiteIds.length === 0} onClick={() => save(true)}>
                <Trash2 size={16} /> {tr('Remove prices', 'Quitar precios')}
              </button>
            </div>
          </div>
          <p className="field-hint">
            {tr('Highlighted cells below are the nights this will change. Tap a cell to edit just that night.', 'Las celdas resaltadas abajo son las noches que se cambiarán. Toca una celda para editar solo esa noche.')}
          </p>
        </section>
      )}

      <section className="card">
        <div className="prices-month-nav">
          <button type="button" className="btn btn-primary btn-sm btn-icon" onClick={() => setMonthIso(isoDate(subMonths(month, 1)))} aria-label={tr('Previous month', 'Mes anterior')}>
            <ChevronLeft size={16} />
          </button>
          <h3>{format(month, 'LLLL yyyy', { locale: dateLocale })}</h3>
          <button type="button" className="btn btn-primary btn-sm btn-icon" onClick={() => setMonthIso(isoDate(addMonths(month, 1)))} aria-label={tr('Next month', 'Mes siguiente')}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className={`prices-grid-wrap ${loading ? 'is-loading' : ''}`}>
          <table className="prices-grid">
            <thead>
              <tr>
                <th className="prices-suite-col">{tr('Suite', 'Suite')}</th>
                {days.map((day) => (
                  <th key={day.toISOString()} className={`${isoWeekday(day) >= 6 ? 'weekend' : ''} ${isToday(day) ? 'today' : ''}`}>
                    <span>{format(day, 'EEEEEE', { locale: dateLocale })}</span>
                    {format(day, 'd')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suites.map((suite) => {
                const priced = days.filter((day) => rates[rateKey(suite.suiteId, isoDate(day))] != null).length;
                return (
                  <tr key={suite.suiteId}>
                    <th className="prices-suite-col">
                      {suite.suiteName}
                      <span className={priced < days.length ? 'prices-missing' : ''}>{priced}/{days.length}</span>
                    </th>
                    {days.map((day) => {
                      const price = rates[rateKey(suite.suiteId, isoDate(day))];
                      return (
                        <td key={day.toISOString()} className={`${isoWeekday(day) >= 6 ? 'weekend' : ''} ${inSelection(suite.suiteId, day) ? 'selected' : ''}`}>
                          <button type="button" onClick={() => editCell(suite, day)} title={`${suite.suiteName} · ${format(day, 'EEE d MMM', { locale: dateLocale })}`}>
                            {price != null ? formatEuroShort(price, locale).replace(/\s?€\s?/, '') : '–'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="field-hint mt-2">{tr('Prices in euros per night. "–" means no price yet.', 'Precios en euros por noche. "–" significa sin precio.')}</p>
      </section>
    </div>
  );
}
