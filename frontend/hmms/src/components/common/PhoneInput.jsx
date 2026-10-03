import { useState } from 'react';
import { formatPhoneAsYouType, formatPhoneDisplay, isValidPhoneOrEmpty } from '../../utils/phone';
import { useI18n } from '../../context/I18nContext';

/**
 * Phone field that formats while typing and shows whether the number is valid.
 * The backend stores numbers as E.164 so WhatsApp links always work; numbers without
 * a country code are treated as Spanish.
 */
export default function PhoneInput({ value, onChange, className = 'form-input', ...rest }) {
  const { tr } = useI18n();
  const [touched, setTouched] = useState(false);
  const invalid = touched && !isValidPhoneOrEmpty(value);

  return (
    <>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        className={`${className} ${invalid ? 'error' : ''}`}
        value={value || ''}
        onChange={(e) => {
          const next = e.target.value;
          // Only reformat while typing forward, so backspacing over spaces/brackets isn't undone.
          onChange(next.length > String(value || '').length ? formatPhoneAsYouType(next) : next);
        }}
        onBlur={() => {
          setTouched(true);
          if (isValidPhoneOrEmpty(value) && value) {
            onChange(formatPhoneDisplay(value));
          }
        }}
        placeholder="+34 612 34 56 78"
        aria-invalid={invalid}
        {...rest}
      />
      <span className={`field-hint ${invalid ? 'error' : ''}`}>
        {invalid
          ? tr('Not a valid phone number. Add the country code, e.g. +31 6 1234 5678.', 'Numero no valido. Añade el prefijo del pais, p. ej. +31 6 1234 5678.')
          : tr('Without country code, +34 (Spain) is assumed.', 'Sin prefijo se asume +34 (España).')}
      </span>
    </>
  );
}
