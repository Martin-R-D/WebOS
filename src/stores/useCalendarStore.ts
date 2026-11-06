import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string;   // HH:MM
  color: string;
  description?: string;
}

export const EVENT_COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7"] as const;

interface CalendarState {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  updateEvent: (id: string, updates: Partial<Omit<CalendarEvent, "id">>) => void;
  deleteEvent: (id: string) => void;
  getEventsForDate: (date: string) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number) => CalendarEvent[];
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],

      addEvent: (event) => {
        const newEvent: CalendarEvent = { ...event, id: crypto.randomUUID() };
        set((state) => ({ events: [...state.events, newEvent] }));
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }));
      },

      deleteEvent: (id) => {
        set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
      },

      getEventsForDate: (date) => {
        return get().events.filter((e) => e.date === date);
      },

      getEventsForMonth: (year, month) => {
        const prefix = `${year}-${String(month).padStart(2, "0")}`;
        return get().events.filter((e) => e.date.startsWith(prefix));
      },
    }),
    {
      name: "webos-calendar",
    },
  ),
);
