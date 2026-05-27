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
import { STATUS_META, getStatusLabel } from '../api/reservationStatus';
import { useI18n } from '../context/I18nContext';
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
  const { tr, dateLocale } = useI18n();
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
      setError(err?.message || tr('Failed to load calendar data.', 'No se pudieron cargar los datos del calendario.'));
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

  // Active suites displayed in the timeline
  const activeSuites = suites.filter(s => s.active);

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
          guestNotesSyncError = tr('Reservation was saved, but guest profile notes could not be saved. Please try again.', 'La reserva se guardo, pero no se pudieron guardar las notas del huesped. Intentalo de nuevo.');
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
      setModalError(err?.message || tr('Failed to update reservation', 'No se pudo actualizar la reserva'));
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
      setModalError(err?.message || tr('Failed to cancel reservation', 'No se pudo cancelar la reserva'));
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
        <p className="mt-2">{tr('Loading calendar...', 'Cargando calendario...')}</p>
      </div>
    );
  }

  return (
    <div className="calendar-view">
      {/* Header */}
      <div className="card mb-3">
        <div className="card-header" style={{ alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <h2>
            <CalendarIcon size={28} />
            {tr('Calendar & Planning', 'Calendario y planificacion')}
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" onClick={goToToday} className="btn btn-outline btn-sm">
                {tr('Today', 'Hoy')}
              </button>
              <button type="button" onClick={previousMonth} className="btn btn-primary btn-sm" aria-label={tr('Previous month', 'Mes anterior')}>
                <ChevronLeft size={16} />
              </button>
              <h3 style={{ margin: 0, fontSize: '1.2rem', minWidth: '170px', textAlign: 'center' }}>
                {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
              </h3>
              <button type="button" onClick={nextMonth} className="btn btn-primary btn-sm" aria-label={tr('Next month', 'Mes siguiente')}>
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
            <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{tr('No active suites', 'No hay suites activas')}</p>
            <p style={{ fontSize: '0.875rem' }}>{tr('Add suites to start managing reservations', 'Agrega suites para empezar a gestionar reservas')}</p>
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
          tr={tr}
          dateLocale={dateLocale}
        />
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
  tr,
  dateLocale,
}) {
  const getReservationsForSuite = (suiteId, source = reservations) => {
    return source.filter((res) => res.suiteId === suiteId);
  };

  const getStableLaneData = (suiteId) => {
    const fullSuiteReservations = getReservationsForSuite(suiteId, allReservations).sort((a, b) => {
      if (a.checkIn === b.checkIn) {
        if (a.checkOut === b.checkOut) {
          return (a.reservationId || 0) - (b.reservationId || 0);
        }
        return a.checkOut.localeCompare(b.checkOut);
      }
      return a.checkIn.localeCompare(b.checkIn);
    });

    const laneByReservationId = {};
    const laneEndTimestamps = [];

    fullSuiteReservations.forEach((res) => {
      const reservationId = res.reservationId;
      const startTimestamp = Date.parse(res.checkIn || '');
      const endTimestamp = Date.parse(res.checkOut || '');

      const hasValidRange = Number.isFinite(startTimestamp) && Number.isFinite(endTimestamp) && endTimestamp >= startTimestamp;

      if (!hasValidRange) {
        const fallbackLane = laneEndTimestamps.length;
        laneEndTimestamps.push(Number.POSITIVE_INFINITY);
        laneByReservationId[reservationId] = fallbackLane;
        return;
      }

      const reusableLaneIndex = laneEndTimestamps.findIndex((laneEndTimestamp) => laneEndTimestamp <= startTimestamp);

      if (reusableLaneIndex >= 0) {
        laneEndTimestamps[reusableLaneIndex] = endTimestamp;
        laneByReservationId[reservationId] = reusableLaneIndex;
        return;
      }

      const newLaneIndex = laneEndTimestamps.length;
      laneEndTimestamps.push(endTimestamp);
      laneByReservationId[reservationId] = newLaneIndex;
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
  const isDenseMonth = daysInMonth.length >= 30;
  const suiteColumnWidth = isDenseMonth ? 184 : 196;
  const dayColumnWidth = isDenseMonth ? 30 : 34;
  const timelineMinWidth = Math.max(760, daysInMonth.length * dayColumnWidth);
  const laneHeight = isDenseMonth ? 26 : 28;
  const laneInsetTop = isDenseMonth ? 10 : 12;
  const barHeight = isDenseMonth ? 20 : 22;
  const baseRowHeight = isDenseMonth ? 72 : 80;
  const enableVerticalScroll = suites.length > 10;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.93rem', color: 'var(--primary)', fontWeight: 600 }}>
          {tr('Reservation timeline by suite', 'Linea de reservas por suite')}
        </div>
      </div>

      <div
        style={{
          overflowX: 'auto',
          overflowY: enableVerticalScroll ? 'auto' : 'visible',
          maxHeight: enableVerticalScroll ? '72vh' : 'none',
          border: '1px solid var(--light-gray)',
          borderRadius: '10px'
        }}
      >
        {/* Date Header */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--gray)', position: 'sticky', top: 0, zIndex: 40, background: 'var(--white)' }}>
          <div style={{ 
            minWidth: `${suiteColumnWidth}px`, 
            padding: '1rem 1.125rem', 
            fontWeight: 700,
            borderRight: '2px solid var(--gray)',
            background: 'var(--light-gray)',
            fontSize: '0.95rem',
            position: 'sticky',
            left: 0,
            top: 0,
            zIndex: 70,
          }}>
            {tr('Suite', 'Suite')}
          </div>
          <div style={{ flex: 1, display: 'flex', minWidth: `${timelineMinWidth}px` }}>
            {daysInMonth.map((day, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  minWidth: `${dayColumnWidth}px`,
                  padding: isDenseMonth ? '0.45rem 0.2rem' : '0.6rem 0.35rem',
                  textAlign: 'center',
                  fontSize: isDenseMonth ? '0.72rem' : '0.82rem',
                  fontWeight: isToday(day) ? 700 : 400,
                  color: isToday(day) ? 'var(--accent)' : 'var(--dark-gray)',
                  background: isToday(day) ? 'rgba(255, 107, 107, 0.1)' : 
                             day.getDay() === 0 || day.getDay() === 6 ? 'var(--light-gray)' : 'white',
                  borderRight: '1px solid var(--light-gray)',
                  borderBottom: '1px solid var(--gray)'
                }}
              >
                <div style={{ textTransform: 'uppercase', letterSpacing: '0.35px', fontWeight: 600 }}>{format(day, 'EEE', { locale: dateLocale })}</div>
                <div style={{ fontSize: isDenseMonth ? '0.88rem' : '1rem', fontWeight: 700 }}>{format(day, 'd')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Suite Rows */}
        {suites.map((suite, suiteRowIndex) => {
          const suiteReservations = getReservationsForSuite(suite.suiteId);
          const { laneByReservationId } = getStableLaneData(suite.suiteId);
          const maxVisibleLane = suiteReservations.reduce((maxLane, res) => {
            const lane = laneByReservationId[res.reservationId] ?? 0;
            return Math.max(maxLane, lane);
          }, -1);
          const lanesToRender = maxVisibleLane >= 0 ? maxVisibleLane + 1 : 0;
          const rowHeight = Math.max(baseRowHeight, lanesToRender * laneHeight + 24);
          const rowBaseBackground = suiteRowIndex % 2 === 0 ? 'white' : '#fbfdff';
          
          return (
            <div key={suite.suiteId} style={{ display: 'flex', borderBottom: '1px solid var(--gray)' }}>
              <div style={{ 
                minWidth: `${suiteColumnWidth}px`, 
                padding: '1rem 1.125rem',
                borderRight: '2px solid var(--gray)',
                background: 'var(--light-gray)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
                position: 'sticky',
                left: 0,
                zIndex: 30,
              }}>
                <div style={{ fontWeight: 700, fontSize: isDenseMonth ? '0.85rem' : '0.93rem' }}>{suite.suiteName}</div>
                <div style={{ fontSize: isDenseMonth ? '0.72rem' : '0.8rem', color: 'var(--dark-gray)' }}>{tr('Capacity:', 'Capacidad:')} {suite.capacity}</div>
              </div>
              <div style={{ 
                flex: 1, 
                position: 'relative', 
                minHeight: `${rowHeight}px`,
                minWidth: `${timelineMinWidth}px`,
                background: rowBaseBackground,
              }}>
                {/* Day grid lines */}
                <div style={{ display: 'flex', height: '100%', position: 'absolute', width: '100%' }}>
                  {daysInMonth.map((day, idx) => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        borderRight: '1px solid var(--light-gray)',
                        background: isToday(day) ? 'rgba(255, 107, 107, 0.07)' : 
                                   day.getDay() === 0 || day.getDay() === 6 ? 'rgba(236, 240, 241, 0.6)' : 'transparent'
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
                        top: `${laneIndex * laneHeight + laneInsetTop}px`,
                        left: style.left,
                        width: style.width,
                        height: `${barHeight}px`,
                        background: color,
                        borderRadius: '4px',
                        padding: isDenseMonth ? '0 6px' : '0 8px',
                        fontSize: isDenseMonth ? '0.72rem' : '0.78rem',
                        fontWeight: 600,
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        zIndex: 10
                      }}
                      title={`${reservation.guestName}\n${format(parseISO(reservation.checkIn), 'dd/MM/yyyy', { locale: dateLocale })} → ${format(parseISO(reservation.checkOut), 'dd/MM/yyyy', { locale: dateLocale })}\n${reservation.numGuests} ${reservation.numGuests > 1 ? tr('guests', 'huespedes') : tr('guest', 'huesped')}\n${tr('Status', 'Estado')}: ${getStatusLabel(reservation.status, tr)}`}
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
      <div style={{ padding: '1rem 1.125rem', background: 'var(--light-gray)', borderTop: '1px solid var(--gray)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.9rem', alignItems: 'center' }}>
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
                background: statusFilters[key] ? 'rgba(255,255,255,0.65)' : 'transparent',
                border: '1px solid var(--gray)',
                borderRadius: '999px',
                padding: '0.3rem 0.65rem',
                cursor: 'pointer',
                opacity: statusFilters[key] ? 1 : 0.35,
              }}
            >
              <div style={{ width: '20px', height: '14px', background: meta.color, borderRadius: '3px', flexShrink: 0 }}></div>
              <span>{getStatusLabel(key, tr)}</span>
            </button>
          ))}

          <button type="button" className="btn btn-outline btn-sm" onClick={onResetStatusFilters}>
            {tr('Reset filters', 'Restablecer filtros')}
          </button>
        </div>
      </div>
    </div>
  );
}
