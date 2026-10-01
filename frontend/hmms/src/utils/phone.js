import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

// Country assumed for numbers typed without a country code (matches the backend default).
export const DEFAULT_PHONE_COUNTRY = 'ES';

function parse(phone) {
  const value = String(phone || '').trim();
  if (!value) {
    return null;
  }
  const withPlus = value.startsWith('00') ? `+${value.slice(2)}` : value;
  return parsePhoneNumberFromString(withPlus, DEFAULT_PHONE_COUNTRY) || null;
}

/** True when the value is empty or a valid phone number. */
export function isValidPhoneOrEmpty(phone) {
  if (!String(phone || '').trim()) {
    return true;
  }
  return Boolean(parse(phone)?.isValid());
}

/** E.164 ("+34612345678") or null when invalid. */
export function toE164(phone) {
  const parsed = parse(phone);
  return parsed?.isValid() ? parsed.number : null;
}

/** "+34 612 34 56 78" for display; falls back to the raw value. */
export function formatPhoneDisplay(phone) {
  const parsed = parse(phone);
  return parsed?.isValid() ? parsed.formatInternational() : String(phone || '');
}

/** Formats as the user types ("612345678" -> "612 34 56 78"). */
export function formatPhoneAsYouType(value) {
  const text = String(value || '');
  // Don't reformat while the user is deleting into separators.
  if (!text || /[^\d+\s()-]/.test(text)) {
    return text;
  }
  return new AsYouType(DEFAULT_PHONE_COUNTRY).input(text);
}

/**
 * WhatsApp click-to-chat link (wa.me expects the full international number, digits only).
 * @param {string} phone
 * @param {string} [text] - optional prefilled message
 */
export function toWhatsAppLink(phone, text) {
  const e164 = toE164(phone);
  if (!e164) {
    return null;
  }
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${e164.slice(1)}${query}`;
}
