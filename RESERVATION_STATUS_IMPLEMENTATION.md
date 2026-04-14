# Reservation Status Implementation Guide

## Overview
The reservation status system has been refactored from simple string values to a proper enum-based system with validated state transitions, metadata, and dedicated API endpoints.

## What Changed

### Backend Changes

#### 1. New Enum: `ReservationStatus` 
**File**: `com/timorun/hmms/entities/ReservationStatus.java`

Defines all valid statuses with:
- Value (lowercase, for API/UI)
- Label (human-readable)
- Color (hex for UI)
- Transition rules (what statuses can follow)
- Terminal state detection

**Statuses**:
- `PENDING` (pending) - Initial state
- `CONFIRMED` (confirmed) - Reservation confirmed
- `CHECKED_IN` (checked_in) - Guest checked in
- `CHECKED_OUT` (checked_out) - Guest checked out (terminal)
- `CANCELLED` (cancelled) - Reservation cancelled (terminal)
- `NO_SHOW` (no_show) - Guest didn't show (terminal)

#### 2. Updated Entity: `Reservation.java`
Changed from `private String status;` to:
```java
@Enumerated(EnumType.STRING)
@Column(nullable = false)
private ReservationStatus status = ReservationStatus.PENDING;
```

#### 3. New DTO: `UpdateReservationStatusRequest.java`
For updating reservation status:
```java
{
  "status": "checked_in"  // or "checked_out", "cancelled", etc.
}
```

#### 4. Updated DTO: `ReservationResponse.java`
Now includes:
- `status` - enum value (e.g., "confirmed")
- `statusLabel` - human-readable label (e.g., "Confirmed")
- `statusColor` - UI color (e.g., "#27AE60")

#### 5. New Controller Endpoint: `ReservationController.java`
```
PATCH /api/reservations/{id}/status
Body: { "status": "new_status_value" }
```

Validates transitions and returns detailed error messages on invalid transitions.

#### 6. Updated Service: `ReservationService.java`
- `updateReservationStatus(Long reservationId, UpdateReservationStatusRequest request)` - New method
- All methods now use enum instead of strings
- Status transitions are validated

#### 7. Updated Repositories & Services
- `ReservationRepository.java` - Updated queries to use enum
- `OperationalViewService.java` - Updated to use enum
- `AnalyticsService.java` - Updated to use enum

### Frontend Changes

#### 1. New Constants File: `reservationStatus.js`
Centralized status metadata:
```javascript
export const RESERVATION_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

export const STATUS_META = {
  pending: { label: 'Pending', color: '#F39C12', canTransitionTo: [...] },
  // ...
};
```

Utility functions:
- `getAvailableTransitions(status)` - Get allowed next statuses
- `canTransitionTo(from, to)` - Check if transition is valid
- `getStatusLabel(status)` - Get human-readable label
- `getStatusColor(status)` - Get UI color

#### 2. New API Method: `updateReservationStatus()`
```javascript
// Usage:
await updateReservationStatus(123, 'checked_in');
```

## Status Transition Rules

```
PENDING → CONFIRMED or CANCELLED
CONFIRMED → CHECKED_IN or CANCELLED
CHECKED_IN → CHECKED_OUT or CANCELLED
CHECKED_OUT → (terminal - no transitions)
CANCELLED → (terminal - no transitions)
NO_SHOW → (terminal - no transitions)
```

## Database Migration

**File**: `db/migration/V8__add_reservation_status_enum.sql`

Converts the `status` column from VARCHAR to ENUM and updates any legacy data:
- Maps "completed" → "checked_out"
- Ensures all values are valid enum values

Run with Flyway (automatic on app startup).

## Implementation Examples

### 1. Update Reservation Status

**Backend**:
```java
UpdateReservationStatusRequest request = new UpdateReservationStatusRequest("checked_in");
ReservationResponse response = reservationService.updateReservationStatus(123L, request);
// Returns updated reservation with new status, label, and color
```

**Frontend**:
```javascript
try {
  const updated = await updateReservationStatus(reservationId, 'checked_in');
  console.log(`Status changed to: ${updated.statusLabel}`);
} catch (err) {
  console.error(err.message); // "Cannot change status of a cancelled reservation"
}
```

### 2. Filter by Status

**Backend** (unchanged):
```java
List<Reservation> confirmed = reservationRepository.findByStatus(ReservationStatus.CONFIRMED);
```

**Frontend** (updated):
```javascript
import { RESERVATION_STATUSES, canTransitionTo } from './api/reservationStatus';

const nextStatuses = ['confirmed', 'checked_in', 'checked_out']
  .filter(status => canTransitionTo(currentStatus, status));
```

### 3. Display Status with UI

**Frontend**:
```javascript
import { STATUS_META } from './api/reservationStatus';

function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  return (
    <span style={{ backgroundColor: meta.color, color: 'white' }}>
      {meta.label}
    </span>
  );
}
```

## Error Handling

Invalid status transitions return descriptive errors:

```json
{
  "error": "Cannot change status of a checked-out reservation"
}
```

Valid transitions prevent invalid operations:
- Can't check out an unchecked-in reservation
- Can't un-cancel a cancelled reservation
- Terminal states can't transition to anything

## Benefits

1. **Type Safety**: Enum prevents invalid status values
2. **Documented Transitions**: Clear rules on what's allowed
3. **Centralized Metadata**: Colors, labels, and UI info in one place
4. **Audit Trail**: All status changes are tracked with database values
5. **Frontend Consistency**: Shared constants between backend and frontend
6. **Error Prevention**: Validation prevents invalid state combinations
7. **UI Enhancements**: Status colors and labels always available from API

## Next Steps

1. Run the database migration (V8)
2. Restart the backend application (will apply migration automatically)
3. Test status transitions in the Calendar view
4. Update any other components that display or filter by status
5. Consider adding a status history/audit log for compliance

## Rollback

If needed, revert to string-based status:
```java
private String status;  // Rollback change
```

However, the database migration (V8) should be kept to maintain data consistency.
