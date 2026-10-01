import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay, isValidPhoneOrEmpty, toE164, toWhatsAppLink } from './phone';

describe('phone utils', () => {
  it('normalizes local Spanish and international numbers to E.164', () => {
    expect(toE164('612 34 56 78')).toBe('+34612345678');
    expect(toE164('0031 6 12345678')).toBe('+31612345678');
    expect(toE164('+44 7911 123456')).toBe('+447911123456');
    expect(toE164('12')).toBeNull();
  });

  it('builds wa.me links with country code and no plus', () => {
    expect(toWhatsAppLink('+31 6 1234 5678')).toBe('https://wa.me/31612345678');
    expect(toWhatsAppLink('612345678', 'Hola María')).toBe('https://wa.me/34612345678?text=Hola%20Mar%C3%ADa');
    expect(toWhatsAppLink('')).toBeNull();
  });

  it('formats for display and validates', () => {
    expect(formatPhoneDisplay('+34612345678')).toBe('+34 612 34 56 78');
    expect(isValidPhoneOrEmpty('')).toBe(true);
    expect(isValidPhoneOrEmpty('abc')).toBe(false);
  });
});
