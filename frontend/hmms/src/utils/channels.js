// Booking channels. What matters is whether a booking came direct (no commission) or through an
// outside platform. Channel values are stored lowercase ("booking.com"); CSS capitalize would
// render them as "Booking.Com".
const CHANNEL_LABELS = {
  direct: ['Direct', 'Directo'],
  'booking.com': ['Booking.com', 'Booking.com'],
  airbnb: ['Airbnb', 'Airbnb'],
  expedia: ['Expedia', 'Expedia'],
  other: ['Other platform', 'Otra plataforma'],
};

// Older direct sources, stored before they were merged into "direct"
const DIRECT_ALIASES = ['website', 'phone', 'walk in', 'email'];

// Channels offered in reservation forms and filters, in display order.
export const CHANNEL_OPTIONS = ['direct', 'booking.com', 'airbnb', 'expedia', 'other'];

function normalize(channel) {
  const value = String(channel || '').replaceAll('_', ' ').replaceAll('-', ' ').trim().toLowerCase();
  return DIRECT_ALIASES.includes(value) ? 'direct' : value;
}

/** True for bookings without platform commission. */
export function isDirectChannel(channel) {
  return normalize(channel) === 'direct';
}

/**
 * Human-readable channel label.
 * @param {string} channel - stored channel value
 * @param {(en: string, es: string) => string} [tr] - translator; defaults to English
 */
export function formatChannel(channel, tr = (en) => en) {
  if (!channel) {
    return tr('Other platform', 'Otra plataforma');
  }

  const normalized = normalize(channel);
  const labels = CHANNEL_LABELS[normalized];
  if (labels) {
    return tr(labels[0], labels[1]);
  }

  // Unknown channel: capitalize the first letter of each space-separated word only.
  return normalized.replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}
