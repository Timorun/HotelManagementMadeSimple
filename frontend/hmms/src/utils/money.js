// Euro amounts in the page language: "€405.00" (en) or "405,00 €" (es).

export function formatEuro(value, locale = 'en-US', { decimals = 2 } = {}) {
  const amount = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(amount)) {
    return '';
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Whole euros when there are no cents, e.g. "€405" but "€405.50". */
export function formatEuroShort(value, locale = 'en-US') {
  const amount = Number(value);
  return formatEuro(value, locale, { decimals: Number.isInteger(amount) ? 0 : 2 });
}
