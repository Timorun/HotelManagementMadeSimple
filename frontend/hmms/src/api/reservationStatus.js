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
 * usualTransitionTo is advisory only and used for frontend warnings.
 */
export const STATUS_META = {
  pending: { label: 'Pending', color: '#F39C12', usualTransitionTo: ['confirmed', 'cancelled', 'no_show'] },
  confirmed: { label: 'Confirmed', color: '#27AE60', usualTransitionTo: ['checked_in', 'cancelled', 'no_show'] },
  checked_in: { label: 'Checked In', color: '#3498DB', usualTransitionTo: ['checked_out'] },
  checked_out: { label: 'Checked Out', color: '#95A5A6', usualTransitionTo: [] },
  no_show: { label: 'No Show', color: '#E67E22', usualTransitionTo: ['pending', 'confirmed'] },
  cancelled: { label: 'Cancelled', color: '#E74C3C', usualTransitionTo: ['pending', 'confirmed'] }
};

/**
 * Get available status transitions for a given status
 */
export function getAvailableTransitions(currentStatus) {
  return STATUS_META[currentStatus]?.usualTransitionTo || [];
}

/**
 * Check if a status transition is logically recommended.
 */
export function isUsualTransition(fromStatus, toStatus) {
  return getAvailableTransitions(fromStatus).includes(toStatus);
}

/**
 * Returns a warning for unusual transitions. Returns null for recommended transitions.
 */
export function getTransitionWarning(fromStatus, toStatus) {
  if (!fromStatus || !toStatus || fromStatus === toStatus) {
    return null;
  }

  if (isUsualTransition(fromStatus, toStatus)) {
    return null;
  }

  const fromLabel = getStatusLabel(fromStatus);
  const toLabel = getStatusLabel(toStatus);
  return `Warning: ${fromLabel} -> ${toLabel} is unusual. Are you sure you want to proceed?`;
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
