# Reservation Status API Reference

## Endpoints

### Update Reservation Status
```
PATCH /api/reservations/{id}/status
Content-Type: application/json

Request Body:
{
  "status": "checked_in"  // New status value
}

Response (200 OK):
{
  "reservationId": 123,
  "suiteId": 1,
  "suiteName": "Canal View Suite",
  "guestId": 456,
  "guestName": "John Doe",
  "email": "john@example.com",
  "checkIn": "2026-03-10",
  "checkOut": "2026-03-13",
  "numGuests": 2,
  "priceTotal": 450.00,
  "channel": "direct",
  "status": "checked_in",
  "statusLabel": "Checked In",
  "statusColor": "#3498DB",
  "createdAt": "2026-03-08T10:30:00"
}

Error (400 Bad Request):
{
  "error": "Cannot change status of a checked-out reservation"
}
```

### Cancel Reservation
```
PATCH /api/reservations/{id}/cancel
Content-Type: application/json

Response (200 OK):
{
  ...same as above with status: "cancelled", statusLabel: "Cancelled"...
}
```

## Valid Status Values

| Status | Label | Color | Transitions | Terminal |
|--------|-------|-------|-------------|----------|
| pending | Pending | #F39C12 | confirmed, cancelled | No |
| confirmed | Confirmed | #27AE60 | checked_in, cancelled | No |
| checked_in | Checked In | #3498DB | checked_out, cancelled | No |
| checked_out | Checked Out | #95A5A6 | None | Yes |
| cancelled | Cancelled | #E74C3C | None | Yes |
| no_show | No Show | #E67E22 | None | Yes |

## Frontend Functions

### Import Constants
```javascript
import { 
  RESERVATION_STATUSES,
  STATUS_META,
  getAvailableTransitions,
  canTransitionTo,
  getStatusLabel,
  getStatusColor
} from './api/reservationStatus';
```

### Check Valid Transition
```javascript
if (canTransitionTo('confirmed', 'checked_in')) {
  // Valid - can proceed
}
```

### Get Available Next Statuses
```javascript
const nextOptions = getAvailableTransitions('confirmed');
// Returns: ['checked_in', 'cancelled']
```

### Get Status Display Info
```javascript
const label = getStatusLabel('checked_in');      // "Checked In"
const color = getStatusColor('checked_in');      // "#3498DB"
```

### Update Status via API
```javascript
import { updateReservationStatus } from './api/backend';

try {
  const updated = await updateReservationStatus(reservationId, 'checked_in');
  console.log(`Status: ${updated.statusLabel} (${updated.statusColor})`);
} catch (error) {
  console.error(error.message); // Detailed error message
}
```

## Common Workflows

### Check-in Guest
```javascript
// User clicks "Check In" button
if (canTransitionTo(reservation.status, 'checked_in')) {
  const updated = await updateReservationStatus(reservation.reservationId, 'checked_in');
  setReservation(updated);
}
```

### Check-out Guest
```javascript
// User clicks "Check Out" button
if (canTransitionTo(reservation.status, 'checked_out')) {
  const updated = await updateReservationStatus(reservation.reservationId, 'checked_out');
  // Also trigger room cleaning workflow
}
```

### Cancel Reservation
```javascript
// User clicks "Cancel" button
const updated = await updateReservationStatus(reservation.reservationId, 'cancelled');
```

### Display Status Badge
```javascript
function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  return (
    <span 
      style={{
        backgroundColor: meta.color,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.875rem'
      }}
    >
      {meta.label}
    </span>
  );
}
```

### Status Dropdown (only valid transitions)
```javascript
function StatusSelector({ reservation, onStatusChange }) {
  const availableStatuses = getAvailableTransitions(reservation.status);
  
  return (
    <select 
      value={reservation.status}
      onChange={(e) => onStatusChange(e.target.value)}
    >
      <option value="">{reservation.statusLabel}</option>
      {availableStatuses.map(status => (
        <option key={status} value={status}>
          {getStatusLabel(status)}
        </option>
      ))}
    </select>
  );
}
```

## Status Transition Logic

### Happy Path (Normal Reservation)
```
PENDING 
  → (confirm reservation) CONFIRMED
  → (check in guest) CHECKED_IN
  → (check out guest) CHECKED_OUT ✓
```

### Cancellation at Any Point
```
PENDING → CANCELLED ✓
CONFIRMED → CANCELLED ✓
CHECKED_IN → CANCELLED ✓
CHECKED_OUT → ✗ (too late to cancel)
```

### No Show
```
(Administrator sets directly or via separate API)
PENDING → NO_SHOW (separate endpoint if needed)
```

## Database Schema

```sql
ALTER TABLE reservations 
MODIFY COLUMN status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') 
NOT NULL DEFAULT 'pending';
```

## Migration Notes

- Old string values are automatically converted on first run
- "completed" status (if any) maps to "checked_out"
- Default for new reservations: "pending"
- All existing reservations are preserved and converted

## Error Messages

| Situation | Error Message |
|-----------|---------------|
| Invalid status value | `Invalid reservation status: xyz` |
| Terminal state transition | `Cannot change status of a checked-out reservation` |
| Cancelled reservation | `Cannot change status of a cancelled reservation` |
| Already in that status | `Status is already Checked In` |
| No Show transition | `Cannot change status of a no-show reservation` |

## Performance Notes

- Status is stored as ENUM in database (space-efficient)
- Frontend constants loaded once (no repeated API calls)
- Transition validation happens in both frontend and backend
- No N+1 query issues (status is a column, not a relation)

## Future Enhancements

1. Add status history/audit log
2. Add reason/notes for status changes
3. Add automatic status transitions (e.g., auto check-out after checkout time)
4. Add status change notifications
5. Add status-based reporting and analytics
6. Add role-based status transition permissions
