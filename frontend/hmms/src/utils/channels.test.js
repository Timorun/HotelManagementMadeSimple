import { describe, expect, it } from 'vitest';
import { formatChannel, isDirectChannel } from './channels';

describe('formatChannel', () => {
  it('keeps Booking.com casing', () => {
    expect(formatChannel('booking.com')).toBe('Booking.com');
    expect(formatChannel('BOOKING.COM')).toBe('Booking.com');
  });

  it('translates known channels', () => {
    const es = (_en, esText) => esText;
    expect(formatChannel('direct', es)).toBe('Directo');
    expect(formatChannel('other', es)).toBe('Otra plataforma');
  });

  it('shows older direct sources as Direct', () => {
    expect(formatChannel('website')).toBe('Direct');
    expect(formatChannel('walk_in')).toBe('Direct');
    expect(formatChannel('Phone')).toBe('Direct');
  });

  it('capitalizes unknown channels per word without touching dots', () => {
    expect(formatChannel('hotels.com')).toBe('Hotels.com');
    expect(formatChannel('travel_agent')).toBe('Travel Agent');
  });

  it('falls back to Other platform for empty values', () => {
    expect(formatChannel('')).toBe('Other platform');
    expect(formatChannel(null)).toBe('Other platform');
  });
});

describe('isDirectChannel', () => {
  it('only treats direct bookings as commission-free', () => {
    expect(isDirectChannel('direct')).toBe(true);
    expect(isDirectChannel('website')).toBe(true);
    expect(isDirectChannel('booking.com')).toBe(false);
    expect(isDirectChannel('other')).toBe(false);
    expect(isDirectChannel(null)).toBe(false);
  });
});
