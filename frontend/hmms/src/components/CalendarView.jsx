import { useEffect, useState } from 'react';
import { fetchCalendar, fetchSuites, updateReservation, cancelReservation, updateReservationStatus, fetchGuest, updateGuest } from '../api/backend';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  parseISO, 
  differenceInDays,
  addMonths,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { STATUS_META } from '../api/reservationStatus';
import { ConfirmCancelReservationModal, ReservationDetailsModal } from './reservations/ReservationDetailsModal';

const STATUS_FILTER_DEFAULTS = {
  confirmed: true,
  checked_in: true,
  checked_out: true,
  pending: true,
  no_show: true,
  cancelled: false
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const [statusFilters, setStatusFilters] = useState(STATUS_FILTER_DEFAULTS);

  const loadCalendarData = async (targetDate = currentDate) => {
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);

    setLoading(true);
    try {
      const [calendarData, suitesData] = await Promise.all([
        fetchCalendar(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
        fetchSuites()
      ]);
      setReservations(calendarData || []);
      setSuites(suitesData || []);
      setError(null);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError(err?.message || 'Failed to load calendar data.');
      setReservations([]);
      setSuites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData(currentDate);
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredReservations = reservations.filter(
    (res) => statusFilters[res.status?.toLowerCase()] ?? true,
  );

  // Calculate statistics (only for active suites)
  const activeSuites = suites.filter(s => s.active);
  const totalDays = daysInMonth.length;
  const totalSuiteDays = totalDays * activeSuites.length;
  const activeReservations = filteredReservations.filter(res => res.status?.toLowerCase() !== 'cancelled');
  const occupiedDays = activeReservations.reduce((sum, res) => {
    const checkIn = parseISO(res.checkIn);
    const checkOut = parseISO(res.checkOut);
    const start = checkIn < monthStart ? monthStart : checkIn;
    const end = checkOut > monthEnd ? monthEnd : checkOut;
    if (end <= start) return sum;
    return sum + Math.max(0, differenceInDays(end, start));
  }, 0);
  const occupancyRate = totalSuiteDays > 0 ? (occupiedDays / totalSuiteDays) * 100 : 0;

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const formatCurrencyValue = (value) => {
    if (!Number.isFinite(value)) {
      return '';
    }
    return value.toFixed(2);
  };

  const getPricePerNightValue = (checkIn, checkOut, totalPrice) => {
    if (!checkIn || !checkOut) {
      return '';
    }

    try {
      const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));
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
  };

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

  const editValidationErrors = getEditValidationErrors();
  const isEditValid = editValidationErrors.length === 0;

  const openReservationModal = (reservation) => {
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

  const requestCancelReservation = () => {
    setShowCancelConfirmModal(true);
  };

  const handleSaveReservation = async () => {
    if (!selectedReservation) return;
    if (!isEditValid) {
      setModalError(editValidationErrors[0]);
      return;
    }

    try {
      setSavingReservation(true);
      setModalError(null);

      // Check if status changed
      const statusChanged = editForm.status !== selectedReservation.status;

      // Update reservation details
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

      // Update status if changed
      if (statusChanged) {
        await updateReservationStatus(selectedReservation.reservationId, editForm.status);
      }

      const guestNotesChanged = (editForm.guestNotes || '') !== (selectedReservation.guestNotes || '');
      let guestNotesSyncError = null;

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

      await loadCalendarData(currentDate);

      if (guestNotesSyncError) {
        setSelectedReservation((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            suiteId: parseInt(editForm.suiteId, 10),
            checkIn: editForm.checkIn,
            checkOut: editForm.checkOut,
            numGuests: parseInt(editForm.numGuests, 10),
            pricePerNight: editForm.pricePerNight,
            priceTotal: parseFloat(editForm.priceTotal),
            channel: editForm.channel,
            notes: editForm.notes,
            guestNotes: editForm.guestNotes,
            status: editForm.status,
          };
        });
        setModalError(guestNotesSyncError);
        return;
      }

      setIsEditingReservation(false);
      closeReservationModal();
    } catch (err) {
      console.error('Failed to update reservation:', err);
      setModalError(err?.message || 'Failed to update reservation');
    } finally {
      setSavingReservation(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;

    try {
      setSavingReservation(true);
      setModalError(null);
      await cancelReservation(selectedReservation.reservationId);
      await loadCalendarData(currentDate);
      closeReservationModal();
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
      setModalError(err?.message || 'Failed to cancel reservation');
    } finally {
      setShowCancelConfirmModal(false);
      setSavingReservation(false);
    }
  };

  const toggleStatusFilter = (status) => {
    setStatusFilters((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const resetStatusFilters = () => {
    setStatusFilters(STATUS_FILTER_DEFAULTS);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="mt-2">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="calendar-view">
      {/* Header */}
      <div className="card mb-3">
        <div className="card-header">
          <h2>
            <CalendarIcon size={28} />
            Calendar & Planning
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={goToToday} className="btn btn-outline btn-sm">
                Today
              </button>
              <button onClick={previousMonth} className="btn btn-primary btn-sm">
                <ChevronLeft size={16} />
              </button>
              <h3 style={{ margin: 0, fontSize: '1.125rem', minWidth: '140px', textAlign: 'center' }}>
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <button onClick={nextMonth} className="btn btn-primary btn-sm">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message mb-3">
          {error}
        </div>
      )}

      {/* Main Calendar Content */}
      {activeSuites.length === 0 ? (
        <div className="card">
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--dark-gray)' }}>
            <CalendarIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No active suites</p>
            <p style={{ fontSize: '0.875rem' }}>Add suites to start managing reservations</p>
          </div>
        </div>
      ) : (
        <TimelineView 
          suites={activeSuites} 
          reservations={filteredReservations}
          allReservations={reservations}
          daysInMonth={daysInMonth} 
          monthStart={monthStart}
          onReservationClick={openReservationModal}
          statusFilters={statusFilters}
          onToggleStatusFilter={toggleStatusFilter}
          onResetStatusFilters={resetStatusFilters}
        />
      )}

      {/* Statistics Panel */}
      <div className="card mt-3">
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1.5rem',
          padding: '1.5rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.25rem' }}>
              Total Reservations
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
              {filteredReservations.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', marginTop: '0.125rem' }}>
              {activeReservations.length} active
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.25rem' }}>
              Occupancy Rate
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
              {occupancyRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', marginTop: '0.125rem' }}>
              {occupiedDays} of {totalSuiteDays} days
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--dark-gray)', marginBottom: '0.25rem' }}>
              Active Suites
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
              {activeSuites.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)', marginTop: '0.125rem' }}>
              of {suites.length} total
            </div>
          </div>
        </div>
      </div>

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
          validationErrors={editValidationErrors}
          isEditValid={isEditValid}
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

// Timeline View - Shows reservations as horizontal bars across suites
function TimelineView({
  suites,
  reservations,
  allReservations,
  daysInMonth,
  monthStart,
  onReservationClick,
  statusFilters,
  onToggleStatusFilter,
  onResetStatusFilters,
}) {
  const getReservationsForSuite = (suiteId, source = reservations) => {
    return source.filter((res) => res.suiteId === suiteId);
  };

  const getStableLaneData = (suiteId) => {
    const fullSuiteReservations = getReservationsForSuite(suiteId, allReservations).sort((a, b) => {
      if (a.checkIn === b.checkIn) return (a.reservationId || 0) - (b.reservationId || 0);
      return a.checkIn.localeCompare(b.checkIn);
    });

    const laneByReservationId = {};
    fullSuiteReservations.forEach((res, idx) => {
      laneByReservationId[res.reservationId] = idx;
    });

    return { laneByReservationId };
  };

  const getReservationStyle = (reservation) => {
    const checkIn = parseISO(reservation.checkIn);
    const checkOut = parseISO(reservation.checkOut);

    // Half-day convention:
    // - reservation starts at midday of check-in day
    // - reservation ends at midday of check-out day
    const totalDays = daysInMonth.length;
    const rawStartOffset = differenceInDays(checkIn, monthStart) + 0.5;
    const rawEndOffset = differenceInDays(checkOut, monthStart) + 0.5;

    const clampedStart = Math.max(0, rawStartOffset);
    const clampedEnd = Math.min(totalDays, rawEndOffset);

    if (clampedEnd <= clampedStart) return null;

    const left = (clampedStart / totalDays) * 100;
    const width = ((clampedEnd - clampedStart) / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const getStatusColor = (status) => STATUS_META[status?.toLowerCase()]?.color || STATUS_META.pending.color;

  return (
    <div className="card">
      <div style={{ overflowX: 'auto' }}>
        {/* Date Header */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--gray)' }}>
          <div style={{ 
            minWidth: '180px', 
            padding: '1rem', 
            fontWeight: 700,
            borderRight: '2px solid var(--gray)',
            background: 'var(--light-gray)'
          }}>
            Suite
          </div>
          <div style={{ flex: 1, display: 'flex', minWidth: '800px' }}>
            {daysInMonth.map((day, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.25rem',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: isToday(day) ? 700 : 400,
                  color: isToday(day) ? 'var(--accent)' : 'var(--dark-gray)',
                  background: isToday(day) ? 'rgba(255, 107, 107, 0.1)' : 
                             day.getDay() === 0 || day.getDay() === 6 ? 'var(--light-gray)' : 'white',
                  borderRight: '1px solid var(--light-gray)',
                  borderBottom: '1px solid var(--gray)'
                }}
              >
                <div>{format(day, 'EEE')}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{format(day, 'd')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Suite Rows */}
        {suites.map((suite) => {
          const suiteReservations = getReservationsForSuite(suite.suiteId);
          const { laneByReservationId } = getStableLaneData(suite.suiteId);
          const maxVisibleLane = suiteReservations.reduce((maxLane, res) => {
            const lane = laneByReservationId[res.reservationId] ?? 0;
            return Math.max(maxLane, lane);
          }, -1);
          const lanesToRender = maxVisibleLane >= 0 ? maxVisibleLane + 1 : 0;
          const rowHeight = Math.max(60, lanesToRender * 22 + 16);
          
          return (
            <div key={suite.suiteId} style={{ display: 'flex', borderBottom: '1px solid var(--gray)' }}>
              <div style={{ 
                minWidth: '180px', 
                padding: '1rem',
                borderRight: '2px solid var(--gray)',
                background: 'var(--light-gray)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{suite.suiteName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-gray)' }}>Capacity: {suite.capacity}</div>
              </div>
              <div style={{ 
                flex: 1, 
                position: 'relative', 
                minHeight: `${rowHeight}px`,
                minWidth: '800px',
                background: 'white'
              }}>
                {/* Day grid lines */}
                <div style={{ display: 'flex', height: '100%', position: 'absolute', width: '100%' }}>
                  {daysInMonth.map((day, idx) => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        borderRight: '1px solid var(--light-gray)',
                        background: isToday(day) ? 'rgba(255, 107, 107, 0.05)' : 
                                   day.getDay() === 0 || day.getDay() === 6 ? '#fafafa' : 'transparent'
                      }}
                    />
                  ))}
                </div>

                {/* Reservation bars */}
                {suiteReservations.map((reservation, idx) => {
                  const style = getReservationStyle(reservation);
                  if (!style) return null;
                  const color = getStatusColor(reservation.status);
                  const laneIndex = laneByReservationId[reservation.reservationId] ?? idx;
                  
                  return (
                    <div
                      key={reservation.reservationId || idx}
                      style={{
                        position: 'absolute',
                        top: `${laneIndex * 22 + 8}px`,
                        left: style.left,
                        width: style.width,
                        height: '18px',
                        background: color,
                        borderRadius: '3px',
                        padding: '0 4px',
                        fontSize: '0.7rem',
                        color: 'white',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        zIndex: 10
                      }}
                      title={`${reservation.guestName}\n${format(parseISO(reservation.checkIn), 'dd/MM/yyyy')} → ${format(parseISO(reservation.checkOut), 'dd/MM/yyyy')}\n${reservation.numGuests} guest${reservation.numGuests > 1 ? 's' : ''}\nStatus: ${reservation.status}`}
                      onClick={() => onReservationClick(reservation)}
                    >
                      {reservation.guestName}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ padding: '1rem', background: 'var(--light-gray)', borderTop: '1px solid var(--gray)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', alignItems: 'center' }}>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              aria-pressed={Boolean(statusFilters[key])}
              onClick={() => onToggleStatusFilter(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                opacity: statusFilters[key] ? 1 : 0.35,
              }}
            >
              <div style={{ width: '20px', height: '14px', background: meta.color, borderRadius: '3px' }}></div>
              <span>{meta.label}</span>
            </button>
          ))}

          <button type="button" className="btn btn-outline btn-sm" onClick={onResetStatusFilters}>
            Reset filters
          </button>
        </div>
      </div>
    </div>
  );
}
