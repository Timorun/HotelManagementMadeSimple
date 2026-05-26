import { differenceInDays, format, parseISO } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { STATUS_META, getTransitionWarning } from '../../api/reservationStatus';

function parseNumeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value) {
  const numeric = parseNumeric(value);
  if (numeric === null) {
    return '-';
  }

  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function getPricePerNight(checkIn, checkOut, totalPrice) {
  if (!checkIn || !checkOut) {
    return null;
  }

  try {
    const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));
    if (nights <= 0) {
      return null;
    }

    const total = parseNumeric(totalPrice);
    if (total === null) {
      return null;
    }

    return total / nights;
  } catch {
    return null;
  }
}

export function ReservationDetailsModal({
  reservation,
  suites,
  isEditing,
  setIsEditing,
  editForm,
  setEditForm,
  onClose,
  onSave,
  onRequestCancelReservation,
  saving,
  validationErrors,
  isEditValid,
  modalError,
  setModalError,
}) {
  const selectedSuite = suites.find((suite) => suite.suiteId === Number(editForm.suiteId));
  const status = reservation.status?.toLowerCase();
  const statusTransitionWarning = getTransitionWarning(status, editForm.status);

  const reservationNights = getPricePerNight(
    reservation.checkIn,
    reservation.checkOut,
    reservation.priceTotal
  );
  const editPricePerNight = getPricePerNight(
    editForm.checkIn,
    editForm.checkOut,
    editForm.priceTotal
  );

  let reservationNightCount = 0;
  let editNightCount = 0;

  try {
    reservationNightCount = differenceInDays(parseISO(reservation.checkOut), parseISO(reservation.checkIn));
  } catch {
    reservationNightCount = 0;
  }

  try {
    editNightCount = differenceInDays(parseISO(editForm.checkOut), parseISO(editForm.checkIn));
  } catch {
    editNightCount = 0;
  }

  const copyToClipboard = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setModalError(null);
    } catch (err) {
      console.error(`Failed to copy ${label}:`, err);
      setModalError(`Could not copy ${label}. Please copy manually.`);
    }
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px', width: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ marginBottom: '0.25rem' }}>
              {reservation.guestName} · {reservation.suiteName}
            </h3>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
              {reservation.email ? (
                <button
                  type="button"
                  onClick={() => copyToClipboard(reservation.email, 'email')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: '1px solid rgba(63, 156, 245, 0.25)',
                    background: 'rgba(63, 156, 245, 0.08)',
                    color: 'var(--primary)',
                    borderRadius: '999px',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Click to copy email"
                >
                  ✉ {reservation.email}
                </button>
              ) : null}

              {reservation.phone ? (
                <button
                  type="button"
                  onClick={() => copyToClipboard(reservation.phone, 'phone number')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: '1px solid rgba(46, 204, 113, 0.25)',
                    background: 'rgba(46, 204, 113, 0.1)',
                    color: '#1E8449',
                    borderRadius: '999px',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Click to copy phone number"
                >
                  ☎ {reservation.phone}
                </button>
              ) : null}

              {!reservation.email && !reservation.phone && (
                <span style={{ fontSize: '0.8rem', color: 'var(--dark-gray)' }}>-</span>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--dark-gray)' }}>
              from {format(parseISO(reservation.checkIn), 'MMMM d yyyy')}, to {format(parseISO(reservation.checkOut), 'MMMM d yyyy')}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving}>×</button>
        </div>

        <div className="modal-body">
          {modalError && (
            <div style={{
              padding: '1rem',
              marginBottom: '1rem',
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--danger)'
            }}>
              <AlertCircle size={20} />
              <span style={{ flex: 1, fontWeight: 500 }}>{modalError}</span>
              <button
                type="button"
                onClick={() => setModalError(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  padding: 0,
                  color: 'var(--danger)',
                }}
              >×</button>
            </div>
          )}

          {!isEditing ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <InfoRow label="Suite" value={reservation.suiteName} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InfoRow label="Check-in" value={format(parseISO(reservation.checkIn), 'dd/MM/yyyy')} />
                <InfoRow label="Check-out" value={format(parseISO(reservation.checkOut), 'dd/MM/yyyy')} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InfoRow label="Guests" value={String(reservation.numGuests)} />
                <InfoRow label="Total Price" value={formatCurrency(reservation.priceTotal)} />
              </div>

              <InfoRow
                label="Price per Night"
                value={
                  reservationNights === null
                    ? '-'
                    : `${formatCurrency(reservationNights)} (${reservationNightCount} night${reservationNightCount === 1 ? '' : 's'})`
                }
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InfoRow label="Channel" value={reservation.channel || '-'} capitalize />
                <InfoRow label="Status" value={STATUS_META[status]?.label || status || '-'} />
              </div>

              <InfoRow label={`Guest Notes of ${reservation.guestDisplayName || reservation.guestName || `Guest #${reservation.guestId}`}`} value={reservation.guestNotes || '-'} />
              <InfoRow label="Reservation Notes (for this stay only)" value={reservation.notes || '-'} />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {validationErrors.length > 0 && (
                <div className="error-message" style={{ marginBottom: '0.25rem' }}>
                  {validationErrors.map((msg) => (
                    <div key={msg}>• {msg}</div>
                  ))}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Suite</label>
                <select
                  className="form-select"
                  value={editForm.suiteId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, suiteId: e.target.value }))}
                >
                  {suites.map((suite) => (
                    <option key={suite.suiteId} value={suite.suiteId}>
                      {suite.suiteName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Check-in</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.checkIn}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, checkIn: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Check-out</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editForm.checkOut}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, checkOut: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Guests</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedSuite?.capacity || undefined}
                    className="form-input"
                    value={editForm.numGuests}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, numGuests: e.target.value }))}
                  />
                  {selectedSuite?.capacity && (
                    <small style={{ color: 'var(--dark-gray)' }}>Max: {selectedSuite.capacity}</small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Total Price (EUR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    value={editForm.priceTotal}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, priceTotal: e.target.value }))}
                  />
                  {editPricePerNight !== null && (
                    <small style={{ color: 'var(--dark-gray)' }}>
                      Price per night: {formatCurrency(editPricePerNight)} ({editNightCount} night{editNightCount === 1 ? '' : 's'})
                    </small>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Channel</label>
                  <select
                    className="form-select"
                    value={editForm.channel}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, channel: e.target.value }))}
                  >
                    <option value="direct">Direct</option>
                    <option value="booking.com">Booking.com</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="expedia">Expedia</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked In</option>
                    <option value="checked_out">Checked Out</option>
                    <option value="no_show">No Show</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {statusTransitionWarning && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--warning)',
                      background: 'rgba(243, 156, 18, 0.12)',
                      color: '#7A4E00',
                      fontSize: '0.875rem',
                    }}>
                      {statusTransitionWarning}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Guest Notes of {reservation.guestDisplayName || reservation.guestName || `Guest #${reservation.guestId}`}
                </label>
                <textarea
                  className="form-textarea"
                  value={editForm.guestNotes || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, guestNotes: e.target.value }))}
                  placeholder="Guest profile notes (preferences, allergies, communication reminders)."
                />
                <small style={{ color: 'var(--dark-gray)' }}>
                  Saved on the guest profile and visible on all reservations for this guest.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Reservation Notes (for this stay only)</label>
                <textarea
                  className="form-textarea"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Stay-specific notes for this reservation only."
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            {isEditing && reservation.status?.toLowerCase() !== 'cancelled' && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={onRequestCancelReservation}
                disabled={saving}
              >
                Cancel reservation
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            {!isEditing ? (
              <button
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                Edit reservation
              </button>
            ) : (
              <>
                <button className="btn btn-outline" onClick={() => setIsEditing(false)} disabled={saving}>
                  Back (discard changes)
                </button>
                <button className="btn btn-primary" onClick={onSave} disabled={saving || !isEditValid}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, capitalize = false }) {
  return (
    <div style={{
      border: '1px solid var(--gray)',
      borderRadius: '8px',
      padding: '0.6rem 0.75rem',
      background: 'var(--white)',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontWeight: 600, textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</div>
    </div>
  );
}

export function ConfirmCancelReservationModal({ reservation, saving, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Confirm cancellation</h3>
          <button className="modal-close" onClick={onClose} disabled={saving}>×</button>
        </div>

        <div className="modal-body">
          <p>
            Cancel reservation <strong>#{reservation.reservationId}</strong> for <strong>{reservation.guestName}</strong>?
          </p>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>
            Keep reservation
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={saving}>
            {saving ? 'Cancelling...' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
