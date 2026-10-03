// API utility for backend requests
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const BASE_URL = configuredBaseUrl.endsWith('/')
  ? configuredBaseUrl.slice(0, -1)
  : configuredBaseUrl;
const ENABLE_STUB_FALLBACK = false;
const TOKEN_STORAGE_KEY = 'HMMS_AUTH_TOKEN';
const unauthorizedListeners = new Set();
const inFlightGetRequests = new Map();
let authToken = null;

try {
  authToken = sessionStorage.getItem(TOKEN_STORAGE_KEY) || null;
} catch {
  authToken = null;
}

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
  authToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures (e.g., privacy mode restrictions).
  }

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
  const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  return {
    'Content-Type': 'application/json',
    ...authHeaders,
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
    const error = new Error(errorData.error || errorMessage);
    error.status = res.status;
    error.data = errorData;
    throw error;
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

function getJson(url, errorMessage) {
  if (inFlightGetRequests.has(url)) {
    return inFlightGetRequests.get(url);
  }

  // Reuse the same pending GET promise for concurrent callers of the same endpoint.
  const pendingRequest = request(url, { method: 'GET' }, errorMessage)
    .finally(() => {
      inFlightGetRequests.delete(url);
    });

  inFlightGetRequests.set(url, pendingRequest);
  return pendingRequest;
}

export async function login(usernameOrEmail, password) {
  const response = await request(
    `${BASE_URL}/auth/login`,
    {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    },
    'Invalid username/email or password',
  );

  if (response?.token) {
    authToken = response.token;
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    } catch {
      // Ignore storage failures and keep in-memory token fallback.
    }
  }

  return response;
}

export async function logout() {
  const response = await request(`${BASE_URL}/auth/logout`, { method: 'POST' }, 'Logout failed');
  authToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures (e.g., privacy mode restrictions).
  }
  return response;
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

// ===== Analytics =====

/** A period (yyyy-MM-dd, inclusive) compared with the same dates last year. */
export async function fetchAnalyticsOverview(from, to) {
  const params = new URLSearchParams({ from, to });
  return request(`${BASE_URL}/analytics/overview?${params}`, { method: 'GET' }, 'Failed to load analytics');
}

/** Booked and empty nights from today on. */
export async function fetchAnalyticsOutlook() {
  return request(`${BASE_URL}/analytics/outlook`, { method: 'GET' }, 'Failed to load the coming weeks');
}

export async function fetchOperationsDashboard() {
  const [arrivalsToday, departuresToday] = await Promise.all([
    getJson(`${BASE_URL}/operations/arrivals/today`, 'Failed to fetch arrivals'),
    getJson(`${BASE_URL}/operations/departures/today`, 'Failed to fetch departures'),
  ]);

  return {
    arrivalsToday: withStubFallback(arrivalsToday, STUB_DATA.operations.arrivalsToday),
    departuresToday: withStubFallback(departuresToday, STUB_DATA.operations.departuresToday),
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

// ===== Suites (settings) =====

export async function createSuite(suiteData) {
  return request(`${BASE_URL}/suites`, { method: 'POST', body: JSON.stringify(suiteData) }, 'Failed to create suite');
}

export async function updateSuite(id, suiteData) {
  return request(`${BASE_URL}/suites/${id}`, { method: 'PUT', body: JSON.stringify(suiteData) }, 'Failed to update suite');
}

export async function fetchSettings() {
  return request(`${BASE_URL}/settings`, { method: 'GET' }, 'Failed to load settings');
}

// ===== Guest communication =====

export async function fetchGuestPreferencesLink(guestId) {
  const data = await request(`${BASE_URL}/guests/${guestId}/preferences-link`, { method: 'GET' }, 'Failed to create preferences link');
  return data?.url;
}

// ===== Booking requests (solicitudes) =====

export async function fetchBookingRequests() {
  return request(`${BASE_URL}/booking-requests`, { method: 'GET' }, 'Failed to load booking requests');
}

export async function fetchAwaitingPayment() {
  return request(`${BASE_URL}/booking-requests/awaiting-payment`, { method: 'GET' }, 'Failed to load unpaid requests');
}

/** {pending, awaitingPayment, overdue} */
export async function fetchBookingRequestCount() {
  const data = await request(`${BASE_URL}/booking-requests/count`, { method: 'GET' }, 'Failed to load booking requests');
  return { pending: data?.pending ?? 0, awaitingPayment: data?.awaitingPayment ?? 0, overdue: data?.overdue ?? 0 };
}

export async function acceptBookingRequest(id, decision) {
  return request(`${BASE_URL}/booking-requests/${id}/accept`, { method: 'PATCH', body: JSON.stringify(decision || {}) }, 'Failed to accept request');
}

export async function markBookingRequestPaid(id, decision) {
  return request(`${BASE_URL}/booking-requests/${id}/paid`, { method: 'PATCH', body: JSON.stringify(decision || {}) }, 'Failed to mark as paid');
}

export async function extendPaymentDeadline(id, decision) {
  return request(`${BASE_URL}/booking-requests/${id}/payment-deadline`, { method: 'PATCH', body: JSON.stringify(decision || {}) }, 'Failed to change the deadline');
}

export async function rejectBookingRequest(id, decision) {
  return request(`${BASE_URL}/booking-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify(decision || {}) }, 'Failed to reject request');
}

// ===== Prices per suite and date =====

export async function fetchRates(from, to) {
  const params = new URLSearchParams({ from, to });
  return request(`${BASE_URL}/rates?${params}`, { method: 'GET' }, 'Failed to load prices');
}

/** {suiteIds, from, to, weekdays (1 = Monday ... 7 = Sunday, empty = all), price (null clears)} */
export async function setRates(rates) {
  return request(`${BASE_URL}/rates`, { method: 'PUT', body: JSON.stringify(rates) }, 'Failed to save prices');
}

export async function fetchPriceQuote(suiteId, checkIn, checkOut) {
  const params = new URLSearchParams({ suiteId: String(suiteId), checkIn, checkOut });
  return request(`${BASE_URL}/rates/quote?${params}`, { method: 'GET' }, 'Failed to calculate the price');
}

// ===== Payment details (Settings) =====

export async function fetchPaymentSettings() {
  return request(`${BASE_URL}/settings/payment`, { method: 'GET' }, 'Failed to load payment details');
}

export async function updatePaymentSettings(settings) {
  return request(`${BASE_URL}/settings/payment`, { method: 'PUT', body: JSON.stringify(settings) }, 'Failed to save payment details');
}

/** [{channel, validFrom, rate}] for every platform, oldest first */
export async function fetchCommissionRates() {
  return request(`${BASE_URL}/settings/commission`, { method: 'GET' }, 'Failed to load commission rates');
}

/** {channel, validFrom, rate}: adds a rate from that date, or changes the rate starting on it */
export async function saveCommissionRate(rate) {
  return request(`${BASE_URL}/settings/commission`, { method: 'POST', body: JSON.stringify(rate) }, 'Failed to save the commission');
}

export async function deleteCommissionRate(channel, validFrom) {
  const params = new URLSearchParams({ channel, validFrom });
  return request(`${BASE_URL}/settings/commission?${params}`, { method: 'DELETE' }, 'Failed to remove the commission rate');
}

// ===== Public (no login): booking page and guest preferences =====

export async function fetchPublicHotel() {
  return request(`${BASE_URL}/public/hotel`, { method: 'GET' }, 'Failed to load hotel');
}

export async function fetchPublicAvailability(checkIn, checkOut, guests) {
  const params = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
  return request(`${BASE_URL}/public/availability?${params}`, { method: 'GET' }, 'Failed to check availability');
}

export async function fetchPublicNationalities() {
  return request(`${BASE_URL}/public/nationalities`, { method: 'GET' }, 'Failed to load countries');
}

export async function submitBookingRequest(bookingData) {
  return request(`${BASE_URL}/public/booking-requests`, { method: 'POST', body: JSON.stringify(bookingData) }, 'Failed to send booking request');
}

export async function requestPreferencesLink(email) {
  return request(`${BASE_URL}/public/preferences/request-link`, { method: 'POST', body: JSON.stringify({ email }) }, 'Failed to send link');
}

export async function fetchPreferences(token) {
  return request(`${BASE_URL}/public/preferences/${encodeURIComponent(token)}`, { method: 'GET' }, 'This link is invalid or has expired');
}

export async function optOutOfMarketing(token) {
  return request(`${BASE_URL}/public/preferences/${encodeURIComponent(token)}/opt-out`, { method: 'POST' }, 'Failed to update preferences');
}

export async function requestDataDeletion(token) {
  return request(`${BASE_URL}/public/preferences/${encodeURIComponent(token)}/delete-request`, { method: 'POST' }, 'Failed to send request');
}

// ===== Booking.com sync =====

export async function syncBookingCalendars(suiteId) {
  const url = suiteId ? `${BASE_URL}/booking-sync/ical/${suiteId}` : `${BASE_URL}/booking-sync/ical`;
  return request(url, { method: 'POST' }, 'Calendar sync failed');
}

export async function fetchSyncConflicts() {
  return request(`${BASE_URL}/booking-sync/conflicts`, { method: 'GET' }, 'Failed to load conflicts');
}

export async function importBookingExport(rows, dryRun) {
  return request(`${BASE_URL}/booking-sync/import`, { method: 'POST', body: JSON.stringify({ rows, dryRun }) }, 'Import failed');
}
