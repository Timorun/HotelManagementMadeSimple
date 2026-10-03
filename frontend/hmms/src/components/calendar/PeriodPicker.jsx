import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  setMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEK_STARTS_ON } from '../../utils/dates';

/**
 * Date-range label that opens a picker to jump to a month (month view)
 * or to the week containing a clicked day (week view).
 * Custom-built because <input type="week|month"> is unsupported in Safari/Firefox.
 */
export default function PeriodPicker({ viewMode, currentDate, onSelect, label, dateLocale, tr }) {
  const [open, setOpen] = useState(false);
  // On phones the popover is fixed to the screen; it opens just below the label
  const [popoverTop, setPopoverTop] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const select = (date) => {
    onSelect(date);
    setOpen(false);
  };

  const toggle = () => {
    if (!open && containerRef.current) {
      setPopoverTop(Math.round(containerRef.current.getBoundingClientRect().bottom + 6));
    }
    setOpen((value) => !value);
  };

  return (
    <div className="period-picker" ref={containerRef}>
      <button
        type="button"
        className="period-picker-trigger"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={viewMode === 'week' ? tr('Pick a week', 'Elegir semana') : tr('Pick a month', 'Elegir mes')}
      >
        {label}
      </button>

      {open && (
        <div
          className="period-picker-popover"
          role="dialog"
          aria-label={tr('Choose period', 'Elegir periodo')}
          style={popoverTop != null ? { '--popover-top': `${popoverTop}px` } : undefined}
        >
          {viewMode === 'week' ? (
            <WeekGrid currentDate={currentDate} onSelect={select} dateLocale={dateLocale} tr={tr} />
          ) : (
            <MonthGrid currentDate={currentDate} onSelect={select} dateLocale={dateLocale} tr={tr} />
          )}
        </div>
      )}
    </div>
  );
}

function MonthGrid({ currentDate, onSelect, dateLocale, tr }) {
  const [year, setYear] = useState(currentDate.getFullYear());
  const today = new Date();

  return (
    <div>
      <div className="period-picker-nav">
        <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => setYear((y) => y - 1)} aria-label={tr('Previous year', 'Año anterior')}>
          <ChevronLeft size={16} />
        </button>
        <strong>{year}</strong>
        <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => setYear((y) => y + 1)} aria-label={tr('Next year', 'Año siguiente')}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="period-picker-months">
        {Array.from({ length: 12 }, (_, month) => {
          const monthDate = setMonth(new Date(year, 0, 1), month);
          const isCurrent = isSameMonth(monthDate, currentDate);
          const isThisMonth = isSameMonth(monthDate, today);
          return (
            <button
              key={month}
              type="button"
              className={`period-picker-cell ${isCurrent ? 'selected' : ''} ${isThisMonth ? 'today' : ''}`}
              onClick={() => onSelect(monthDate)}
            >
              {format(monthDate, 'MMM', { locale: dateLocale })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ currentDate, onSelect, dateLocale, tr }) {
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(currentDate));
  const [hoveredDay, setHoveredDay] = useState(null);

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth), { locale: dateLocale, weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(visibleMonth), { locale: dateLocale, weekStartsOn: WEEK_STARTS_ON }),
  }), [visibleMonth, dateLocale]);

  const weekOf = (day) => ({
    start: startOfWeek(day, { locale: dateLocale, weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(day, { locale: dateLocale, weekStartsOn: WEEK_STARTS_ON }),
  });
  const selectedWeek = weekOf(currentDate);
  const hoveredWeek = hoveredDay ? weekOf(hoveredDay) : null;
  const weekdayLabels = days.slice(0, 7).map((day) => format(day, 'EEEEEE', { locale: dateLocale }));

  return (
    <div onMouseLeave={() => setHoveredDay(null)}>
      <div className="period-picker-nav">
        <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => setVisibleMonth((m) => subMonths(m, 1))} aria-label={tr('Previous month', 'Mes anterior')}>
          <ChevronLeft size={16} />
        </button>
        <strong>{format(visibleMonth, 'MMMM yyyy', { locale: dateLocale })}</strong>
        <button type="button" className="btn btn-outline btn-sm btn-icon" onClick={() => setVisibleMonth((m) => addMonths(m, 1))} aria-label={tr('Next month', 'Mes siguiente')}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="period-picker-days">
        {weekdayLabels.map((labelText) => (
          <span key={labelText} className="period-picker-weekday">{labelText}</span>
        ))}
        {days.map((day) => {
          const inSelectedWeek = isWithinInterval(day, selectedWeek);
          const inHoveredWeek = hoveredWeek && isWithinInterval(day, hoveredWeek);
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={[
                'period-picker-day',
                isSameMonth(day, visibleMonth) ? '' : 'outside',
                inSelectedWeek ? 'selected' : '',
                inHoveredWeek ? 'hovered' : '',
                isToday(day) ? 'today' : '',
                isSameDay(day, currentDate) ? 'anchor' : '',
              ].join(' ')}
              onMouseEnter={() => setHoveredDay(day)}
              onClick={() => onSelect(day)}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
