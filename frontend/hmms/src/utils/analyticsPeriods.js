import { endOfMonth, endOfYear, format, startOfMonth, startOfYear, subMonths, subYears } from 'date-fns';

const iso = (date) => format(date, 'yyyy-MM-dd');

// Periods offered on the Analytics page; each is compared with the same dates last year
export const PERIOD_PRESETS = ['this-month', 'last-month', 'year-to-date', 'last-year', 'last-12-months'];
export const DEFAULT_PRESET = 'year-to-date';

/** {from, to} (yyyy-MM-dd, inclusive) of a preset period. */
export function presetRange(preset, today = new Date()) {
  switch (preset) {
    case 'this-month':
      return { from: iso(startOfMonth(today)), to: iso(endOfMonth(today)) };
    case 'last-month': {
      const month = subMonths(today, 1);
      return { from: iso(startOfMonth(month)), to: iso(endOfMonth(month)) };
    }
    case 'last-year': {
      const year = subYears(today, 1);
      return { from: iso(startOfYear(year)), to: iso(endOfYear(year)) };
    }
    case 'last-12-months':
      return { from: iso(startOfMonth(subMonths(today, 11))), to: iso(endOfMonth(today)) };
    case 'year-to-date':
    default:
      return { from: iso(startOfYear(today)), to: iso(today) };
  }
}

export function presetLabel(preset, tr) {
  return {
    'this-month': tr('This month', 'Este mes'),
    'last-month': tr('Last month', 'Mes pasado'),
    'year-to-date': tr('This year so far', 'Este año hasta hoy'),
    'last-year': tr('Last year', 'Año pasado'),
    'last-12-months': tr('Last 12 months', 'Últimos 12 meses'),
  }[preset];
}
