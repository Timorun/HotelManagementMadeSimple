import { describe, expect, it, beforeEach } from 'vitest';
import { isIsoDate } from './useSessionState';

describe('isIsoDate', () => {
  beforeEach(() => {});
  it('accepts yyyy-MM-dd only', () => {
    expect(isIsoDate('2026-10-01')).toBe(true);
    expect(isIsoDate('2026-10-1')).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});
