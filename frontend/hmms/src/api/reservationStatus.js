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
  pending: { label: 'Pending', labelEs: 'Pendiente', color: '#F39C12', usualTransitionTo: ['confirmed', 'cancelled', 'no_show'] },
  confirmed: { label: 'Confirmed', labelEs: 'Confirmada', color: '#27AE60', usualTransitionTo: ['checked_in', 'cancelled', 'no_show'] },
  checked_in: { label: 'Checked In', labelEs: 'Check-in', color: '#3498DB', usualTransitionTo: ['checked_out'] },
  checked_out: { label: 'Checked Out', labelEs: 'Check-out', color: '#95A5A6', usualTransitionTo: [] },
  no_show: { label: 'No Show', labelEs: 'No presentado', color: '#E67E22', usualTransitionTo: ['pending', 'confirmed'] },
  cancelled: { label: 'Cancelled', labelEs: 'Cancelada', color: '#E74C3C', usualTransitionTo: ['pending', 'confirmed'] }
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
export function getTransitionWarning(fromStatus, toStatus, tr) {
  if (!fromStatus || !toStatus || fromStatus === toStatus) {
    return null;
  }

  if (isUsualTransition(fromStatus, toStatus)) {
    return null;
  }

  const fromLabel = getStatusLabel(fromStatus, tr);
  const toLabel = getStatusLabel(toStatus, tr);
  if (typeof tr === 'function') {
    return tr(
      `Warning: ${fromLabel} -> ${toLabel} is unusual. Are you sure you want to proceed?`,
      `Advertencia: ${fromLabel} -> ${toLabel} es inusual. Seguro que quieres continuar?`
    );
  }

  return `Warning: ${fromLabel} -> ${toLabel} is unusual. Are you sure you want to proceed?`;
}

/**
 * Get label for a status
 */
export function getStatusLabel(status, tr) {
  const meta = STATUS_META[status];
  if (!meta) {
    return status;
  }

  if (typeof tr === 'function') {
    return tr(meta.label, meta.labelEs || meta.label);
  }

  return meta.label;
}

/**
 * Get color for a status
 */
export function getStatusColor(status) {
  return STATUS_META[status]?.color || '#BDC3C7';
}
