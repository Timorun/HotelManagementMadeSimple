import { describe, expect, it } from 'vitest';
import { buildMailtoBatches, hasMarketingConsent, personalize } from './communications';

describe('communications helpers', () => {
  it('personalizes or drops the first name placeholder', () => {
    expect(personalize('Hola {firstName}, ¿qué tal?', 'Ana')).toBe('Hola Ana, ¿qué tal?');
    expect(personalize('Hola {firstName}, ¿qué tal?', null)).toBe('Hola, ¿qué tal?');
  });

  it('treats opted-out guests as not consenting', () => {
    expect(hasMarketingConsent({ marketingConsent: true })).toBe(true);
    expect(hasMarketingConsent({ marketingConsent: true, marketingOptOutAt: '2026-01-01T00:00' })).toBe(false);
    expect(hasMarketingConsent({ marketingConsent: false })).toBe(false);
  });

  it('splits BCC recipients into links under the length limit', () => {
    const bcc = Array.from({ length: 120 }, (_, i) => `guest${i}@example.com`);
    const batches = buildMailtoBatches({ to: 'owner@example.com', bcc, subject: 'News', body: 'Hello' });
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.reduce((sum, batch) => sum + batch.count, 0)).toBe(120);
    batches.forEach((batch) => {
      expect(batch.href.length).toBeLessThanOrEqual(1800);
      expect(batch.href.startsWith('mailto:owner%40example.com?bcc=')).toBe(true);
    });
  });

  it('returns no batches without recipients', () => {
    expect(buildMailtoBatches({ bcc: [] })).toEqual([]);
  });
});
