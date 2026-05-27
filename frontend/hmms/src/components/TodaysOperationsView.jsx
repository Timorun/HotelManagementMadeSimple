import { useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO, subDays } from 'date-fns';
import { ClipboardCheck, Eye, Home, LogIn, LogOut, RefreshCw } from 'lucide-react';
import {
  fetchGuest,
  fetchGuests,
  fetchOperationsDashboard,
  fetchReservations,
  fetchSuites,
  updateGuest,
  updateReservation,
  updateReservationStatus,
  cancelReservation,
} from '../api/backend';
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
  if (!['pending', 'confirmed', 'checked_in'].includes(status)) {
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

export default function TodaysOperationsView() {
  const [arrivalsToday, setArrivalsToday] = useState([]);
  const [departuresToday, setDeparturesToday] = useState([]);
  const [suites, setSuites] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);

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
          nationality: guest?.nationalityName || nationalityCode || 'Nationality unknown',
        };
      });
  }, [activeSuites, reservations, guestById]);

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
      errors.push('Check-in and check-out dates are required.');
    } else if (parseISO(editForm.checkOut) <= parseISO(editForm.checkIn)) {
      errors.push('Check-out must be after check-in.');
    }

    if (!Number.isFinite(numGuests) || numGuests < 1) {
      errors.push('Guests must be at least 1.');
    }

    if (selectedSuite?.capacity && numGuests > selectedSuite.capacity) {
      errors.push(`Guests exceed suite capacity (${selectedSuite.capacity}).`);
    }

    if (!Number.isFinite(priceTotal) || priceTotal < 0) {
      errors.push('Price must be 0 or higher.');
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

  const openReservationById = (reservationId) => {
    const reservation = reservations.find((item) => Number(item.reservationId) === Number(reservationId));
    if (!reservation) {
      setError('Reservation details are not available in the current quick view range.');
      return;
    }

    openReservationModal(reservation);
  };

  const closeReservationModal = () => {
    setShowReservationModal(false);
    setShowCancelConfirmModal(false);
    setSelectedReservation(null);
    setIsEditingReservation(false);
    setModalError(null);
  };

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
          guestNotesSyncError = 'Reservation was saved, but guest profile notes could not be saved. Please try again.';
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
      setModalError(err?.message || 'Failed to update reservation');
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
      setModalError(err?.message || 'Failed to cancel reservation');
    } finally {
      setShowCancelConfirmModal(false);
      setSavingReservation(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading operations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        Could not load today's operations. Please refresh and try again.
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
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="operations-subtitle">
              Last updated {format(lastUpdated, 'HH:mm')}
            </p>
          </div>

          <button
            onClick={() => loadData(true)}
            className="btn btn-outline btn-sm"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="card operations-quick-view mb-3">
        <div className="card-header quick-view-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Home size={20} color="var(--primary)" />
              Suites
            </h3>
            <p className="quick-view-subtitle mb-1">Occupied suites today</p>
          </div>
          <span className="status-badge status-confirmed">{occupancyCount} / {activeSuites.length} occupied</span>
        </div>

        <div className="suite-house-grid">
          {quickViewSuites.map((entry) => (
            <article
              key={entry.suite.suiteId}
              className={`suite-room-card ${entry.reservation ? 'occupied' : 'vacant'}`}
            >
              <div className="suite-room-head">
                <span className="suite-room-title">{entry.suite.suiteName}</span>
                <span className={`suite-room-state ${entry.reservation ? 'occupied' : 'vacant'}`}>
                  {entry.reservation ? 'Occupied' : 'Vacant'}
                </span>
              </div>

              {entry.reservation ? (
                <>
                  <div className="suite-room-guest">
                    {entry.reservation.guestDisplayName || entry.reservation.guestName}
                  </div>
                  <div className="suite-room-meta">{entry.nationality} {entry.flag} </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '1.2rem' }}
                    onClick={() => openReservationModal(entry.reservation)}
                  >
                    <Eye size={14} />
                    Open
                  </button>
                </>
              ) : (
                <>
                  <div className="suite-room-meta">Unnocupied</div>
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
              Check-outs
            </h3>
            <span className="status-badge status-pending">{departuresToday.length}</span>
          </div>

          {departuresToday.length > 0 ? (
            <ul className="operations-list">
              {departuresToday.map((departure) => (
                <li key={departure.reservationId} className="operations-item">
                  <div>
                    <div className="operations-item-title">{departure.guestName}</div>
                    <div className="operations-item-sub">{departure.suiteName}</div>
                    <em className="operations-item-sub muted">
                      {pluralize(departure.numGuests, 'guest')} | Ref #{departure.reservationId}
                    </em>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openReservationById(departure.reservationId)}
                  >
                    <Eye size={14} />
                    Open
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">No check-outs scheduled.</div>
          )}
        </article>

        <article className="card operations-column">
          <div className="card-header operations-column-header">
            <h3>
              <LogIn size={18} color="#27AE60" />
              Check-ins
            </h3>
            <span className="status-badge status-checked-in">{arrivalsToday.length}</span>
          </div>

          {arrivalsToday.length > 0 ? (
            <ul className="operations-list">
              {arrivalsToday.map((arrival) => (
                <li key={arrival.reservationId} className="operations-item">
                  <div>
                    <div className="operations-item-title">{arrival.guestName}</div>
                    <div className="operations-item-sub">{arrival.suiteName}</div>
                    <em className="operations-item-sub muted">
                      {pluralize(arrival.numGuests, 'guest')} | Ref #{arrival.reservationId}
                    </em>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openReservationById(arrival.reservationId)}
                  >
                    <Eye size={14} />
                    Open
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state compact-empty">No check-ins scheduled.</div>
          )}
        </article>
      </section>

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
