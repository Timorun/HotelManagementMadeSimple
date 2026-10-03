import { describe, expect, it } from 'vitest';
import { formatChannel } from './channels';

describe('formatChannel', () => {
  it('keeps Booking.com casing', () => {
    expect(formatChannel('booking.com')).toBe('Booking.com');
    expect(formatChannel('BOOKING.COM')).toBe('Booking.com');
  });

  it('translates known channels', () => {
    const es = (_en, esText) => esText;
    expect(formatChannel('direct', es)).toBe('Directo');
    expect(formatChannel('website', es)).toBe('Sitio web');
  });

  it('capitalizes unknown channels per word without touching dots', () => {
    expect(formatChannel('hotels.com')).toBe('Hotels.com');
    expect(formatChannel('travel_agent')).toBe('Travel Agent');
  });

  it('falls back to Other for empty values', () => {
    expect(formatChannel('')).toBe('Other');
    expect(formatChannel(null)).toBe('Other');
  });
});
