// Helpers for the Communications page.

// Keep generated mailto: links comfortably below URL limits of common mail apps (~2000 chars).
export const MAX_MAILTO_LENGTH = 1800;

/** Consent = opted in and not opted out since. */
export function hasMarketingConsent(guest) {
  return Boolean(guest?.marketingConsent) && !guest?.marketingOptOutAt;
}

/**
 * Replaces {firstName}. Without a name (group email) the placeholder and the
 * space or comma glued to it are dropped: "Hola {firstName}," -> "Hola,".
 */
export function personalize(text, firstName) {
  const value = String(text || '');
  if (firstName) {
    return value.replaceAll('{firstName}', firstName);
  }
  return value.replace(/\s*\{firstName\}/g, '');
}

function buildMailto(to, bcc, subject, body) {
  const params = [];
  if (bcc.length) params.push(`bcc=${encodeURIComponent(bcc.join(','))}`);
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${encodeURIComponent(to || '')}${params.length ? `?${params.join('&')}` : ''}`;
}

/**
 * Splits BCC recipients over several mailto: links so each stays under MAX_MAILTO_LENGTH.
 * @returns {{href: string, count: number}[]}
 */
export function buildMailtoBatches({ to = '', bcc = [], subject = '', body = '' }, maxLength = MAX_MAILTO_LENGTH) {
  if (!bcc.length) {
    return [];
  }

  const batches = [];
  let current = [];
  bcc.forEach((address) => {
    const candidate = [...current, address];
    if (current.length > 0 && buildMailto(to, candidate, subject, body).length > maxLength) {
      batches.push(current);
      current = [address];
    } else {
      current = candidate;
    }
  });
  if (current.length) {
    batches.push(current);
  }

  return batches.map((addresses) => ({ href: buildMailto(to, addresses, subject, body), count: addresses.length }));
}

/**
 * Asks for confirmation before contacting a guest who has not given (or withdrew)
 * marketing consent. Messages about their own stay are fine; promotions are not.
 * @returns {boolean} true when it's OK to continue
 */
export function confirmContactWithoutConsent(guest, name, tr) {
  if (hasMarketingConsent(guest)) {
    return true;
  }
  const reason = guest?.marketingOptOutAt
    ? tr(`${name} has opted out of marketing.`, `${name} se ha dado de baja del marketing.`)
    : tr(`${name} has not given marketing consent.`, `${name} no ha dado su consentimiento de marketing.`);
  return window.confirm(`${reason}\n\n${tr(
    'Only contact them about their stay, not for promotions. Continue?',
    'Contactale solo sobre su estancia, no con promociones. ¿Continuar?',
  )}`);
}
