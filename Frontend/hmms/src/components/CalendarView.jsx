import { useEffect, useState } from 'react';
import { fetchCalendar } from '../api/backend';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    setLoading(true);
    fetchCalendar(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    )
      .then(setReservations)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getReservationsForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return reservations.filter(res => {
      const checkIn = parseISO(res.checkIn);
      const checkOut = parseISO(res.checkOut);
      const currentDay = parseISO(dayStr);
      return currentDay >= checkIn && currentDay < checkOut;
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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
    <div className="card">
      <div className="card-header">
        <h2>
          <CalendarIcon size={28} />
          Reservation Calendar
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={goToToday} className="btn btn-outline btn-sm">
            Today
          </button>
          <button onClick={previousMonth} className="btn btn-primary btn-sm">
            <ChevronLeft size={16} />
          </button>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <button onClick={nextMonth} className="btn btn-primary btn-sm">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Failed to load calendar data.
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '1px',
          background: 'var(--gray)',
          border: '1px solid var(--gray)',
          minWidth: '700px',
        }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} style={{
              padding: '0.75rem',
              background: 'var(--primary)',
              color: 'var(--white)',
              fontWeight: 600,
              textAlign: 'center',
              fontSize: '0.875rem',
            }}>
              {day}
            </div>
          ))}

          {/* Add padding days for month start */}
          {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, index) => (
            <div key={`pad-${index}`} style={{
              background: 'var(--light-gray)',
              minHeight: '100px',
            }} />
          ))}

          {days.map(day => {
            const dayReservations = getReservationsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toString()}
                style={{
                  background: 'var(--white)',
                  minHeight: '100px',
                  padding: '0.5rem',
                  opacity: isCurrentMonth ? 1 : 0.5,
                  border: isTodayDate ? '2px solid var(--accent)' : 'none',
                  position: 'relative',
                }}
              >
                <div style={{
                  fontWeight: isTodayDate ? 700 : 600,
                  color: isTodayDate ? 'var(--accent)' : 'var(--primary)',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                }}>
                  {format(day, 'd')}
                </div>

                <div style={{ fontSize: '0.75rem' }}>
                  {dayReservations.slice(0, 3).map((res, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--info)',
                        color: 'var(--white)',
                        padding: '0.25rem',
                        marginBottom: '0.25rem',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.7rem',
                      }}
                      title={`${res.guestName} - ${res.suiteName}`}
                    >
                      {res.suiteName}
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <div style={{
                      color: 'var(--dark-gray)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}>
                      +{dayReservations.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3" style={{ padding: '1rem', background: 'var(--light-gray)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '20px', background: 'var(--info)', borderRadius: '3px' }}></div>
            <span>Reservation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid var(--accent)', borderRadius: '3px' }}></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
