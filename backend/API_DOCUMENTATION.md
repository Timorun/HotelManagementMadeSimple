# Hotel Management System - API Documentation

## Overview
Complete REST API for reservation, guest, and suite management with full CRUD operations, soft deletes, and GDPR compliance.

---

## RESERVATIONS API

### Create Reservation
**POST** `/api/reservations`

Create a new reservation. Can either link to an existing guest or create a new one.

**Request Body:**
```json
{
  "suiteId": 1,
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-20",
  "numGuests": 2,
  "priceTotal": 500.00,
  "channel": "direct",
  // Option 1: Link to existing guest
  "guestId": 5
  // Option 2: Create new guest
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+31612345678",
  "nationalityCode": "NL",
  "guestNotes": "Allergic to feathers",   // saved on the new guest's profile
  "notes": "Late arrival"                 // reservation notes for this stay
}
```

If the email belongs to an existing guest with a **different** name the request is rejected with
`409 Conflict` (`{"error", "existingGuestId", "existingGuestName"}`) instead of silently attaching
the stay to that guest; the UI then offers to use the existing guest.

**Response:** `201 Created`
```json
{
  "reservationId": 1,
  "suiteId": 1,
  "suiteName": "Suite 1",
  "guestId": 5,
  "guestName": "John Doe",
  "email": "john@example.com",
  "guestNotes": "Prefers top floor room",
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-20",
  "numGuests": 2,
  "priceTotal": 500.00,
  "channel": "direct",
  "notes": "Needs baby crib",
  "status": "confirmed",
  "createdAt": "2024-01-10T14:30:00"
}
```

---

### Get Single Reservation
**GET** `/api/reservations/{id}`

Get details of a specific reservation.

**Response:** `200 OK`
```json
{
  "reservationId": 1,
  "suiteId": 1,
  "suiteName": "Suite 1",
  "guestId": 5,
  "guestName": "John Doe",
  "email": "john@example.com",
  "guestNotes": "Prefers top floor room",
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-20",
  "numGuests": 2,
  "priceTotal": 500.00,
  "channel": "direct",
  "notes": "Needs baby crib",
  "status": "confirmed",
  "createdAt": "2024-01-10T14:30:00"
}
```

---

### List Reservations (Date Range)
**GET** `/api/reservations?from=2024-01-01&to=2024-01-31`

Get all reservations within a date range.

**Query Parameters:**
- `from` (required): Start date (YYYY-MM-DD)
- `to` (required): End date (YYYY-MM-DD)

**Response:** `200 OK` - Array of reservation objects

---

### Get Guest Reservations
**GET** `/api/reservations/guest/{guestId}`

Get all reservations for a specific guest.

**Response:** `200 OK` - Array of reservation objects

---

### Update Reservation
**PUT** `/api/reservations/{id}`

Update an existing reservation. Validates dates and suite availability.

**Request Body:**
```json
{
  "suiteId": 2,
  "guestId": 5,
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-22",
  "numGuests": 3,
  "priceTotal": 600.00,
  "channel": "booking.com",
  "notes": "Guest requested late checkout"
}
```

**Response:** `200 OK` - Updated reservation object

---

### Cancel Reservation
**PATCH** `/api/reservations/{id}/cancel`

Soft delete - marks reservation as 'cancelled' instead of deleting.

**Response:** `200 OK` - Updated reservation with status "cancelled"

---

### Update Reservation Status
**PATCH** `/api/reservations/{id}/status`

Update reservation lifecycle status.

Backend allows status corrections to any other status. Frontend should show warnings for unusual transitions.

**Request Body:**
```json
{
  "status": "checked_in"
}
```

**Response:** `200 OK` - Updated reservation object with `status`, `statusLabel`, and `statusColor`.

**Valid status values:**
- `pending`
- `confirmed`
- `checked_in`
- `checked_out`
- `cancelled`
- `no_show`

**Recommended transition flow (warning-only):**
- `pending` → `confirmed`, `cancelled`, `no_show`
- `confirmed` → `checked_in`, `cancelled`, `no_show`
- `checked_in` → `checked_out`, `cancelled`
- Any other transition can still be saved for correction purposes.

When reactivating a cancelled reservation (`cancelled` → active status), suite availability is validated for the reservation dates.

---

## GUESTS API

### Create Guest
**POST** `/api/guests`

Create a new guest record.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+31612345679",
  "nationalityCode": "US",
  "notes": "Prefers high floor",
  "marketingConsent": true
}
```

**Response:** `201 Created`
```json
{
  "guestId": 10,
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+31612345679",
  "nationalityCode": "US",
  "nationalityName": "United States",
  "notes": "Prefers high floor",
  "marketingConsent": true,
  "createdAt": "2024-01-10T14:30:00",
  "reservationCount": 0
}
```

---

### Get Single Guest
**GET** `/api/guests/{id}`

Get details of a specific guest.

**Response:** `200 OK` - Guest object

---

### Get All Guests
**GET** `/api/guests`

Get all guests in the system.

**Response:** `200 OK` - Array of guest objects

---

### Search Guests by Name
**GET** `/api/guests/search?q=maria garcia lopez`

Every word of `q` must appear in the guest's full name. Case- and accent-insensitive, so
"maria garcia lopez" finds "María García López". Anonymized guests are excluded.

**Query Parameters:**
- `q` (required): one or more name parts

**Response:** `200 OK` - Array of matching guest objects

---

### Find Guest by Email
**GET** `/api/guests/email?email=john@example.com`

Find a guest by their email address.

**Query Parameters:**
- `email` (required): Guest's email address

**Response:** `200 OK` - Guest object

---

### Update Guest
**PUT** `/api/guests/{id}`

Update guest information.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "phone": "+31612345679",
  "nationalityCode": "US",
  "notes": "Updated notes",
  "marketingConsent": false
}
```

**Response:** `200 OK` - Updated guest object

---

### Anonymize Guest (GDPR)
**PATCH** `/api/guests/{id}/anonymize`

GDPR-compliant data deletion. Removes personal data but keeps reservation history.

**Fields Anonymized:**
- firstName → "Anonimyzed"
- lastName → "Guest"
- email → NULL
- phone → NULL
- notes → NULL
- nationality → NULL
- anonymizedAt → Current timestamp

**Response:** `200 OK` - Anonymized guest object

---

## SUITES API

### Create Suite
**POST** `/api/suites`

Create a new suite.

**Request Body:**
```json
{
  "suiteName": "Deluxe Suite",
  "capacity": 4,
  "active": true
}
```

**Response:** `201 Created`
```json
{
  "suiteId": 7,
  "suiteName": "Deluxe Suite",
  "capacity": 4,
  "active": true
}
```

---

### Get Single Suite
**GET** `/api/suites/{id}`

Get details of a specific suite.

**Response:** `200 OK` - Suite object

---

### Get All Suites
**GET** `/api/suites`

Get all suites (active and inactive).

**Response:** `200 OK` - Array of suite objects

---

### Get Active Suites
**GET** `/api/suites/active`

Get only active suites.

**Response:** `200 OK` - Array of active suite objects

---

### Update Suite
**PUT** `/api/suites/{id}`

Update suite information. `suiteName` and `capacity` are required; every other field is
optional, and leaving it out (or `null`) keeps the current value.

**Request Body:**
```json
{
  "suiteName": "Luxury Suite",
  "capacity": 4,
  "active": true,
  "descriptionEn": "Bright suite with a private terrace.",
  "descriptionEs": "Suite luminosa con terraza privada.",
  "sizeM2": 45,
  "amenities": ["double_bed", "private_terrace", "kitchen", "wifi"],
  "photoUrls": ["/suites/patio/01.webp", "https://example.com/photo.jpg"]
}
```

The booking-page details (also accepted by **POST**):

| Field | Rules | Clear it with |
|---|---|---|
| `descriptionEn`, `descriptionEs` | At most 4000 characters; line breaks are kept | `""` |
| `sizeM2` | 1 to 1000 | `0` |
| `amenities` | At most 30 keys matching `[a-z][a-z0-9_]*` (max 40 characters); the frontend knows `double_bed`, `twin_beds`, `sofa_bed`, `living_area`, `private_terrace`, `patio`, `balcony`, `kitchen`, `kitchenette`, `dining_area`, `fridge`, `coffee_machine`, `washing_machine`, `air_conditioning`, `heating`, `fan`, `wifi`, `smart_tv`, `workspace`, `private_bathroom`, `bathtub`, `hairdryer`, `iron`, `cot_available`, `self_check_in` and shows others as text | `[]` |
| `photoUrls` | At most 20, in display order; each a path of an image shipped with the frontend (`/suites/...`) or an `https://` link, at most 500 characters | `[]` |

**Response:** `200 OK` - Updated suite object

---

### Deactivate Suite
**PATCH** `/api/suites/{id}/deactivate`

Soft delete - marks suite as inactive.

**Response:** `200 OK` - Deactivated suite object

---

### Reactivate Suite
**PATCH** `/api/suites/{id}/reactivate`

Reactivate a deactivated suite.

**Response:** `200 OK` - Reactivated suite object

---

## DATA MODELS

### ReservationResponse
```json
{
  "reservationId": "Long",
  "suiteId": "Long",
  "suiteName": "String",
  "guestId": "Long",
  "guestName": "String",
  "email": "String",
  "checkIn": "LocalDate (YYYY-MM-DD)",
  "checkOut": "LocalDate (YYYY-MM-DD)",
  "numGuests": "Integer",
  "priceTotal": "BigDecimal",
  "channel": "String (direct|booking.com|airbnb|etc)",
  "status": "String (confirmed|completed|cancelled|no_show)",
  "createdAt": "LocalDateTime (ISO-8601)"
}
```

### GuestResponse
```json
{
  "guestId": "Long",
  "firstName": "String",
  "lastName": "String",
  "email": "String",
  "phone": "String",
  "nationalityCode": "String",
  "nationalityName": "String",
  "notes": "String",
  "marketingConsent": "Boolean",
  "createdAt": "LocalDateTime (ISO-8601)",
  "reservationCount": "Integer"
}
```

### SuiteResponse
```json
{
  "suiteId": "Long",
  "suiteName": "String",
  "capacity": "Integer",
  "active": "Boolean",
  "bookingIcalUrl": "String (booking.com calendar to import)",
  "icalExportUrl": "String (this suite's availability feed for booking.com)",
  "icalLastSyncAt": "LocalDateTime (ISO-8601)",
  "icalLastSyncError": "String",
  "descriptionEn": "String",
  "descriptionEs": "String",
  "sizeM2": "Integer",
  "amenities": ["String (amenity key)"],
  "photoUrls": ["String (in display order)"]
}
```

---

## ERROR HANDLING

All endpoints return appropriate HTTP status codes:

- `200 OK` - Successful GET/PUT/PATCH
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error or conflict (e.g., suite not available)
- `404 Not Found` - Resource not found
- `409 Conflict` - Guest details clash with an existing guest (see Create Reservation)
- `429 Too Many Requests` - Public endpoint rate limit (10 requests / 10 minutes per IP)
- `500 Internal Server Error` - Server error

---

## VALIDATION RULES

### Reservations
- Check-in date must be before check-out date
- Suite must exist and be available for requested dates
- Guest must exist or be created with required fields
- Capacity cannot exceed suite capacity

### Guests
- First name and last name are required; whitespace is trimmed and collapsed
- Phone numbers are stored in E.164 (`+34612345678`); local numbers assume `HMMS_DEFAULT_PHONE_REGION` (ES); invalid numbers return 400
- A guest with the same first and last name returns 409
- Nationality code must exist in nationalities table (if provided)

### Suites
- Suite name is required
- Capacity must be greater than 0

---

## BUSINESS LOGIC

### Suite Availability Check
When creating or updating a reservation:
1. Check for overlapping reservations on the same suite
2. Ignore cancelled reservations
3. Exclude current reservation when updating
4. Return 400 Bad Request if suite is unavailable

### Guest Auto-Creation
When creating a reservation:
1. If `guestId` provided → use existing guest
2. If the email belongs to a guest with the same name → link to that guest
3. If the email belongs to a guest with a different name → 409 Conflict
4. Otherwise → create a new guest (with `guestNotes`) through the same validation as `POST /api/guests`

### Soft Delete Policies
- Reservations: Status changed to "cancelled"
- Suites: Active flag set to false
- Guests: All personal data anonymized (email, phone, notes, nationality)

---
---

## OPERATIONS API (Today view)

| Method | Path | Description |
|---|---|---|
| GET | `/api/operations/arrivals/today` | Check-ins today: pending, confirmed and checked-in |
| GET | `/api/operations/departures/today` | Check-outs today: confirmed, checked-in and checked-out |
| GET | `/api/operations/occupancy?date=` | Stays occupying a date |
| GET | `/api/operations/calendar?from=&to=` | Reservations overlapping a range |

Check guests in/out with `PATCH /api/reservations/{id}/status` (`{"status": "checked_in"}`).

---

## BOOKING REQUESTS API ("solicitudes")

Requests from the public booking page are `pending` reservations with channel `website`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/booking-requests` | Pending reservations, oldest stay first |
| GET | `/api/booking-requests/count` | `{"pending": 3}` for the navigation badge |
| PATCH | `/api/booking-requests/{id}/confirm` | `{"priceTotal": 450, "message": "...", "notifyGuest": true}` → confirmed, guest emailed |
| PATCH | `/api/booking-requests/{id}/reject` | `{"message": "...", "notifyGuest": true}` → cancelled, guest emailed |

---

## BOOKING.COM SYNC API

| Method | Path | Description |
|---|---|---|
| POST | `/api/booking-sync/ical` | Import every suite's booking.com calendar now |
| POST | `/api/booking-sync/ical/{suiteId}` | Import one suite's calendar |
| GET | `/api/booking-sync/conflicts` | Imported stays overlapping another reservation |
| POST | `/api/booking-sync/import` | Import rows of a booking.com reservations export: `{"dryRun": true, "rows": [{bookingNumber, guestName, bookerName, phone, country, checkIn, checkOut, people, price, status, suiteId, remarks}]}` |

Suites carry `bookingIcalUrl` (set with `PUT /api/suites/{id}`) and return `icalExportUrl`,
`icalLastSyncAt` and `icalLastSyncError`. The calendar of each suite is also imported every
15 minutes (`hmms.ical.sync-interval-ms`).

---

## OTHER AUTHENTICATED ENDPOINTS

| Method | Path | Description |
|---|---|---|
| GET | `/api/settings` | Hotel, mail and public link configuration (read-only) |
| GET | `/api/guests/{id}/preferences-link` | `{"url": ...}` personal link to unsubscribe / request deletion |

---

## PUBLIC API (no login)

| Method | Path | Description |
|---|---|---|
| GET | `/api/public/hotel` | `{"name": "Carmen Suites"}` |
| GET | `/api/public/nationalities` | Countries for the booking form |
| GET | `/api/public/availability?checkIn=&checkOut=&guests=` | Active suites with enough capacity and free for the stay: `[{suiteId, suiteName, capacity, sizeM2, descriptionEn, descriptionEs, amenities, photoUrls}]` |
| POST | `/api/public/booking-requests` | Booking request (rate limited, honeypot field `website`) → pending reservation; guest and owner are emailed |
| POST | `/api/public/preferences/request-link` | `{"email"}` → emails a 7-day preferences link if the email is a guest's (always 202) |
| GET | `/api/public/preferences/{token}` | `{firstName, marketingConsent, deletionRequested, hotelName}` |
| POST | `/api/public/preferences/{token}/opt-out` | Unsubscribe from marketing |
| POST | `/api/public/preferences/{token}/delete-request` | Request data deletion (owner is emailed and anonymizes) |
| GET | `/api/public/ical/{token}.ics` | A suite's availability feed for booking.com (no guest names) |
