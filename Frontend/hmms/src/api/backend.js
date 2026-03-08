// API utility for backend requests
const BASE_URL = 'http://localhost:8080/api';
const ENABLE_STUB_FALLBACK = false;

const STUB_DATA = {
  guests: [
    { id: 1, firstName: 'Emma', lastName: 'Jansen', email: 'emma.jansen@example.com' },
    { id: 2, firstName: 'Lucas', lastName: 'Bakker', email: 'lucas.bakker@example.com' },
    { id: 3, firstName: 'Sofia', lastName: 'de Vries', email: 'sofia.devries@example.com' },
  ],
  suites: [
    { id: 1, name: 'Canal View Suite', type: 'DELUXE' },
    { id: 2, name: 'Executive Corner Suite', type: 'EXECUTIVE' },
    { id: 3, name: 'Royal Penthouse', type: 'PENTHOUSE' },
  ],
  reservations: [
    {
      id: 101,
      guestName: 'Emma Jansen',
      suiteName: 'Canal View Suite',
      status: 'confirmed',
    },
    {
      id: 102,
      guestName: 'Lucas Bakker',
      suiteName: 'Executive Corner Suite',
      status: 'checked_in',
    },
    {
      id: 103,
      guestName: 'Sofia de Vries',
      suiteName: 'Royal Penthouse',
      status: 'pending',
    },
  ],
  nationalities: [
    { id: 1, name: 'Dutch' },
    { id: 2, name: 'German' },
    { id: 3, name: 'Belgian' },
    { id: 4, name: 'French' },
  ],
  analytics: {
    month: '2026-03',
    totalReservations: 42,
    occupancyRate: 74.5,
    totalRevenue: 32850.0,
    averageDailyRate: 189.4,
  },
  operations: {
    arrivalsToday: [
      { id: 201, guestName: 'Mila Peters', suiteName: 'Canal View Suite' },
      { id: 202, guestName: 'Noah Smit', suiteName: 'Executive Corner Suite' },
    ],
    departuresToday: [
      { id: 203, guestName: 'Liam van Dijk', suiteName: 'Royal Penthouse' },
    ],
    roomsToClean: [
      { id: 301, suiteName: 'Canal View Suite' },
      { id: 302, suiteName: 'Royal Penthouse' },
    ],
  },
};

function withStubFallback(data, stubData) {
  if (!ENABLE_STUB_FALLBACK) return data;

  if (Array.isArray(data)) {
    return data.length === 0 ? stubData : data;
  }

  if (data === null || data === undefined) {
    return stubData;
  }

  if (typeof data === 'object' && Object.keys(data).length === 0) {
    return stubData;
  }

  return data;
}

async function getJson(url, errorMessage) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(errorMessage);
  return res.json();
}

export async function fetchGuests() {
  const data = await getJson(`${BASE_URL}/guests`, 'Failed to fetch guests');
  return withStubFallback(data, STUB_DATA.guests);
}

export async function fetchSuites() {
  const data = await getJson(`${BASE_URL}/suites`, 'Failed to fetch suites');
  return withStubFallback(data, STUB_DATA.suites);
}

export async function fetchReservations(from, to) {
  const data = await getJson(
    `${BASE_URL}/reservations?from=${from}&to=${to}`,
    'Failed to fetch reservations',
  );
  return withStubFallback(data, STUB_DATA.reservations);
}

export async function fetchNationalities() {
  const data = await getJson(`${BASE_URL}/nationalities`, 'Failed to fetch nationalities');
  return withStubFallback(data, STUB_DATA.nationalities);
}

export async function fetchAnalytics(month) {
  const url = month ? `${BASE_URL}/analytics/monthly/${month}` : `${BASE_URL}/analytics/monthly`;
  const data = await getJson(url, 'Failed to fetch analytics');
  return withStubFallback(data, STUB_DATA.analytics);
}

export async function fetchOperationsDashboard() {
  const [arrivalsToday, departuresToday, roomsToClean] = await Promise.all([
    getJson(`${BASE_URL}/operations/arrivals/today`, 'Failed to fetch arrivals'),
    getJson(`${BASE_URL}/operations/departures/today`, 'Failed to fetch departures'),
    getJson(`${BASE_URL}/operations/rooms-to-clean`, 'Failed to fetch rooms to clean'),
  ]);

  return {
    arrivalsToday: withStubFallback(arrivalsToday, STUB_DATA.operations.arrivalsToday),
    departuresToday: withStubFallback(departuresToday, STUB_DATA.operations.departuresToday),
    roomsToClean: withStubFallback(roomsToClean, STUB_DATA.operations.roomsToClean),
  };
}

export async function fetchCalendar(from, to) {
  const data = await getJson(
    `${BASE_URL}/operations/calendar?from=${from}&to=${to}`,
    'Failed to fetch calendar'
  );
  return withStubFallback(data, []);
}

export async function createReservation(reservationData) {
  const res = await fetch(`${BASE_URL}/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservationData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || 'Failed to create reservation';
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function updateReservation(id, reservationData) {
  const res = await fetch(`${BASE_URL}/reservations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservationData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || 'Failed to update reservation';
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function cancelReservation(id) {
  const res = await fetch(`${BASE_URL}/reservations/${id}/cancel`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error || 'Failed to cancel reservation';
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function createGuest(guestData) {
  const res = await fetch(`${BASE_URL}/guests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guestData),
  });
  if (!res.ok) throw new Error('Failed to create guest');
  return res.json();
}

export async function updateGuest(id, guestData) {
  const res = await fetch(`${BASE_URL}/guests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guestData),
  });
  if (!res.ok) throw new Error('Failed to update guest');
  return res.json();
}

export async function searchGuests(lastName) {
  const data = await getJson(
    `${BASE_URL}/guests/search?lastName=${encodeURIComponent(lastName)}`,
    'Failed to search guests'
  );
  return withStubFallback(data, []);
}
