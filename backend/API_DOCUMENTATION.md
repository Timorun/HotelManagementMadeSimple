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
  "notes": "VIP guest"
}
```

**Response:** `201 Created`
```json
{
  "reservationId": 1,
  "suiteId": 1,
  "suiteName": "Suite 1",
  "guestId": 5,
  "guestName": "John Doe",
  "email": "john@example.com",
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-20",
  "numGuests": 2,
  "priceTotal": 500.00,
  "channel": "direct",
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
  "checkIn": "2024-01-15",
  "checkOut": "2024-01-20",
  "numGuests": 2,
  "priceTotal": 500.00,
  "channel": "direct",
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
  "channel": "booking.com"
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

Update reservation lifecycle status with validation. Only allowed transitions are permitted.

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

**Transition rules:**
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `checked_in`, `cancelled`
- `checked_in` → `checked_out`, `cancelled`
- `checked_out`, `cancelled`, `no_show` → terminal states

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

### Search Guests by Last Name
**GET** `/api/guests/search?lastName=Doe`

Search for guests by last name (case-insensitive).

**Query Parameters:**
- `lastName` (required): Guest's last name

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
- firstName → "[DELETED]"
- lastName → "[DELETED]"
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

Update suite information.

**Request Body:**
```json
{
  "suiteName": "Luxury Suite",
  "capacity": 4,
  "active": true
}
```

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
  "active": "Boolean"
}
```

---

## ERROR HANDLING

All endpoints return appropriate HTTP status codes:

- `200 OK` - Successful GET/PUT/PATCH
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error or conflict (e.g., suite not available)
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## VALIDATION RULES

### Reservations
- Check-in date must be before check-out date
- Suite must exist and be available for requested dates
- Guest must exist or be created with required fields
- Capacity cannot exceed suite capacity

### Guests
- First name and last name are required
- Email must be unique (for new guests)
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
2. If email provided → search for existing guest by email
3. If email exists → link to that guest
4. Otherwise → create new guest from provided data

### Soft Delete Policies
- Reservations: Status changed to "cancelled"
- Suites: Active flag set to false
- Guests: All personal data anonymized (email, phone, notes, nationality)

---

## NEXT FEATURES (Phase 2)

- [ ] Operational Views (Calendar, Arrivals, Departures, Rooms to Clean)
- [ ] Analytics Dashboard (Occupancy %, Revenue, Avg Price)
- [ ] User Authentication & Authorization
- [ ] Excel Import Script
- [ ] Audit Logging with updatedBy tracking
