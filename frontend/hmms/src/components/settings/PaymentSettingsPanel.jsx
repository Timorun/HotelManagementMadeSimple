import { useEffect, useState } from 'react';
import { Landmark, Save, Smartphone } from 'lucide-react';
import { fetchPaymentSettings, updatePaymentSettings } from '../../api/backend';
import { useI18n } from '../../context/I18nContext';

const EMPTY = { iban: '', accountHolder: '', bizumPhone: '', deadlineDays: 3 };

/** "ES9121000418450200051332" -> "ES91 2100 0418 4502 0005 1332" */
const groupIban = (iban) => (iban || '').replace(/(.{4})(?!$)/g, '$1 ');

/**
 * How guests pay after a booking request is accepted: bank transfer and/or Bizum, and how many
 * days they get. Included in the email sent when accepting a request.
 */
export default function PaymentSettingsPanel({ onNotice }) {
  const { tr } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPaymentSettings()
      .then((settings) => setForm({
        iban: groupIban(settings?.iban),
        accountHolder: settings?.accountHolder || '',
        bizumPhone: settings?.bizumPhone || '',
        deadlineDays: settings?.deadlineDays ?? 3,
      }))
      .catch((err) => setError(err.message));
  }, []);

  const setField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await updatePaymentSettings({
        iban: form.iban,
        accountHolder: form.accountHolder,
        bizumPhone: form.bizumPhone,
        deadlineDays: form.deadlineDays === '' ? null : Number(form.deadlineDays),
      });
      setForm({
        iban: groupIban(saved.iban),
        accountHolder: saved.accountHolder || '',
        bizumPhone: saved.bizumPhone || '',
        deadlineDays: saved.deadlineDays,
      });
      onNotice(tr('Payment details saved.', 'Datos de pago guardados.'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card mb-3">
      <h3 className="section-title"><Landmark size={18} /> {tr('Payments', 'Pagos')}</h3>
      <p className="field-hint mb-2">
        {tr(
          'When you accept a booking request, the guest gets an email with the total and these payment details. Fill in at least one way to pay.',
          'Al aceptar una solicitud, el huésped recibe un correo con el total y estos datos de pago. Rellena al menos una forma de pago.',
        )}
      </p>
      <form className="payment-settings" onSubmit={save}>
        <label className="form-group">
          <span className="form-label"><Landmark size={14} /> {tr('IBAN (bank transfer)', 'IBAN (transferencia)')}</span>
          <input className="form-input" value={form.iban} onChange={setField('iban')} placeholder="ES91 2100 0418 4502 0005 1332" autoComplete="off" />
        </label>
        <label className="form-group">
          <span className="form-label">{tr('Account holder', 'Titular de la cuenta')}</span>
          <input className="form-input" value={form.accountHolder} onChange={setField('accountHolder')} placeholder="Carmen Suites SL" />
        </label>
        <label className="form-group">
          <span className="form-label"><Smartphone size={14} /> {tr('Bizum phone number', 'Teléfono de Bizum')}</span>
          <input type="tel" className="form-input" value={form.bizumPhone} onChange={setField('bizumPhone')} placeholder="+34 612 345 678" />
        </label>
        <label className="form-group">
          <span className="form-label">{tr('Days to pay after accepting', 'Días para pagar tras aceptar')}</span>
          <input type="number" min={1} max={30} className="form-input" value={form.deadlineDays} onChange={setField('deadlineDays')} />
          <span className="field-hint">{tr('Never later than the day of arrival.', 'Nunca después del día de llegada.')}</span>
        </label>
        <div className="payment-settings-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {tr('Save payment details', 'Guardar datos de pago')}
          </button>
        </div>
      </form>
      {error && <div className="error-message">{error}</div>}
    </section>
  );
}
