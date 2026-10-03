import { describe, expect, it } from 'vitest';
import { presetRange } from './analyticsPeriods';

const TODAY = new Date(2026, 9, 3); // 3 Oct 2026

describe('presetRange', () => {
  it('covers whole calendar months and years', () => {
    expect(presetRange('this-month', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(presetRange('last-month', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetRange('last-year', TODAY)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(presetRange('last-12-months', TODAY)).toEqual({ from: '2025-11-01', to: '2026-10-31' });
  });

  it('runs the current year up to today, so it compares fairly with last year', () => {
    expect(presetRange('year-to-date', TODAY)).toEqual({ from: '2026-01-01', to: '2026-10-03' });
    expect(presetRange('unknown', TODAY)).toEqual({ from: '2026-01-01', to: '2026-10-03' });
  });
});
