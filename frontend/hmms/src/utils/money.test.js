import { describe, expect, it } from 'vitest';
import { formatEuro, formatEuroShort } from './money';

describe('money', () => {
  it('formats euros in the page language', () => {
    expect(formatEuro(405, 'en-US')).toBe('€405.00');
    expect(formatEuro('1234.5', 'es-ES').replace(/\s/g, ' ')).toBe('1234,50 €');
    expect(formatEuro(null)).toBe('');
    expect(formatEuro('abc')).toBe('');
  });

  it('drops cents for whole amounts', () => {
    expect(formatEuroShort(405, 'en-US')).toBe('€405');
    expect(formatEuroShort(140.5, 'en-US')).toBe('€140.50');
  });
});
