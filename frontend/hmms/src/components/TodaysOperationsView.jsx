import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, parseISO, subDays } from 'date-fns';
import { Check, ClipboardCheck, Eye, Home, LogIn, LogOut, RefreshCw, Undo2 } from 'lucide-react';
import {
  fetchGuest,
  fetchGuests,
  fetchOperationsDashboard,
  fetchReservations,
  fetchSuites,
  fetchSyncConflicts,
  updateGuest,
  updateReservation,
  updateReservationStatus,
  cancelReservation,
} from '../api/backend';
import { STATUS_META, getStatusLabel } from '../api/reservationStatus';
import { useI18n } from '../context/I18nContext';
import { ConfirmCancelReservationModal, ReservationDetailsModal } from './reservations/ReservationDetailsModal';

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatCurrencyValue(value) {
  if (!Number.isFinite(value)) {
    return '';
  }
  return value.toFixed(2);
}

function getPricePerNightValue(checkIn, checkOut, totalPrice) {
  if (!checkIn || !checkOut) {
    return '';
  }

  try {
    const nights = Math.max(0, (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    if (nights <= 0) {
      return '';
    }

    const parsedTotal = Number.parseFloat(totalPrice || 0);
    if (!Number.isFinite(parsedTotal)) {
      return '';
    }

    return formatCurrencyValue(parsedTotal / nights);
  } catch {
    return '';
  }
}

function isReservationOccupyingToday(reservation, todayKey) {
  const status = String(reservation.status || '').toLowerCase();
  if (!['pending', 'awaiting_payment', 'confirmed', 'checked_in'].includes(status)) {
    return false;
  }

  if (!reservation.checkIn || !reservation.checkOut) {
    return false;
  }

  return reservation.checkIn <= todayKey && reservation.checkOut > todayKey;
}

function countryCodeToFlag(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return '--';
  }

  return String.fromCodePoint(...normalized.split('').map((char) => 127397 + char.charCodeAt(0)));
}

function StatusPill({ status, tr }) {
  const key = String(status || '').toLowerCase();
  return (
    <span className="status-pill" style={{ background: STATUS_META[key]?.color || '#BDC3C7' }}>
      {getStatusLabel(key, tr) || key}
    </span>
  );
}

// Unpaid arrivals can still be checked in (e.g. they pay on arrival); their status pill shows it
const EXPECTED_ARRIVAL_STATUSES = ['pending', 'awaiting_payment', 'confirmed'];
const IN_HOUSE_STATUSES = ['confirmed', 'checked_in'];

export default function TodaysOperationsView() {
  const { tr, dateLocale } = useI18n();
  const [arrivalsToday, setArrivalsToday] = useState([]);
  const [departuresToday, setDeparturesToday] = useState([]);
  const [suites, setSuites] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());
  const [syncConflicts, setSyncConflicts] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [isEditingReservation, setIsEditingReservation] = useState(false);
  const [savingReservation, setSavingReservation] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [editForm, setEditForm] = useState({
    suiteId: '',
    checkIn: '',
    checkOut: '',
    numGuests: 1,
    pricePerNight: '',
    priceTotal: '',
    channel: 'direct',
    notes: '',
    guestNotes: '',
    status: 'pending',
  });

  const activeSuites = useMemo(() => suites.filter((suite) => suite.active), [suites]);

  const guestById = useMemo(() => {
    const map = new Map();
    guests.forEach((guest) => {
      map.set(Number(guest.guestId), guest);
    });
    return map;
  }, [guests]);

  const quickViewSuites = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    return [...activeSuites]
      .sort((left, right) => String(left.suiteName || '').localeCompare(String(right.suiteName || ''), undefined, { sensitivity: 'base' }))
      .map((suite) => {
        const occupyingReservation = reservations
          .filter((reservation) => Number(reservation.suiteId) === Number(suite.suiteId))
          .filter((reservation) => isReservationOccupyingToday(reservation, todayKey))
          .sort((left, right) => String(left.checkIn || '').localeCompare(String(right.checkIn || '')))[0] || null;

        const guest = occupyingReservation ? guestById.get(Number(occupyingReservation.guestId)) : null;
        const nationalityCode = guest?.nationalityCode || '';

        return {
          suite,
          reservation: occupyingReservation,
          guest,
          flag: countryCodeToFlag(nationalityCode),
          nationality: guest?.nationalityName || nationalityCode || tr('Nationality unknown', 'Nacionalidad desconocida'),
        };
      });
  }, [activeSuites, reservations, guestById, tr]);

  const occupancyCount = useMemo(
    () => quickViewSuites.filter((entry) => Boolean(entry.reservation)).length,
    [quickViewSuites]
  );

  const getEditValidationErrors = () => {
    const errors = [];
    const selectedSuite = activeSuites.find((suite) => suite.suiteId === Number(editForm.suiteId));
    const numGuests = Number(editForm.numGuests);
    const priceTotal = Number(editForm.priceTotal);

    if (!editForm.checkIn || !editForm.checkOut) {
      errors.push(tr('Check-in and check-out dates are required.', 'Las fechas de check-in y check-out son obligatorias.'));
    } else if (parseISO(editForm.checkOut) <= parseISO(editForm.checkIn)) {
      errors.push(tr('Check-out must be after check-in.', 'El check-out debe ser posterior al check-in.'));
    }

    if (!Number.isFinite(numGuests) || numGuests < 1) {
      errors.push(tr('Guests must be at least 1.', 'Los huespedes deben ser al menos 1.'));
    }

    if (selectedSuite?.capacity && numGuests > selectedSuite.capacity) {
      errors.push(tr(`Guests exceed suite capacity (${selectedSuite.capacity}).`, `Los huespedes exceden la capacidad de la suite (${selectedSuite.capacity}).`));
    }

    if (!Number.isFinite(priceTotal) || priceTotal < 0) {
      errors.push(tr('Price must be 0 or higher.', 'El precio debe ser 0 o mayor.'));
    }

    return errors;
  };

  const reservationEditValidationErrors = useMemo(
    () => getEditValidationErrors(),
    [editForm, activeSuites]
  );
  const isReservationEditValid = reservationEditValidationErrors.length === 0;

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }

    const today = new Date();
    const from = format(subDays(today, 45), 'yyyy-MM-dd');
    const to = format(addDays(today, 45), 'yyyy-MM-dd');

    try {
      const [operationsData, suitesData, reservationsData, guestsData] = await Promise.all([
        fetchOperationsDashboard(),
        fetchSuites(),
        fetchReservations(from, to),
        fetchGuests(),
      ]);

      setArrivalsToday(operationsData.arrivalsToday || []);
      setDeparturesToday(operationsData.departuresToday || []);
      setSuites(suitesData || []);
      setReservations(reservationsData || []);
      setGuests(guestsData || []);
      setLastUpdated(new Date());
      // Double bookings found by the booking.com calendar sync (non-blocking)
      fetchSyncConflicts().then((conflicts) => setSyncConflicts(conflicts || [])).catch(() => {});
      setError(null);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const openReservationModal = (reservation) => {
    if (!reservation) {
      return;
    }

    setSelectedReservation(reservation);
    setModalError(null);
    setEditForm({
      suiteId: reservation.suiteId,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,
      numGuests: reservation.numGuests,
      pricePerNight: getPricePerNightValue(reservation.checkIn, reservation.checkOut, reservation.priceTotal),
      priceTotal: reservation.priceTotal,
      channel: reservation.channel || 'direct',
      notes: reservation.notes || '',
      guestNotes: reservation.guestNotes || '',
      status: reservation.status || 'pending',
    });
    setIsEditingReservation(false);
    setShowReservationModal(true);
  };

  const closeReservationModal = () => {
    setShowReservationModal(false);
    setShowCancelConfirmModal(false);
    setSelectedReservation(null);
    setIsEditingReservation(false);
    setModalError(null);
  };

  useEffect(() => {
    if (!showReservationModal && !showCancelConfirmModal) {
      return undefined;
    }

    const handleEscapeKey = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (showCancelConfirmModal) {
        if (!savingReservation) {
          setShowCancelConfirmModal(false);
        }
        return;
      }

      if (showReservationModal && !savingReservation) {
        closeReservationModal();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);

    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showReservationModal, showCancelConfirmModal, savingReservation, closeReservationModal]);

  const requestCancelReservation = () => {
    setShowCancelConfirmModal(true);
  };

  const handleSaveReservation = async () => {
    if (!selectedReservation) {
      return;
    }

    if (!isReservationEditValid) {
      setModalError(reservationEditValidationErrors[0]);
      return;
    }

    try {
      setSavingReservation(true);
      setModalError(null);

      const statusChanged = editForm.status !== selectedReservation.status;

      await updateReservation(selectedReservation.reservationId, {
        suiteId: parseInt(editForm.suiteId, 10),
        guestId: selectedReservation.guestId,
        checkIn: editForm.checkIn,
        checkOut: editForm.checkOut,
        numGuests: parseInt(editForm.numGuests, 10),
        priceTotal: parseFloat(editForm.priceTotal),
        channel: editForm.channel,
        notes: editForm.notes,
      });

      if (statusChanged) {
        await updateReservationStatus(selectedReservation.reservationId, editForm.status);
      }

      let guestNotesSyncError = null;
      const guestNotesChanged = (editForm.guestNotes || '') !== (selectedReservation.guestNotes || '');
      if (guestNotesChanged && selectedReservation.guestId) {
        try {
          const guestProfile = await fetchGuest(selectedReservation.guestId);
          await updateGuest(selectedReservation.guestId, {
            firstName: guestProfile.firstName,
            lastName: guestProfile.lastName,
            email: guestProfile.email,
            phone: guestProfile.phone,
            nationalityCode: guestProfile.nationalityCode,
            marketingConsent: guestProfile.marketingConsent,
            notes: editForm.guestNotes || '',
          });
        } catch (guestErr) {
          console.error('Failed to update guest profile notes:', guestErr);
          guestNotesSyncError = tr('Reservation was saved, but guest profile notes could not be saved. Please try again.', 'La reserva se guardo, pero no se pudieron guardar las notas del huesped. Intentalo de nuevo.');
        }
      }

      await loadData();

      if (guestNotesSyncError) {
        setModalError(guestNotesSyncError);
        return;
      }

      closeReservationModal();
    } catch (err) {
      console.error('Failed to update reservation:', err);
      setModalError(err?.message || tr('Failed to update reservation', 'No se pudo actualizar la reserva'));
    } finally {
      setSavingReservation(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) {
      return;
    }

    try {
      setSavingReservation(true);
      setModalError(null);

      await cancelReservation(selectedReservation.reservationId);
      await loadData();
      closeReservationModal();
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
      setModalError(err?.message || tr('Failed to cancel reservation', 'No se pudo cancelar la reserva'));
    } finally {
      setShowCancelConfirmModal(false);
      setSavingReservation(false);
    }
  };

  const showToast = useCallback((message, type = 'success', onUndo = null) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type, onUndo });
    toastTimerRef.current = setTimeout(() => setToast(null), onUndo ? 8000 : 4000);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
  }, []);

  const applyStatusLocally = (reservationId, status) => {
    const update = (list) => list.map((item) => (
      Number(item.reservationId) === Number(reservationId) ? { ...item, status } : item
    ));
    setArrivalsToday(update);
    setDeparturesToday(update);
    setReservations(update);
  };

  // Optimistically switch a reservation's status (check-in / check-out) with an undo option.
  const changeStatus = async (reservation, nextStatus, { allowUndo = true } = {}) => {
    const reservationId = reservation.reservationId;
    const previousStatus = reservation.status;
    const guestName = reservation.guestDisplayName || reservation.guestName;

    setUpdatingIds((prev) => new Set(prev).add(reservationId));
    applyStatusLocally(reservationId, nextStatus);

    try {
      await updateReservationStatus(reservationId, nextStatus);

      let message = tr('Status updated', 'Estado actualizado');
      if (nextStatus === 'checked_in') {
        message = tr(`${guestName} checked in`, `${guestName} ha hecho check-in`);
      } else if (nextStatus === 'checked_out') {
        message = tr(`${guestName} checked out`, `${guestName} ha hecho check-out`);
      }

      showToast(
        message,
        'success',
        allowUndo
          ? () => changeStatus({ ...reservation, status: nextStatus }, previousStatus, { allowUndo: false })
          : null,
      );
    } catch (err) {
      applyStatusLocally(reservationId, previousStatus);
      showToast(err?.message || tr('Failed to update status', 'No se pudo actualizar el estado'), 'error');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(reservationId);
        return next;
      });
    }
  };

  const renderOperationsItem = (reservation, kind) => {
    const status = String(reservation.status || '').toLowerCase();
    const isUpdating = updatingIds.has(reservation.reservationId);
    const guestName = reservation.guestDisplayName || reservation.guestName;

    let action = null;
    if (kind === 'arrival') {
      if (EXPECTED_ARRIVAL_STATUSES.includes(status)) {
        action = (
          <button
            type="button"
            className="btn btn-success btn-sm"
            disabled={isUpdating}
            onClick={() => changeStatus(reservation, 'checked_in')}
          >
            <LogIn size={14} />
            {tr('Check in', 'Hacer check-in')}
          </button>
        );
      } else if (status === 'checked_in') {
        action = (
          <span className="operations-done">
            <Check size={14} />
            {tr('Arrived', 'Ha llegado')}
          </span>
        );
      }
    } else if (IN_HOUSE_STATUSES.includes(status)) {
      action = (
        <button
          type="button"
          className="btn btn-accent btn-sm"
          disabled={isUpdating}
          onClick={() => changeStatus(reservation, 'checked_out')}
        >
          <LogOut size={14} />
          {tr('Check out', 'Hacer check-out')}
        </button>
      );
    } else if (status === 'checked_out') {
      action = (
        <span className="operations-done">
          <Check size={14} />
          {tr('Left', 'Se ha ido')}
        </span>
      );
    }

    return (
      <li key={reservation.reservationId} className={`operations-item status-${status}`}>
        <div className="operations-item-main">
          <div className="operations-item-title">
            {guestName}
            <StatusPill status={status} tr={tr} />
          </div>
          <div className="operations-item-sub">{reservation.suiteName}</div>
          <em className="operations-item-sub muted">
            {pluralize(reservation.numGuests, tr('guest', 'huesped'), tr('guests', 'huespedes'))} | {tr('Ref', 'Ref')} #{reservation.reservationId}
          </em>
        </div>
        <div className="operations-item-actions">
          {action}
          <button
            type="button"
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => openReservationModal(reservation)}
            aria-label={tr('View reservation', 'Ver reserva')}
            title={tr('View reservation', 'Ver reserva')}
          >
            <Eye size={16} />
          </button>
        </div>
      </li>
    );
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">{tr('Loading operations...', 'Cargando operaciones...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        {tr("Could not load today's operations. Please refresh and try again.", 'No se pudieron cargar las operaciones de hoy. Actualiza e intentalo de nuevo.')}
      </div>
    );
  }

  return (
    <div className="operations-page">
      <section className="card operations-headbar mb-3">
        <div className="operations-hero-top">
          <div>
            <h2 className="operations-title">
              <ClipboardCheck size={28} />
              {format(new Date(), 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
            </h2>
            <p className="operations-subtitle">
              {tr('Last updated', 'Ultima actualizacion')} {format(lastUpdated, 'HH:mm')}
            </p>
          </div>

          <button
            onClick={() => loadData(true)}
            className="btn btn-outline btn-sm"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
            {refreshing ? tr('Refreshing...', 'Actualizando...') : tr('Refresh', 'Actualizar')}
          </button>
        </div>
      </section>

      {syncConflicts.length > 0 && (
        <section className="card sync-conflicts mb-3" role="alert">
          <strong>
            {tr(
              'Possible double booking: these booking.com stays overlap another reservation in the same suite.',
              'Posible doble reserva: estas estancias de booking.com coinciden con otra reserva en la misma suite.',
            )}
          </strong>
          <ul>
            {syncConflicts.map((conflict) => (
              <li key={conflict.reservationId}>
                <button type="button" className="link-button" onClick={() => openReservationModal(conflict)}>
                  {conflict.suiteName}: {format(parseISO(conflict.checkIn), 'd MMM', { locale: dateLocale })} – {format(parseISO(conflict.checkOut), 'd MMM yyyy', { locale: dateLocale })} (#{conflict.reservationId})
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card operations-quick-view mb-3">
        <div className="card-header quick-view-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Home size={20} color="var(--primary)" />
              {tr('Suites', 'Suites')}
            </h3>
            <p className="quick-view-subtitle mb-1">{tr('Occupied suites today', 'Suites ocupadas hoy')}</p>
          </div>
          <span className="status-badge status-confirmed">{occupancyCount} / {activeSuites.length} {tr('occupied', 'ocupadas')}</span>
        </div>

        <div className="suite-house-grid">
          {quickViewSuites.map((entry) => (
            <article
              key={entry.suite.suiteId}
              className={`suite-room-card ${entry.reservation ? 'occupied' : 'vacant'}`}
            >
              <div className="suite-room-head">
                <span className="suite-room-title">{entry.suite.suiteName}</span>
              </div>

              {entry.reservation ? (
                <>
                  <div className="suite-room-guest">
                    {entry.reservation.guestDisplayName || entry.reservation.guestName}
                  </div>
                  <div className="suite-room-meta">{entry.nationality} {entry.flag} </div>
                  <div className="suite-room-meta">
                    {tr('Check-out', 'Salida')}: <strong>{format(parseISO(entry.reservation.checkOut), 'EEE d MMM', { locale: dateLocale })}</strong>
                  </div>

                  {EXPECTED_ARRIVAL_STATUSES.includes(String(entry.reservation.status || '').toLowerCase()) && (
                    <div className="suite-room-nudge">
                      <span>{tr('Has the guest checked in?', '¿Ha llegado el huesped?')}</span>
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        disabled={updatingIds.has(entry.reservation.reservationId)}
                        onClick={() => changeStatus(entry.reservation, 'checked_in')}
                      >
                        <Check size={14} />
                        {tr('Yes, checked in', 'Si, ha llegado')}
                      </button>
                    </div>
                  )}

                  <div className="suite-room-footer">
                    <StatusPill status={entry.reservation.status} tr={tr} />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm btn-icon"
                      onClick={() => openReservationModal(entry.reservation)}
                      aria-label={tr('View reservation', 'Ver reserva')}
                      title={tr('View reservation', 'Ver reserva')}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="suite-room-meta">{tr('Unoccupied', 'Sin ocupacion')}</div>
                </>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="operations-focus-grid mb-3">
        <article className="card operations-column">
          <div className="card-header operations-column-header">
            <h3>
              <LogOut size={18} color="#E67E22" />
              {tr('Check-outs', 'Check-outs')}
            </h3>
            <span className="status-badge status-pending">{departuresToday.length}</span>
          </div>

          {departuresToday.length > 0 ? (
            <ul className="operations-list">
              {departuresToday.map((departure) => renderOperationsItem(departure, 'departure'))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">{tr('No check-outs scheduled.', 'No hay check-outs programados.')}</div>
          )}
        </article>

        <article className="card operations-column">
          <div className="card-header operations-column-header">
            <h3>
              <LogIn size={18} color="#27AE60" />
              {tr('Check-ins', 'Check-ins')}
            </h3>
            <span className="status-badge status-checked-in">{arrivalsToday.length}</span>
          </div>

          {arrivalsToday.length > 0 ? (
            <ul className="operations-list">
              {arrivalsToday.map((arrival) => renderOperationsItem(arrival, 'arrival'))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">{tr('No check-ins scheduled.', 'No hay check-ins programados.')}</div>
          )}
        </article>
      </section>

      {toast && (
        <div className={`ops-toast ${toast.type}`} role="status">
          <span>{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              className="ops-toast-undo"
              onClick={() => {
                const undo = toast.onUndo;
                setToast(null);
                undo();
              }}
            >
              <Undo2 size={14} />
              {tr('Undo', 'Deshacer')}
            </button>
          )}
        </div>
      )}

      {showReservationModal && selectedReservation && (
        <ReservationDetailsModal
          reservation={selectedReservation}
          suites={activeSuites}
          isEditing={isEditingReservation}
          setIsEditing={setIsEditingReservation}
          editForm={editForm}
          setEditForm={setEditForm}
          onClose={closeReservationModal}
          onSave={handleSaveReservation}
          onRequestCancelReservation={requestCancelReservation}
          saving={savingReservation}
          validationErrors={reservationEditValidationErrors}
          isEditValid={isReservationEditValid}
          modalError={modalError}
          setModalError={setModalError}
        />
      )}

      {showCancelConfirmModal && selectedReservation && (
        <ConfirmCancelReservationModal
          reservation={selectedReservation}
          saving={savingReservation}
          onClose={() => setShowCancelConfirmModal(false)}
          onConfirm={handleCancelReservation}
        />
      )}
    </div>
  );
}
