import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useCalendarStore } from "../../stores/useCalendarStore";
import { launchApp } from "../../lib/launch";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface ClockPopupProps {
  onClose: () => void;
}

export function ClockPopup({ onClose }: ClockPopupProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const getEventsForDate = useCalendarStore((s) => s.getEventsForDate);
  const getEventsForMonth = useCalendarStore((s) => s.getEventsForMonth);

  const monthEvents = getEventsForMonth(viewYear, viewMonth + 1);
  const datesWithEvents = new Set(monthEvents.map((e) => e.date));

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Build the grid: days in month, padded to start on Monday
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // getDay(): 0=Sun..6=Sat; we want Mon=0..Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  function handleDayClick(day: number) {
    const ds = toDateStr(viewYear, viewMonth, day);
    setSelectedDate((prev) => (prev === ds ? null : ds));
  }

  function handleOpenCalendar() {
    launchApp("calendar");
    onClose();
  }

  return (
    <div className="clock-popup" ref={popupRef}>
      {/* Month header */}
      <div className="clock-popup__header">
        <button className="clock-popup__nav" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft size={14} />
        </button>
        <span className="clock-popup__month-label">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button className="clock-popup__nav" onClick={nextMonth} aria-label="Next month">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="clock-popup__grid">
        {DAY_LABELS.map((d) => (
          <div key={d} className="clock-popup__day-label">{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const ds = toDateStr(viewYear, viewMonth, day);
          const isToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          const hasEvents = datesWithEvents.has(ds);
          const eventColors = hasEvents
            ? [...new Set(monthEvents.filter((e) => e.date === ds).map((e) => e.color))]
            : [];

          return (
            <button
              key={ds}
              className={[
                "clock-popup__day",
                isToday ? "clock-popup__day--today" : "",
                isSelected ? "clock-popup__day--selected" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => handleDayClick(day)}
            >
              {day}
              {eventColors.length > 0 && (
                <span className="clock-popup__dots">
                  {eventColors.slice(0, 3).map((c, ci) => (
                    <span key={ci} className="clock-popup__dot" style={{ background: c }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="clock-popup__events">
          <div className="clock-popup__events-title">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
          {selectedEvents.length === 0 ? (
            <div className="clock-popup__no-events">No events</div>
          ) : (
            <ul className="clock-popup__event-list">
              {selectedEvents.map((ev) => (
                <li key={ev.id} className="clock-popup__event-item">
                  <span className="clock-popup__event-dot" style={{ background: ev.color }} />
                  <span className="clock-popup__event-title">{ev.title}</span>
                  {ev.startTime && (
                    <span className="clock-popup__event-time">{ev.startTime}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="clock-popup__footer">
        <button className="clock-popup__open-btn" onClick={handleOpenCalendar}>
          <CalendarDays size={13} />
          Open Calendar
        </button>
      </div>
    </div>
  );
}
