/**
 * Reservation status constants - should match backend enum values
 */
export const RESERVATION_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
};

/**
 * Status display metadata (label, color, icon)
 */
export const STATUS_META = {
  pending: { label: 'Pending', color: '#F39C12', canTransitionTo: ['confirmed', 'cancelled'] },
  confirmed: { label: 'Confirmed', color: '#27AE60', canTransitionTo: ['checked_in', 'cancelled'] },
  checked_in: { label: 'Checked In', color: '#3498DB', canTransitionTo: ['checked_out', 'cancelled'] },
  checked_out: { label: 'Checked Out', color: '#95A5A6', canTransitionTo: [] },
  cancelled: { label: 'Cancelled', color: '#E74C3C', canTransitionTo: [] },
  no_show: { label: 'No Show', color: '#E67E22', canTransitionTo: [] },
};

/**
 * Get available status transitions for a given status
 */
export function getAvailableTransitions(currentStatus) {
  return STATUS_META[currentStatus]?.canTransitionTo || [];
}

/**
 * Check if a status transition is allowed
 */
export function canTransitionTo(fromStatus, toStatus) {
  return getAvailableTransitions(fromStatus).includes(toStatus);
}

/**
 * Get label for a status
 */
export function getStatusLabel(status) {
  return STATUS_META[status]?.label || status;
}

/**
 * Get color for a status
 */
export function getStatusColor(status) {
  return STATUS_META[status]?.color || '#BDC3C7';
}
