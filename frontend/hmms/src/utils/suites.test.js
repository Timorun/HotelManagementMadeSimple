import { describe, expect, it } from 'vitest';
import { isValidPhotoUrl, suiteDescription } from './suites';

describe('suites', () => {
  it('picks the description in the page language with fallback', () => {
    const suite = { descriptionEn: 'Bright', descriptionEs: 'Luminosa' };
    expect(suiteDescription(suite, 'es')).toBe('Luminosa');
    expect(suiteDescription(suite, 'en')).toBe('Bright');
    expect(suiteDescription({ descriptionEn: 'Only English' }, 'es')).toBe('Only English');
    expect(suiteDescription(null, 'en')).toBe('');
  });

  it('accepts only app paths and https photo links', () => {
    expect(isValidPhotoUrl('/suites/patio/01.webp')).toBe(true);
    expect(isValidPhotoUrl('https://carmensuites.com/a.jpg')).toBe(true);
    expect(isValidPhotoUrl('http://carmensuites.com/a.jpg')).toBe(false);
    expect(isValidPhotoUrl('//evil.example/a.jpg')).toBe(false);
    expect(isValidPhotoUrl('javascript:alert(1)')).toBe(false);
    expect(isValidPhotoUrl('/suites/a b.webp')).toBe(false);
    expect(isValidPhotoUrl(`/${'a'.repeat(500)}`)).toBe(false);
  });
});
