import { useEffect, useState } from 'react';
import { fetchCalendar, fetchSuites } from '../api/backend';
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

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    setLoading(true);
    Promise.all([
      fetchCalendar(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
      fetchSuites()
    ])
      .then(([calendarData, suitesData]) => {
        setReservations(calendarData || []);
        setSuites(suitesData || []);
        setError(null);
      })
      .catch((err) => {
        console.error('Error loading calendar data:', err);
        setError(err);
        setReservations([]);
        setSuites([]);
      })
      .finally(() => setLoading(false));
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate statistics (only for active suites)
  const activeSuites = suites.filter(s => s.active);
  const totalDays = daysInMonth.length;
  const totalSuiteDays = totalDays * activeSuites.length;
  const activeReservations = reservations.filter(res => res.status?.toLowerCase() !== 'cancelled');
  const occupiedDays = activeReservations.reduce((sum, res) => {
    const checkIn = parseISO(res.checkIn);
    const checkOut = parseISO(res.checkOut);
    const start = checkIn < monthStart ? monthStart : checkIn;
    const end = checkOut > monthEnd ? monthEnd : checkOut;
    return sum + Math.max(0, differenceInDays(end, start));
  }, 0);
  const occupancyRate = totalSuiteDays > 0 ? (occupiedDays / totalSuiteDays) * 100 : 0;

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

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
          Failed to load calendar data.
        </div>
      )}

      {/* Statistics Panel */}
      <div className="card mb-3">
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
              {reservations.length}
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
          reservations={reservations} 
          daysInMonth={daysInMonth} 
          monthStart={monthStart}
          monthEnd={monthEnd}
        />
      )}
    </div>
  );
}

// Timeline View - Shows reservations as horizontal bars across suites
function TimelineView({ suites, reservations, daysInMonth, monthStart, monthEnd }) {
  const getReservationsForSuite = (suiteId) => {
    return reservations.filter(res => res.suiteId === suiteId);
  };

  const getReservationStyle = (reservation) => {
    const checkIn = parseISO(reservation.checkIn);
    const checkOut = parseISO(reservation.checkOut);
    
    // Clamp to month boundaries
    const displayStart = checkIn < monthStart ? monthStart : checkIn;
    const displayEnd = checkOut > monthEnd ? monthEnd : checkOut;
    
    const startDay = differenceInDays(displayStart, monthStart);
    const duration = differenceInDays(displayEnd, displayStart);
    const totalDays = daysInMonth.length;
    
    const left = (startDay / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return '#27AE60';
      case 'checked_in': return '#3498DB';
      case 'checked_out': return '#95A5A6';
      case 'cancelled': return '#E74C3C';
      default: return '#F39C12';
    }
  };

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
                minHeight: '60px',
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
                  const color = getStatusColor(reservation.status);
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        top: `${idx * 22 + 8}px`,
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
                      title={`${reservation.guestName}\n${format(parseISO(reservation.checkIn), 'MMM d')} → ${format(parseISO(reservation.checkOut), 'MMM d')}\n${reservation.numGuests} guest${reservation.numGuests > 1 ? 's' : ''}\nStatus: ${reservation.status}`}
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
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '14px', background: '#27AE60', borderRadius: '3px' }}></div>
            <span>Confirmed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '14px', background: '#3498DB', borderRadius: '3px' }}></div>
            <span>Checked In</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '14px', background: '#F39C12', borderRadius: '3px' }}></div>
            <span>Pending</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '14px', background: '#95A5A6', borderRadius: '3px' }}></div>
            <span>Checked Out</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '14px', background: '#E74C3C', borderRadius: '3px' }}></div>
            <span>Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
