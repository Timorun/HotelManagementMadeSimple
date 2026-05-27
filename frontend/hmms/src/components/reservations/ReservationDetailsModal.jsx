import { useEffect, useMemo, useState } from 'react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { AlertCircle, CalendarDays, Check, Copy, Euro, Hotel, Mail, MessageCircle, Phone, Users, Send } from 'lucide-react';
import { STATUS_META, getTransitionWarning } from '../../api/reservationStatus';
import { copyTextToClipboard } from '../../utils/clipboard';

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

function formatDecimal(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return value.toFixed(2);
}

function safeFormatDate(value, formatPattern = 'dd/MM/yyyy') {
  if (!value) {
    return '-';
  }

  try {
    return format(parseISO(value), formatPattern);
  } catch {
    return String(value);
  }
}

function getNightCount(checkIn, checkOut) {
  if (!checkIn || !checkOut) {
    return 0;
  }

  try {
    return Math.max(0, differenceInDays(parseISO(checkOut), parseISO(checkIn)));
  } catch {
    return 0;
  }
}

function getPricePerNight(checkIn, checkOut, totalPrice) {
  const nights = getNightCount(checkIn, checkOut);
  if (nights <= 0) {
    return null;
  }

  const total = parseNumeric(totalPrice);
  if (total === null) {
    return null;
  }

  return total / nights;
}

function toWhatsAppLink(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  if (!cleaned) {
    return null;
  }

  const normalized = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned.replace(/^0+/, '');
  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized}`;
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
  const [priceInputSource, setPriceInputSource] = useState('total');
  const [copiedField, setCopiedField] = useState(null);

  const selectedSuite = useMemo(
    () => suites.find((suite) => suite.suiteId === Number(editForm.suiteId)),
    [suites, editForm.suiteId]
  );

  const status = reservation.status?.toLowerCase();
  const statusTransitionWarning = getTransitionWarning(status, editForm.status);

  const reservationNightCount = getNightCount(reservation.checkIn, reservation.checkOut);
  const editNightCount = getNightCount(editForm.checkIn, editForm.checkOut);
  const reservationPricePerNight = getPricePerNight(reservation.checkIn, reservation.checkOut, reservation.priceTotal);
  const editPricePerNight = getPricePerNight(editForm.checkIn, editForm.checkOut, editForm.priceTotal);

  const mailtoLink = reservation.email ? `mailto:${reservation.email}` : null;
  const whatsappLink = toWhatsAppLink(reservation.phone);

  useEffect(() => {
    setPriceInputSource('total');
  }, [reservation.reservationId, isEditing]);

  useEffect(() => {
    if (!isEditing || editNightCount <= 0) {
      return;
    }

    setEditForm((prev) => {
      if (priceInputSource === 'perNight') {
        const parsedPerNight = parseNumeric(prev.pricePerNight);
        if (parsedPerNight === null) {
          return prev;
        }

        const nextTotal = formatDecimal(parsedPerNight * editNightCount);
        if (nextTotal === prev.priceTotal) {
          return prev;
        }

        return {
          ...prev,
          priceTotal: nextTotal,
        };
      }

      const parsedTotal = parseNumeric(prev.priceTotal);
      if (parsedTotal === null) {
        return prev;
      }

      const nextPerNight = formatDecimal(parsedTotal / editNightCount);
      if (nextPerNight === prev.pricePerNight) {
        return prev;
      }

      return {
        ...prev,
        pricePerNight: nextPerNight,
      };
    });
  }, [editNightCount, isEditing, priceInputSource, setEditForm]);

  const handleFieldChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePricePerNightChange = (value) => {
    setPriceInputSource('perNight');

    setEditForm((prev) => {
      const nextForm = {
        ...prev,
        pricePerNight: value,
      };

      const parsedPerNight = parseNumeric(value);
      if (parsedPerNight !== null && editNightCount > 0) {
        nextForm.priceTotal = formatDecimal(parsedPerNight * editNightCount);
      }

      return nextForm;
    });
  };

  const handlePriceTotalChange = (value) => {
    setPriceInputSource('total');

    setEditForm((prev) => {
      const nextForm = {
        ...prev,
        priceTotal: value,
      };

      const parsedTotal = parseNumeric(value);
      if (parsedTotal !== null && editNightCount > 0) {
        nextForm.pricePerNight = formatDecimal(parsedTotal / editNightCount);
      }

      return nextForm;
    });
  };

  const handleCopyContact = async (field, value) => {
    const copied = await copyTextToClipboard(value);
    if (!copied) {
      setModalError('Unable to copy to clipboard. Please copy manually.');
      return;
    }

    setCopiedField(field);
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', width: '95%' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ marginBottom: '0.2rem' }}>
              {reservation.guestDisplayName || reservation.guestName} | {reservation.suiteName}
            </h3>

            <div className="reservation-contact-row">
              {reservation.email ? (
                <div className="reservation-contact-line">
                  <span className="reservation-contact-value">
                    <Mail size={13} />
                    {reservation.email}
                  </span>
                  <span className="contact-actions-inline">
                    <a
                      className="contact-action-btn action-primary"
                      href={mailtoLink}
                      aria-label="Send email"
                    >
                      <Send size={12} />
                      Send
                    </a>
                    <button
                      type="button"
                      className="contact-action-btn action-copy"
                      onClick={() => handleCopyContact('email', reservation.email)}
                      aria-label="Copy email address"
                    >
                      {copiedField === 'email' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedField === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  </span>
                </div>
              ) : null}

              {reservation.phone ? (
                <div className="reservation-contact-line">
                  <span className="reservation-contact-value">
                    <Phone size={13} />
                    {reservation.phone}
                  </span>
                  <span className="contact-actions-inline">
                    {whatsappLink ? (
                      <a
                        className="contact-action-btn action-whatsapp"
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label="Open WhatsApp chat"
                      >
                        <MessageCircle size={12} />
                        WhatsApp
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="contact-action-btn action-copy"
                      onClick={() => handleCopyContact('phone', reservation.phone)}
                      aria-label="Copy phone number"
                    >
                      {copiedField === 'phone' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedField === 'phone' ? 'Copied' : 'Copy'}
                    </button>
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-1" style={{ fontSize: '0.85rem', color: 'var(--dark-gray)' }}>
              from {safeFormatDate(reservation.checkIn, 'MMMM d yyyy')}, to {safeFormatDate(reservation.checkOut, 'MMMM d yyyy')}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} disabled={saving}>x</button>
        </div>

        <div className="modal-body">
          {modalError && (
            <div
              style={{
                padding: '1rem',
                marginBottom: '1rem',
                background: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid var(--danger)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--danger)',
              }}
            >
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
              >
                x
              </button>
            </div>
          )}

          <div className="reservation-modal-pane">
            {!isEditing ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <InfoRow icon={Hotel} label="Suite" value={reservation.suiteName} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <InfoRow icon={CalendarDays} label="Check-in" value={safeFormatDate(reservation.checkIn)} />
                  <InfoRow icon={CalendarDays} label="Check-out" value={safeFormatDate(reservation.checkOut)} />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(120px, 0.7fr) minmax(170px, 1fr) minmax(170px, 1fr)',
                    gap: '0.75rem',
                  }}
                >
                  <InfoRow icon={Users} label="Guests" value={String(reservation.numGuests)} />
                  <InfoRow
                    icon={Euro}
                    label="Price per Night"
                    value={
                      reservationPricePerNight === null
                        ? '-'
                        : `${formatCurrency(reservationPricePerNight)} (${reservationNightCount} night${reservationNightCount === 1 ? '' : 's'})`
                    }
                  />
                  <InfoRow icon={Euro} label="Total Price" value={formatCurrency(reservation.priceTotal)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <InfoRow label="Channel" value={reservation.channel || '-'} capitalize />
                  <InfoRow label="Status" value={STATUS_META[status]?.label || status || '-'} />
                </div>

                <InfoRow
                  label={`Guest Notes of ${reservation.guestDisplayName || reservation.guestName || `Guest #${reservation.guestId}`}`}
                  value={reservation.guestNotes || '-'}
                />
                <InfoRow label="Reservation Notes" value={reservation.notes || '-'} />
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {validationErrors.length > 0 && (
                  <div className="error-message" style={{ marginBottom: '0.25rem' }}>
                    {validationErrors.map((msg) => (
                      <div key={msg}>- {msg}</div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Suite</label>
                  <select
                    className="form-select"
                    value={editForm.suiteId}
                    onChange={(e) => handleFieldChange('suiteId', e.target.value)}
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
                    <label className="form-label">
                      <CalendarDays size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Check-in
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.checkIn}
                      onChange={(e) => handleFieldChange('checkIn', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <CalendarDays size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Check-out
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={editForm.checkOut}
                      onChange={(e) => handleFieldChange('checkOut', e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(120px, 0.7fr) minmax(170px, 1fr) minmax(170px, 1fr)',
                    gap: '0.75rem',
                  }}
                >
                  <div className="form-group" style={{ minWidth: 0 }}>
                    <label className="form-label">
                      <Users size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Guests
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedSuite?.capacity || undefined}
                      className="form-input"
                      value={editForm.numGuests}
                      onChange={(e) => handleFieldChange('numGuests', e.target.value)}
                    />
                    {selectedSuite?.capacity && (
                      <small style={{ color: 'var(--dark-gray)' }}>Max capacity: {selectedSuite.capacity}</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Euro size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Price per Night
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      value={editForm.pricePerNight || ''}
                      onChange={(e) => handlePricePerNightChange(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Euro size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      Total Price (EUR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      value={editForm.priceTotal}
                      onChange={(e) => handlePriceTotalChange(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Channel</label>
                    <select
                      className="form-select"
                      value={editForm.channel}
                      onChange={(e) => handleFieldChange('channel', e.target.value)}
                    >
                      <option value="direct">Direct</option>
                      <option value="booking.com">Booking.com</option>
                      <option value="airbnb">Airbnb</option>
                      <option value="expedia">Expedia</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editForm.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="checked_in">Checked In</option>
                      <option value="checked_out">Checked Out</option>
                      <option value="no_show">No Show</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {statusTransitionWarning && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.65rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--warning)',
                          background: 'rgba(243, 156, 18, 0.12)',
                          color: '#7A4E00',
                          fontSize: '0.875rem',
                        }}
                      >
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
                    onChange={(e) => handleFieldChange('guestNotes', e.target.value)}
                    placeholder="Guest profile notes (preferences, allergies, communication reminders)."
                  />
                  <small style={{ color: 'var(--dark-gray)' }}>
                    Saved on the guest profile and visible on all reservations for this guest.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Reservation Notes</label>
                  <textarea
                    className="form-textarea"
                    value={editForm.notes}
                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                    placeholder="Stay-specific notes for this reservation only."
                  />
                </div>
              </div>
            )}
          </div>
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
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
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

function InfoRow({ label, value, capitalize = false, icon: Icon }) {
  return (
    <div
      style={{
        border: '1px solid var(--gray)',
        borderRadius: '8px',
        padding: '0.6rem 0.75rem',
        background: 'var(--white)',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          color: 'var(--dark-gray)',
          marginBottom: '0.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        {Icon ? <Icon size={13} /> : null}
        {label}
      </div>
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
          <button className="modal-close" onClick={onClose} disabled={saving}>x</button>
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
