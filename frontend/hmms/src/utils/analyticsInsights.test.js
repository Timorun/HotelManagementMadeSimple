import { describe, expect, it } from 'vitest';
import { buildInsights } from './analyticsInsights';

const en = (text) => text;
const es = (_en, text) => text;
const names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const fmt = (tr = en) => ({
  tr,
  money: (amount) => `€${Math.round(amount)}`,
  weekdayName: (day) => names[day],
  monthName: (month) => month,
  today: '2026-10-03',
});

const totals = (overrides) => ({
  revenue: 0, commission: 0, revenueAfterCommission: 0, nightsSold: 0, nightsAvailable: 100, occupancy: 0,
  averageNightlyRate: 0, bookings: 0, directNights: 0, directRevenue: 0, platformNights: 0, platformRevenue: 0,
  ...overrides,
});

const weekday = (day, nightsSold) => ({ weekday: day, nightsSold, nightsAvailable: 20, previousNightsSold: 0, previousNightsAvailable: 20 });
const month = (name, nightsSold) => ({ month: name, nightsSold, nightsAvailable: 150, revenue: 0, directNights: 0 });

const overview = {
  year: 2026,
  current: totals({
    nightsSold: 60, occupancy: 60, directNights: 21, directRevenue: 2100, platformNights: 39, platformRevenue: 5000, commission: 750,
  }),
  previous: totals({ nightsSold: 50, occupancy: 50, directNights: 10 }),
  weekdays: [weekday(1, 4), weekday(2, 6), weekday(3, 6), weekday(4, 8), weekday(5, 18), weekday(6, 19), weekday(7, 9)],
  months: [month('2026-01', 30), month('2026-02', 20), month('2026-03', 90), month('2026-11', 5)],
};

const outlook = {
  next30: { days: 30, nightsAvailable: 150, nightsBooked: 90, nightsAwaitingPayment: 6, revenue: 9000 },
  suites: [{
    suiteId: 1,
    nights: [
      { date: '2026-10-09', state: 'empty' }, // Friday
      { date: '2026-10-10', state: 'direct' }, // Saturday, booked
      { date: '2026-10-12', state: 'empty' }, // Monday
      { date: '2026-10-17', state: 'empty' }, // Saturday
    ],
  }],
};

describe('buildInsights', () => {
  it('leads with occupancy, direct bookings and commission against last year', () => {
    const insights = buildInsights(overview, outlook, fmt());
    expect(insights[0]).toBe('Occupancy 60%, up 10 points on last year (50%).');
    expect(insights[1]).toBe('Direct bookings: 35% of the nights sold (last year 20%).');
    expect(insights[2]).toBe('Platforms kept €750 in commission, 15% of what they brought in. Through a platform, your direct bookings would have cost about €315 more.');
  });

  it('names the strongest and weakest nights and the empty weekend nights ahead', () => {
    const insights = buildInsights(overview, outlook, fmt());
    expect(insights[3]).toBe('Saturday nights are 95% full, Monday nights 20%.');
    expect(insights[4]).toBe('Next 30 days: 60% booked, 54 empty nights. 2 of the empty nights in the next two weeks are Friday or Saturday nights.');
    expect(insights).toHaveLength(5);
  });

  it('speaks Spanish', () => {
    const insights = buildInsights(overview, null, fmt(es));
    expect(insights[0]).toBe('Ocupación del 60%, sube 10 puntos respecto al año pasado (50%).');
    expect(insights[1]).toBe('Reservas directas: 35% de las noches vendidas (el año pasado 20%).');
  });

  it('only counts months that have started for the best and weakest month', () => {
    const quiet = { ...overview, current: totals({ nightsSold: 60, occupancy: 60, directNights: 60 }), weekdays: [] };
    const insights = buildInsights(quiet, null, fmt());
    expect(insights.at(-1)).toBe('Best month of 2026 so far: 2026-03 (60%); weakest: 2026-02 (13%).');
  });

  it('says so when nothing was sold', () => {
    const empty = { ...overview, current: totals({}), previous: totals({}), weekdays: [], months: [] };
    expect(buildInsights(empty, null, fmt())).toEqual(['No nights sold in this period yet.']);
  });
});
