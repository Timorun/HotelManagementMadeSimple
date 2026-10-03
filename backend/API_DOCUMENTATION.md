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
  "notes": "Late arrival",                // reservation notes for this stay
  // Optional: the status to start in (default "confirmed")
  "status": "awaiting_payment",
  "paymentDueDate": "2024-01-08",         // awaiting payment only; default: today + the days to pay, never after check-in
  "notifyGuest": true                     // awaiting payment only: email the price and payment details
}
```

`channel` is `direct` (own website, phone, at the door: no commission), `booking.com`, `airbnb`,
`expedia` or `other` (another platform). Older values `website`, `phone` and `walk in` are saved as
`direct`; no channel means `direct`.

`status` can be `confirmed`, `awaiting_payment`, `pending`, `checked_in` or `checked_out` (to enter
a past stay), not `cancelled` or `no_show`. A reservation created as `awaiting_payment` waits with
the accepted booking requests (`GET /api/booking-requests/awaiting-payment`) until it is marked as
paid. With `notifyGuest: true` the guest gets the same email as an accepted request; this needs a
price, the guest's email address and an IBAN or Bizum number under `/api/settings/payment`.

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
- `awaiting_payment` (an accepted booking request; the dates are held until the guest pays)
- `confirmed`
- `checked_in`
- `checked_out`
- `cancelled`
- `no_show`

**Recommended transition flow (warning-only):**
- `pending` → `awaiting_payment`, `confirmed`, `cancelled`, `no_show`
- `awaiting_payment` → `confirmed`, `cancelled`
- `confirmed` → `checked_in`, `cancelled`, `no_show`
- `checked_in` → `checked_out`, `cancelled`
- Any other transition can still be saved for correction purposes.

When reactivating a cancelled reservation (`cancelled` → active status), suite availability is validated for the reservation dates.
Changing a reservation to `awaiting_payment` without a pay-by date gives it the default one, so it
can be flagged as overdue.

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
| `photoUrls` | At most 30, in display order; each a path of an image shipped with the frontend (`/suites/...`) or an `https://` link, at most 500 characters | `[]` |

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
  "channel": "String (direct|booking.com|airbnb|expedia|other)",
  "status": "String (pending|awaiting_payment|confirmed|checked_in|checked_out|cancelled|no_show)",
  "paymentDueDate": "LocalDate (accepted booking requests: pay by this date)",
  "paidAt": "LocalDateTime (when the payment was marked as received)",
  "paymentOverdue": "Boolean (awaiting payment and the due date has passed)",
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
  "icalExportReadAt": "LocalDateTime (last time booking.com, or anyone with the link, downloaded icalExportUrl)",
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
| GET | `/api/operations/arrivals/today` | Check-ins today: pending, awaiting payment, confirmed and checked-in |
| GET | `/api/operations/departures/today` | Check-outs today: confirmed, checked-in and checked-out |
| GET | `/api/operations/occupancy?date=` | Stays occupying a date |
| GET | `/api/operations/calendar?from=&to=` | Reservations overlapping a range |

Check guests in/out with `PATCH /api/reservations/{id}/status` (`{"status": "checked_in"}`).

---

## BOOKING REQUESTS API ("solicitudes")

Requests from the public booking page are `pending` reservations with channel `direct`, with
the price the guest was quoted. Accepting one makes it `awaiting_payment`: the dates are held
(also in the booking.com calendar feed) and the guest is emailed the price, the payment details
from `/api/settings/payment` and a pay-by date. Marking it as paid confirms the booking. An
unpaid request past its date is flagged (`paymentOverdue`), never cancelled automatically.

Every PATCH takes `{"message": "...", "notifyGuest": true}`; the message is added to the email
to the guest, and `notifyGuest: false` sends no email.

| Method | Path | Description |
|---|---|---|
| GET | `/api/booking-requests` | Pending requests, oldest stay first |
| GET | `/api/booking-requests/awaiting-payment` | Accepted requests waiting for payment, earliest pay-by date first |
| GET | `/api/booking-requests/count` | `{"pending": 1, "awaitingPayment": 2, "overdue": 1}`; the navigation badge shows pending + overdue |
| PATCH | `/api/booking-requests/{id}/accept` | Pending → `awaiting_payment`. Also takes `priceTotal` (default: the quoted price; required when there was none) and `paymentDueDate` (default: today + the deadline days from the payment settings, never after check-in). Emailing the guest needs an IBAN or Bizum number in the payment settings |
| PATCH | `/api/booking-requests/{id}/paid` | Awaiting payment → `confirmed`, sets `paidAt`; the guest gets the confirmation |
| PATCH | `/api/booking-requests/{id}/payment-deadline` | New `paymentDueDate` (today or later) for an unpaid request; the guest gets a reminder |
| PATCH | `/api/booking-requests/{id}/reject` | Pending or awaiting payment → `cancelled`, the dates are free again |

---

## PRICES API

A price per night for each suite and date (table `suite_rates`). The public availability and the
booking request use it to quote the whole stay; a stay with a night without a price is quoted as
`null` ("price on request").

| Method | Path | Description |
|---|---|---|
| GET | `/api/rates?from=&to=` | `[{suiteId, date, price}]` for every priced night in the range |
| PUT | `/api/rates` | `{"suiteIds": [1, 2], "from": "2026-11-01", "to": "2026-11-30", "weekdays": [5, 6], "price": 150}` → `{"nights": 16}`. `to` is included; `weekdays` are ISO days (1 = Monday ... 7 = Sunday), empty means every day; `"price": null` removes the prices. At most 2 years at a time |
| GET | `/api/rates/quote?suiteId=&checkIn=&checkOut=` | `{"total": 360.00, "nights": 3}`; `total` is `null` when a night has no price |

---

## BOOKING.COM SYNC API

| Method | Path | Description |
|---|---|---|
| POST | `/api/booking-sync/ical` | Import every suite's booking.com calendar now |
| POST | `/api/booking-sync/ical/{suiteId}` | Import one suite's calendar |
| GET | `/api/booking-sync/conflicts` | Imported stays overlapping another reservation |
| POST | `/api/booking-sync/import` | Import rows of a booking.com reservations export: `{"dryRun": true, "rows": [{bookingNumber, guestName, bookerName, phone, country, checkIn, checkOut, people, price, status, suiteId, remarks}]}` |

Suites carry `bookingIcalUrl` (set with `PUT /api/suites/{id}`) and return `icalExportUrl`,
`icalLastSyncAt`, `icalLastSyncError` and `icalExportReadAt`. The calendar of each suite is also imported every
15 minutes (`hmms.ical.sync-interval-ms`).

---

## ANALYTICS API

Only confirmed, checked-in and checked-out stays count as sold. A stay's price and commission are
spread evenly over its nights; available nights = active suites × days.

| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/overview?from=&to=` | A period (inclusive, at most 2 years) and the same dates a year earlier: `current` and `previous` totals (revenue, commission, revenueAfterCommission, nightsSold, nightsAvailable, occupancy %, averageNightlyRate, bookings, direct/platform nights and revenue), `channels` (per channel: bookings, nights, revenue, commission, last year's nights and revenue), `weekdays` (1 = Monday ... 7 = Sunday: nights sold, direct nights, nights available, last year), and `months` (Jan-Dec of the year `to` falls in, against the year before; future months hold what is booked so far) |
| GET | `/api/analytics/outlook` | From today: `next30` and `next90` (nights available, booked, awaiting payment, revenue of the booked nights), and per suite the next 14 nights with `state` `direct`, `platform`, `awaiting_payment`, `pending` or `empty` (empty nights carry their `price` from `/api/rates`) |

Commission = price × the platform's rate on the day the stay was booked (`createdAt`), from
`/api/settings/commission`; direct bookings have none.

---

## OTHER AUTHENTICATED ENDPOINTS

| Method | Path | Description |
|---|---|---|
| GET | `/api/settings` | Hotel, mail and public link configuration (read-only) |
| GET | `/api/settings/payment` | `{iban, accountHolder, bizumPhone, deadlineDays}` sent to accepted guests |
| PUT | `/api/settings/payment` | Same body. The IBAN is checked (country format and check digits) and needs an account holder; the Bizum number must be Spanish (+34); `deadlineDays` is 1-30 (default 3) |
| GET | `/api/settings/commission` | `[{channel, validFrom, rate}]`: commission % per platform (`booking.com`, `airbnb`, `expedia`, `other`), each from a date. The starting rate has `validFrom` 2000-01-01 |
| POST | `/api/settings/commission` | `{"channel": "booking.com", "validFrom": "2027-01-01", "rate": 17}` adds a rate from that date, or changes the rate starting on it. Bookings made before keep the older rate |
| DELETE | `/api/settings/commission?channel=&validFrom=` | Removes a dated rate; the starting rate can only be changed |
| GET | `/api/guests/{id}/preferences-link` | `{"url": ...}` personal link to unsubscribe / request deletion |

---

## PUBLIC API (no login)

| Method | Path | Description |
|---|---|---|
| GET | `/api/public/hotel` | `{"name": "Carmen Suites"}` |
| GET | `/api/public/nationalities` | Countries for the booking form |
| GET | `/api/public/availability?checkIn=&checkOut=&guests=` | Active suites with enough capacity and free for the stay: `[{suiteId, suiteName, capacity, sizeM2, descriptionEn, descriptionEs, amenities, photoUrls, priceTotal, nights}]`; `priceTotal` is the whole stay, `null` when a night has no price |
| POST | `/api/public/booking-requests` | Booking request (rate limited, honeypot field `website`) → pending reservation with the quoted price; guest and owner are emailed. Returns `{reference, suiteName, checkIn, checkOut, status, priceTotal}` |
| POST | `/api/public/preferences/request-link` | `{"email"}` → emails a 7-day preferences link if the email is a guest's (always 202) |
| GET | `/api/public/preferences/{token}` | `{firstName, marketingConsent, deletionRequested, hotelName}` |
| POST | `/api/public/preferences/{token}/opt-out` | Unsubscribe from marketing |
| POST | `/api/public/preferences/{token}/delete-request` | Request data deletion (owner is emailed and anonymizes) |
| GET | `/api/public/ical/{token}.ics` | A suite's availability feed for booking.com (no guest names) |
