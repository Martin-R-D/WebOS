import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useCalendarStore, EVENT_COLORS } from "../../stores/useCalendarStore";
import type { CalendarEvent } from "../../stores/useCalendarStore";
import type { AppProps } from "../../types";
import "./Calendar.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface EventFormState {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  description: string;
}

const defaultForm = (date: string): EventFormState => ({
  title: "",
  date,
  startTime: "",
  endTime: "",
  color: EVENT_COLORS[3],
  description: "",
});

export function Calendar({}: AppProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(
    toDateStr(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const [form, setForm] = useState<EventFormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const addEvent = useCalendarStore((s) => s.addEvent);
  const updateEvent = useCalendarStore((s) => s.updateEvent);
  const deleteEvent = useCalendarStore((s) => s.deleteEvent);
  const getEventsForDate = useCalendarStore((s) => s.getEventsForDate);
  const getEventsForMonth = useCalendarStore((s) => s.getEventsForMonth);

  const monthEvents = getEventsForMonth(viewYear, viewMonth + 1);
  const selectedEvents = getEventsForDate(selectedDate);

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Build grid cells
  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }
  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
  }

  function openAddForm() {
    setEditingId(null);
    setForm(defaultForm(selectedDate));
  }

  function openEditForm(ev: CalendarEvent) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      date: ev.date,
      startTime: ev.startTime ?? "",
      endTime: ev.endTime ?? "",
      color: ev.color,
      description: ev.description ?? "",
    });
  }

  function cancelForm() {
    setForm(null);
    setEditingId(null);
  }

  function saveForm() {
    if (!form || !form.title.trim()) return;
    if (editingId) {
      updateEvent(editingId, {
        title: form.title.trim(),
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        color: form.color,
        description: form.description || undefined,
      });
    } else {
      addEvent({
        title: form.title.trim(),
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        color: form.color,
        description: form.description || undefined,
      });
    }
    setForm(null);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteEvent(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  const eventsForCell = (day: number) => {
    const ds = toDateStr(viewYear, viewMonth, day);
    return monthEvents.filter((e) => e.date === ds);
  };

  return (
    <div className="calendar">
      {/* Left: month grid */}
      <div className="calendar__main">
        {/* Nav header */}
        <div className="calendar__nav">
          <button className="calendar__nav-btn" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <h2 className="calendar__title">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
          <button className="calendar__nav-btn" onClick={nextMonth} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
          <button className="calendar__today-btn" onClick={goToday}>Today</button>
        </div>

        {/* Day labels */}
        <div className="calendar__grid calendar__grid--header">
          {DAY_LABELS.map((d) => (
            <div key={d} className="calendar__day-label">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="calendar__grid calendar__grid--days">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="calendar__cell calendar__cell--empty" />;
            const ds = toDateStr(viewYear, viewMonth, day);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;
            const evs = eventsForCell(day);
            const extra = evs.length - 2;

            return (
              <div
                key={ds}
                className={[
                  "calendar__cell",
                  isToday ? "calendar__cell--today" : "",
                  isSelected ? "calendar__cell--selected" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setSelectedDate(ds)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedDate(ds); }}
              >
                <span className="calendar__cell-num">{day}</span>
                <div className="calendar__cell-events">
                  {evs.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="calendar__chip"
                      style={{ background: ev.color }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {extra > 0 && (
                    <div className="calendar__chip-more">+{extra} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: day detail panel */}
      <div className="calendar__detail">
        <div className="calendar__detail-header">
          <h3 className="calendar__detail-title">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "long", month: "long", day: "numeric",
            })}
          </h3>
          {!form && (
            <button className="calendar__add-btn" onClick={openAddForm}>
              <Plus size={14} />
              Add Event
            </button>
          )}
        </div>

        {/* Event form */}
        {form && (
          <div className="calendar__form">
            <div className="calendar__form-row">
              <input
                className="calendar__input"
                placeholder="Event title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                autoFocus
              />
            </div>
            <div className="calendar__form-row">
              <input
                className="calendar__input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="calendar__form-row calendar__form-row--two">
              <input
                className="calendar__input"
                type="time"
                placeholder="Start time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
              <input
                className="calendar__input"
                type="time"
                placeholder="End time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
            <div className="calendar__form-row">
              <div className="calendar__color-picker">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={["calendar__color-swatch", form.color === c ? "calendar__color-swatch--active" : ""].filter(Boolean).join(" ")}
                    style={{ background: c }}
                    onClick={() => setForm({ ...form, color: c })}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="calendar__form-row">
              <textarea
                className="calendar__input calendar__textarea"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="calendar__form-actions">
              <button className="calendar__btn calendar__btn--primary" onClick={saveForm} disabled={!form.title.trim()}>
                <Check size={13} /> Save
              </button>
              <button className="calendar__btn calendar__btn--ghost" onClick={cancelForm}>
                <X size={13} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Event list */}
        {selectedEvents.length === 0 && !form ? (
          <div className="calendar__no-events">No events for this day.</div>
        ) : (
          <ul className="calendar__event-list">
            {selectedEvents.map((ev) => (
              <li key={ev.id} className="calendar__event-item">
                <span className="calendar__event-dot" style={{ background: ev.color }} />
                <div className="calendar__event-info">
                  <span className="calendar__event-name">{ev.title}</span>
                  {(ev.startTime || ev.endTime) && (
                    <span className="calendar__event-time">
                      {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ""}
                    </span>
                  )}
                  {ev.description && (
                    <span className="calendar__event-desc">{ev.description}</span>
                  )}
                </div>
                <div className="calendar__event-actions">
                  <button
                    className="calendar__icon-btn"
                    onClick={() => openEditForm(ev)}
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    className={["calendar__icon-btn", confirmDeleteId === ev.id ? "calendar__icon-btn--danger" : ""].filter(Boolean).join(" ")}
                    onClick={() => handleDelete(ev.id)}
                    title={confirmDeleteId === ev.id ? "Click again to confirm" : "Delete"}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
