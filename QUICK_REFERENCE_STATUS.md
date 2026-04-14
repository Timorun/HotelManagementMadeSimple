# Reservation Status - Quick Reference Card

## Status Values & Meanings

| Code | Display | Color | Use Case | Terminal |
|------|---------|-------|----------|----------|
| pending | Pending | 🟠 Orange | Awaiting confirmation | ❌ |
| confirmed | Confirmed | 🟢 Green | Reservation is confirmed | ❌ |
| checked_in | Checked In | 🔵 Blue | Guest is at property | ❌ |
| checked_out | Checked Out | ⚪ Gray | Guest has left | ✅ |
| cancelled | Cancelled | 🔴 Red | Reservation cancelled | ✅ |
| no_show | No Show | 🟠 Orange | Guest didn't arrive | ✅ |

## Valid Transitions

```
pending      ──→ confirmed, cancelled
confirmed    ──→ checked_in, cancelled
checked_in   ──→ checked_out, cancelled
checked_out  ──→ [none - terminal]
cancelled    ──→ [none - terminal]
no_show      ──→ [none - terminal]
```

## API Endpoints

```
GET  /api/reservations                     # List reservations
GET  /api/reservations/{id}                # Get single reservation
POST /api/reservations                     # Create reservation
PUT  /api/reservations/{id}                # Update reservation details

PATCH /api/reservations/{id}/cancel        # Cancel (sets status to cancelled)
PATCH /api/reservations/{id}/status        # Update status (NEW)
      Body: { "status": "checked_in" }
```

## Frontend Constants

```javascript
import { RESERVATION_STATUSES, STATUS_META } from './api/reservationStatus';

// Available statuses
RESERVATION_STATUSES.PENDING      // "pending"
RESERVATION_STATUSES.CONFIRMED    // "confirmed"
RESERVATION_STATUSES.CHECKED_IN   // "checked_in"
RESERVATION_STATUSES.CHECKED_OUT  // "checked_out"
RESERVATION_STATUSES.CANCELLED    // "cancelled"
RESERVATION_STATUSES.NO_SHOW      // "no_show"

// Metadata for each status
STATUS_META[status].label           // "Confirmed"
STATUS_META[status].color           // "#27AE60"
STATUS_META[status].canTransitionTo // ["checked_in", "cancelled"]
```

## Frontend Utilities

```javascript
import { 
  getAvailableTransitions,
  canTransitionTo,
  getStatusLabel,
  getStatusColor
} from './api/reservationStatus';

getAvailableTransitions('confirmed')        // ['checked_in', 'cancelled']
canTransitionTo('confirmed', 'checked_in')  // true
canTransitionTo('checked_out', 'pending')   // false
getStatusLabel('checked_in')                // "Checked In"
getStatusColor('checked_in')                // "#3498DB"
```

## Frontend API

```javascript
import { updateReservationStatus } from './api/backend';

// Update status
const updated = await updateReservationStatus(123, 'checked_in');

// Returns:
{
  reservationId: 123,
  status: "checked_in",
  statusLabel: "Checked In",
  statusColor: "#3498DB",
  // ... other fields
}

// Handles errors
catch (err) {
  console.error(err.message); // "Cannot change status of a checked-out reservation"
}
```

## Common Patterns

### Check if transition is valid
```javascript
if (canTransitionTo(res.status, 'checked_in')) {
  await updateReservationStatus(res.reservationId, 'checked_in');
}
```

### Display status with color
```javascript
<span style={{ color: getStatusColor(res.status) }}>
  {getStatusLabel(res.status)}
</span>
```

### Build status dropdown
```javascript
const options = getAvailableTransitions(currentStatus);
<select onChange={(e) => updateStatus(e.target.value)}>
  {options.map(s => <option value={s}>{getStatusLabel(s)}</option>)}
</select>
```

### Filter by status
```javascript
reservations.filter(r => canTransitionTo(r.status, 'checked_out'))
```

## Backend Code Patterns

### Use enum in code
```java
ReservationStatus status = ReservationStatus.CONFIRMED;
reservation.setStatus(status);

// Or from string
ReservationStatus status = ReservationStatus.fromValue("confirmed");
```

### Check transition validity
```java
if (currentStatus.canTransitionTo(newStatus)) {
    reservation.setStatus(newStatus);
} else {
    throw new IllegalArgumentException(
        currentStatus.getTransitionError(newStatus)
    );
}
```

### Check if terminal state
```java
if (reservation.getStatus().isTerminalState()) {
    throw new IllegalArgumentException("Cannot modify terminal reservation");
}
```

## Database

```sql
-- Enum column definition
status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') 
       NOT NULL DEFAULT 'pending'

-- Queries
WHERE status = 'confirmed'
WHERE status IN ('confirmed', 'checked_in')
WHERE status != 'cancelled'
```

## Error Messages

```
"Invalid reservation status: xyz"
"Cannot change status of a checked-out reservation"
"Cannot change status of a cancelled reservation"
"Cannot change status of a no-show reservation"
"Status is already Checked In"
```

## Implementation Files

**Backend**:
- `ReservationStatus.java` - Enum definition
- `ReservationController.java` - New PATCH endpoint
- `ReservationService.java` - New updateReservationStatus() method
- `V8__add_reservation_status_enum.sql` - Migration

**Frontend**:
- `reservationStatus.js` - Constants and utilities
- `backend.js` - updateReservationStatus() function

**Documentation**:
- `RESERVATION_STATUS_IMPLEMENTATION.md` - Full guide
- `API_STATUS_REFERENCE.md` - API documentation
- `IMPLEMENTATION_SUMMARY.md` - Overview
- This file - Quick reference

## Deployment Steps

1. ✅ Backend changes compiled
2. ✅ Database migration prepared
3. ✅ Frontend constants created
4. ✅ API endpoint implemented
5. On deployment:
   - Migrate database (V8)
   - Deploy backend JAR
   - Deploy frontend (or just refresh if running locally)
6. Test status transitions in Calendar view

## Common Questions

**Q: Can I revert from checked_out to checked_in?**
A: No, checked_out is a terminal state. Design prevents this.

**Q: What about existing reservations?**
A: They're converted on first migration run. Default is "pending".

**Q: Can I add a new status?**
A: Yes, add to ReservationStatus enum, update migration, sync frontend constants.

**Q: Why not just a string?**
A: Type safety, validation, prevents bugs, database efficiency.

**Q: How do I know what colors to use?**
A: STATUS_META has colors for all statuses - use those.

**Q: Can I transition directly from pending to checked_in?**
A: No, must go through confirmed first. Rule enforced in code.
