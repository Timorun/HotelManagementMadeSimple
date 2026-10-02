import { describe, expect, it } from 'vitest';
import { Check, Sun } from 'lucide-react';
import { amenityIcon, amenityLabel } from './amenities';

describe('amenities', () => {
  it('translates known keys and humanizes unknown ones', () => {
    expect(amenityLabel('private_terrace')).toBe('Private terrace');
    expect(amenityLabel('private_terrace', (_en, es) => es)).toBe('Terraza privada');
    expect(amenityLabel('sea_view')).toBe('Sea view');
  });

  it('falls back to a check mark icon for unknown keys', () => {
    expect(amenityIcon('private_terrace')).toBe(Sun);
    expect(amenityIcon('sea_view')).toBe(Check);
  });
});
