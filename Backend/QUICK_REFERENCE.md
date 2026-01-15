# 🚀 Quick API Reference - Top 10 Endpoints

## Most Important Endpoints for MVP

### 1. Create Reservation with Auto-Guest
```http
POST /api/reservations
{
  "suiteId": 1,
  "checkIn": "2026-01-20",
  "checkOut": "2026-01-25",
  "numGuests": 2,
  "priceTotal": 500.00,
  "channel": "direct",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+31612345678",
  "nationalityCode": "NL"
}
```
**Use:** Creating bookings - auto-creates guest if needed

---

### 2. Calendar View Data
```http
GET /api/operations/calendar?from=2026-01-01&to=2026-01-31
```
**Use:** Shows all reservations for the calendar grid

---

### 3. Today's Arrivals
```http
GET /api/operations/arrivals/today
```
**Use:** Morning checklist - who's checking in

---

### 4. Today's Departures
```http
GET /api/operations/departures/today
```
**Use:** Morning checklist - who's checking out

---

### 5. Rooms to Clean
```http
GET /api/operations/rooms-to-clean
```
**Use:** Replaces the Excel cleaning list
**Returns:** Which rooms need cleaning + if turnover is needed

---

### 6. Monthly Analytics
```http
GET /api/analytics/monthly
```
**Use:** Dashboard - occupancy, revenue, comparisons

---

### 7. Update Reservation
```http
PUT /api/reservations/{id}
{
  "suiteId": 2,
  "guestId": 5,
  "checkIn": "2026-01-20",
  "checkOut": "2026-01-26",
  "numGuests": 2,
  "priceTotal": 600.00,
  "channel": "booking.com"
}
```
**Use:** Edit existing bookings

---

### 8. Cancel Reservation
```http
PATCH /api/reservations/{id}/cancel
```
**Use:** Soft delete - keeps history

---

### 9. Guest Search
```http
GET /api/guests/search?lastName=Smith
```
**Use:** Autocomplete when creating reservations

---

### 10. Active Suites
```http
GET /api/suites/active
```
**Use:** Populate suite dropdown in reservation form

---

## 💡 Common Workflows

### Creating a Booking
1. `GET /api/suites/active` - Show available suites
2. `GET /api/nationalities` - Populate nationality dropdown
3. `POST /api/reservations` - Create booking (with guest auto-creation)

### Daily Operations View
1. `GET /api/operations/arrivals/today` - Check-ins
2. `GET /api/operations/departures/today` - Check-outs
3. `GET /api/operations/rooms-to-clean` - Cleaning tasks

### Dashboard
1. `GET /api/analytics/monthly` - Big numbers
2. Compare previous month automatically included in response

---

## Base URL
```
http://localhost:8080
```

## CORS
✅ Enabled for all origins (`*`)
