// Plain-language sentences about the Analytics numbers, most useful first.

const MAX_INSIGHTS = 5;
const round = (value) => Math.round(Number(value) || 0);
const share = (part, whole) => (whole > 0 ? (part * 100) / whole : null);

/**
 * @param {object} overview - GET /api/analytics/overview
 * @param {object|null} outlook - GET /api/analytics/outlook (may still be loading)
 * @param {object} fmt
 * @param {(en: string, es: string) => string} fmt.tr - translator
 * @param {(amount: number) => string} fmt.money - whole euros, e.g. "€1,260"
 * @param {(isoWeekday: number) => string} fmt.weekdayName - 1 = Monday ... 7 = Sunday
 * @param {(month: string) => string} fmt.monthName - "2026-03" -> "March"
 * @param {string} fmt.today - yyyy-MM-dd
 * @returns {string[]}
 */
export function buildInsights(overview, outlook, { tr, money, weekdayName, monthName, today }) {
  if (!overview) {
    return [];
  }
  const insights = [];
  const { current, previous } = overview;

  // Occupancy, against last year when there is something to compare with
  if (current.nightsSold === 0) {
    insights.push(tr('No nights sold in this period yet.', 'Aún no hay noches vendidas en este periodo.'));
  } else if (previous.nightsSold > 0) {
    const delta = round(current.occupancy - previous.occupancy);
    insights.push(delta === 0
      ? tr(`Occupancy ${round(current.occupancy)}%, the same as last year.`, `Ocupación del ${round(current.occupancy)}%, igual que el año pasado.`)
      : tr(
        `Occupancy ${round(current.occupancy)}%, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} points on last year (${round(previous.occupancy)}%).`,
        `Ocupación del ${round(current.occupancy)}%, ${delta > 0 ? 'sube' : 'baja'} ${Math.abs(delta)} puntos respecto al año pasado (${round(previous.occupancy)}%).`,
      ));
  } else {
    insights.push(tr(
      `Occupancy ${round(current.occupancy)}%: ${current.nightsSold} of ${current.nightsAvailable} nights sold.`,
      `Ocupación del ${round(current.occupancy)}%: ${current.nightsSold} de ${current.nightsAvailable} noches vendidas.`,
    ));
  }

  // Direct bookings: the ones without commission
  if (current.nightsSold > 0) {
    const direct = round(share(current.directNights, current.nightsSold));
    const before = previous.nightsSold > 0 ? round(share(previous.directNights, previous.nightsSold)) : null;
    insights.push(before === null
      ? tr(`Direct bookings: ${direct}% of the nights sold.`, `Reservas directas: ${direct}% de las noches vendidas.`)
      : tr(
        `Direct bookings: ${direct}% of the nights sold (last year ${before}%).`,
        `Reservas directas: ${direct}% de las noches vendidas (el año pasado ${before}%).`,
      ));
  }

  // What the platforms kept, and what direct bookings saved
  const commission = Number(current.commission) || 0;
  const platformRevenue = Number(current.platformRevenue) || 0;
  if (commission > 0 && platformRevenue > 0) {
    const rate = commission / platformRevenue;
    const directRevenue = Number(current.directRevenue) || 0;
    let sentence = tr(
      `Platforms kept ${money(commission)} in commission, ${round(rate * 100)}% of what they brought in.`,
      `Las plataformas se quedaron ${money(commission)} de comisión, el ${round(rate * 100)}% de lo que trajeron.`,
    );
    if (directRevenue > 0) {
      sentence += ' ' + tr(
        `Through a platform, your direct bookings would have cost about ${money(directRevenue * rate)} more.`,
        `A través de una plataforma, tus reservas directas te habrían costado unos ${money(directRevenue * rate)} más.`,
      );
    }
    insights.push(sentence);
  }

  // Strongest and weakest night of the week
  const weekdays = (overview.weekdays || []).filter((day) => day.nightsAvailable > 0);
  if (current.nightsSold >= 10 && weekdays.length === 7) {
    const occupancyOf = (day) => (day.nightsSold * 100) / day.nightsAvailable;
    const sorted = [...weekdays].sort((a, b) => occupancyOf(b) - occupancyOf(a));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (occupancyOf(best) - occupancyOf(worst) >= 15) {
      insights.push(tr(
        `${weekdayName(best.weekday)} nights are ${round(occupancyOf(best))}% full, ${weekdayName(worst.weekday)} nights ${round(occupancyOf(worst))}%.`,
        `Las noches de ${weekdayName(best.weekday)} están ocupadas al ${round(occupancyOf(best))}%, las de ${weekdayName(worst.weekday)} al ${round(occupancyOf(worst))}%.`,
      ));
    }
  }

  // The coming weeks
  if (outlook?.next30) {
    const window = outlook.next30;
    const empty = window.nightsAvailable - window.nightsBooked - window.nightsAwaitingPayment;
    const booked = round(share(window.nightsBooked, window.nightsAvailable));
    let sentence = tr(
      `Next 30 days: ${booked}% booked, ${empty} empty nights.`,
      `Próximos 30 días: ${booked}% reservado, ${empty} noches libres.`,
    );
    const emptyWeekendNights = (outlook.suites || [])
      .flatMap((suite) => suite.nights)
      .filter((night) => night.state === 'empty' && [5, 6].includes(isoWeekday(night.date)))
      .length;
    if (emptyWeekendNights > 0) {
      sentence += ' ' + tr(
        `${emptyWeekendNights} of the empty nights in the next two weeks are Friday or Saturday nights.`,
        `${emptyWeekendNights} de las noches libres de las próximas dos semanas son de viernes o sábado.`,
      );
    }
    insights.push(sentence);
  }

  // Best and weakest month of the year, counting months that have started
  const months = (overview.months || []).filter((month) => month.nightsAvailable > 0 && `${month.month}-01` <= today);
  if (months.filter((month) => month.nightsSold > 0).length >= 3) {
    const occupancyOf = (month) => (month.nightsSold * 100) / month.nightsAvailable;
    const sorted = [...months].sort((a, b) => occupancyOf(b) - occupancyOf(a));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const soFar = today.startsWith(String(overview.year));
    insights.push(tr(
      `Best month of ${overview.year}${soFar ? ' so far' : ''}: ${monthName(best.month)} (${round(occupancyOf(best))}%); weakest: ${monthName(worst.month)} (${round(occupancyOf(worst))}%).`,
      `Mejor mes de ${overview.year}${soFar ? ' hasta ahora' : ''}: ${monthName(best.month)} (${round(occupancyOf(best))}%); el más flojo: ${monthName(worst.month)} (${round(occupancyOf(worst))}%).`,
    ));
  }

  return insights.slice(0, MAX_INSIGHTS);
}

// 1 = Monday ... 7 = Sunday, for a yyyy-MM-dd date
function isoWeekday(date) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}
