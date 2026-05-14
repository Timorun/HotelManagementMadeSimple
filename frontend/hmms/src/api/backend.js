// API utility for backend requests
const BASE_URL = 'http://localhost:8080/api';
const ENABLE_STUB_FALLBACK = false;
const unauthorizedListeners = new Set();

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
    occupancyPercentage: 74.5,
    totalRevenue: 32850.0,
    averagePricePerNight: 189.4,
  },
  analyticsReport: {
    fromDate: '2026-03-01',
    toDate: '2026-03-31',
    totalRevenue: 32850.0,
    occupancyPercentage: 74.5,
    averageDailyRate: 189.4,
    revenuePerAvailableNight: 141.1,
    totalReservations: 42,
    totalNights: 173,
    availableNights: 232,
    averageLengthOfStay: 4.2,
    cancellationRate: 8.5,
    cancelledReservations: 4,
    reservationsStartingInPeriod: 46,
    revenueByChannel: {
      direct: 18500.0,
      'booking.com': 9100.0,
      airbnb: 5250.0,
    },
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

function notifyUnauthorized() {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Keep global request handling resilient if one listener fails.
    }
  });
}

export function subscribeToUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function buildHeaders(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

async function request(url, options = {}, errorMessage = 'Request failed') {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: buildHeaders(options.headers),
  });

  if (!res.ok) {
    if (res.status === 401) {
      notifyUnauthorized();
    }

    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorMessage);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

async function getJson(url, errorMessage) {
  return request(url, { method: 'GET' }, errorMessage);
}

export async function login(usernameOrEmail, password) {
  return request(
    `${BASE_URL}/auth/login`,
    {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    },
    'Invalid username/email or password',
  );
}

export async function logout() {
  return request(`${BASE_URL}/auth/logout`, { method: 'POST' }, 'Logout failed');
}

export async function fetchCurrentUser() {
  return request(`${BASE_URL}/auth/me`, { method: 'GET' }, 'Unauthorized');
}

export async function fetchGuests() {
  const data = await getJson(`${BASE_URL}/guests`, 'Failed to fetch guests');
  return withStubFallback(data, STUB_DATA.guests);
}

export async function fetchGuest(id) {
  return request(`${BASE_URL}/guests/${id}`, { method: 'GET' }, 'Failed to fetch guest');
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

export async function fetchAnalyticsReport(from, to) {
  const data = await getJson(
    `${BASE_URL}/analytics/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    'Failed to fetch analytics report',
  );
  return withStubFallback(data, STUB_DATA.analyticsReport);
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
  return request(
    `${BASE_URL}/reservations`,
    {
      method: 'POST',
      body: JSON.stringify(reservationData),
    },
    'Failed to create reservation',
  );
}

export async function updateReservation(id, reservationData) {
  return request(
    `${BASE_URL}/reservations/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(reservationData),
    },
    'Failed to update reservation',
  );
}

export async function cancelReservation(id) {
  return request(
    `${BASE_URL}/reservations/${id}/cancel`,
    {
      method: 'PATCH',
    },
    'Failed to cancel reservation',
  );
}

export async function createGuest(guestData) {
  return request(
    `${BASE_URL}/guests`,
    {
      method: 'POST',
      body: JSON.stringify(guestData),
    },
    'Failed to create guest',
  );
}

export async function updateGuest(id, guestData) {
  return request(
    `${BASE_URL}/guests/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(guestData),
    },
    'Failed to update guest',
  );
}

export async function anonymizeGuest(id) {
  return request(
    `${BASE_URL}/guests/${id}/anonymize`,
    {
      method: 'PATCH',
    },
    'Failed to anonymize guest',
  );
}

export async function searchGuests(searchQuery) {
  const data = await getJson(
    `${BASE_URL}/guests/search?q=${encodeURIComponent(searchQuery)}`,
    'Failed to search guests'
  );
  return withStubFallback(data, []);
}

/**
 * Update reservation status.
 * @param {number} reservationId - The reservation ID
 * @param {string} status - New status value (e.g., 'checked_in', 'checked_out', 'cancelled')
 * @returns {Promise<Object>} Updated reservation response
 */
export async function updateReservationStatus(reservationId, status) {
  return request(
    `${BASE_URL}/reservations/${reservationId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    'Failed to update reservation status',
  );
}
