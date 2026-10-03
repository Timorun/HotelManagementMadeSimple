import { describe, expect, it } from 'vitest';
import { Check, Sun } from 'lucide-react';
import { AMENITY_KEYS, amenityIcon, amenityLabel } from './amenities';

const spanish = (_en, es) => es;

describe('amenities', () => {
  it('translates known keys and humanizes unknown ones', () => {
    expect(amenityLabel('private_terrace')).toBe('Private terrace');
    expect(amenityLabel('private_terrace', spanish)).toBe('Terraza privada');
    expect(amenityLabel('sea_view')).toBe('Sea view');
  });

  it('falls back to a check mark icon for unknown keys', () => {
    expect(amenityIcon('private_terrace')).toBe(Sun);
    expect(amenityIcon('sea_view')).toBe(Check);
  });

  it('knows every amenity listed on carmensuites.com', () => {
    const websiteKeys = ['double_bed', 'twin_beds', 'extra_bed', 'patio', 'rooftop_solarium', 'city_view', 'patio_view',
      'accessible', 'elevator', 'kitchen', 'air_conditioning', 'wifi', 'spacious_bathroom', 'no_pets'];
    for (const key of websiteKeys) {
      expect(AMENITY_KEYS).toContain(key);
      expect(amenityIcon(key)).not.toBe(Check);
    }
    expect(amenityLabel('rooftop_solarium', spanish)).toBe('Azotea solárium');
    expect(amenityLabel('no_pets')).toBe('No pets');
  });
});
