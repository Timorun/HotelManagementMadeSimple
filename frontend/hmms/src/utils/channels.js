// Display labels for reservation channels. Channel values are stored lowercase
// ("booking.com"), and CSS capitalize would render them as "Booking.Com".
const CHANNEL_LABELS = {
  direct: ['Direct', 'Directo'],
  'booking.com': ['Booking.com', 'Booking.com'],
  airbnb: ['Airbnb', 'Airbnb'],
  expedia: ['Expedia', 'Expedia'],
  website: ['Website', 'Sitio web'],
  phone: ['Phone', 'Telefono'],
  'walk in': ['Walk In', 'Sin reserva'],
  other: ['Other', 'Otro'],
};

// Channels offered in reservation forms and filters, in display order.
export const CHANNEL_OPTIONS = ['direct', 'booking.com', 'airbnb', 'expedia', 'website', 'other'];

/**
 * Human-readable channel label.
 * @param {string} channel - stored channel value
 * @param {(en: string, es: string) => string} [tr] - translator; defaults to English
 */
export function formatChannel(channel, tr = (en) => en) {
  if (!channel) {
    return tr('Other', 'Otro');
  }

  const normalized = String(channel).replaceAll('_', ' ').trim().toLowerCase();
  const labels = CHANNEL_LABELS[normalized];
  if (labels) {
    return tr(labels[0], labels[1]);
  }

  // Unknown channel: capitalize the first letter of each space-separated word only.
  return normalized.replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}
