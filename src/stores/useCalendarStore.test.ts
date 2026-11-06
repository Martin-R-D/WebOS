import { describe, it, expect, beforeEach } from "vitest";
import { useCalendarStore } from "./useCalendarStore";
import { resetAllStores } from "../test/resetStores";

const cal = () => useCalendarStore.getState();

describe("useCalendarStore", () => {
  beforeEach(resetAllStores);

  describe("addEvent", () => {
    it("adds an event and assigns a unique id", () => {
      cal().addEvent({ title: "Team meeting", date: "2026-11-10", color: "#3b82f6" });
      const events = cal().events;
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Team meeting");
      expect(events[0].id).toBeTruthy();
    });

    it("adds multiple events with distinct ids", () => {
      cal().addEvent({ title: "A", date: "2026-11-10", color: "#ef4444" });
      cal().addEvent({ title: "B", date: "2026-11-10", color: "#22c55e" });
      const ids = cal().events.map((e) => e.id);
      expect(ids[0]).not.toBe(ids[1]);
    });
  });

  describe("updateEvent", () => {
    it("updates only the specified fields", () => {
      cal().addEvent({ title: "Old title", date: "2026-11-10", color: "#ef4444" });
      const id = cal().events[0].id;
      cal().updateEvent(id, { title: "New title" });
      expect(cal().events[0].title).toBe("New title");
      expect(cal().events[0].color).toBe("#ef4444");
    });

    it("does nothing for an unknown id", () => {
      cal().addEvent({ title: "Existing", date: "2026-11-10", color: "#3b82f6" });
      cal().updateEvent("nonexistent", { title: "Changed" });
      expect(cal().events[0].title).toBe("Existing");
    });
  });

  describe("deleteEvent", () => {
    it("removes the event with the given id", () => {
      cal().addEvent({ title: "Delete me", date: "2026-11-10", color: "#ef4444" });
      const id = cal().events[0].id;
      cal().deleteEvent(id);
      expect(cal().events).toHaveLength(0);
    });

    it("does not affect other events", () => {
      cal().addEvent({ title: "Keep", date: "2026-11-10", color: "#22c55e" });
      cal().addEvent({ title: "Remove", date: "2026-11-10", color: "#ef4444" });
      const removeId = cal().events[1].id;
      cal().deleteEvent(removeId);
      expect(cal().events).toHaveLength(1);
      expect(cal().events[0].title).toBe("Keep");
    });
  });

  describe("getEventsForDate", () => {
    it("returns only events matching the exact date string", () => {
      cal().addEvent({ title: "Today", date: "2026-11-10", color: "#3b82f6" });
      cal().addEvent({ title: "Tomorrow", date: "2026-11-11", color: "#a855f7" });
      const result = cal().getEventsForDate("2026-11-10");
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Today");
    });

    it("returns an empty array when no events match", () => {
      expect(cal().getEventsForDate("2026-11-01")).toEqual([]);
    });
  });

  describe("getEventsForMonth", () => {
    it("returns all events in the given year/month", () => {
      cal().addEvent({ title: "Nov 1", date: "2026-11-01", color: "#3b82f6" });
      cal().addEvent({ title: "Nov 15", date: "2026-11-15", color: "#22c55e" });
      cal().addEvent({ title: "Dec 1", date: "2026-12-01", color: "#ef4444" });
      const result = cal().getEventsForMonth(2026, 11);
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.title)).toEqual(expect.arrayContaining(["Nov 1", "Nov 15"]));
    });

    it("returns an empty array when no events exist for the month", () => {
      cal().addEvent({ title: "Nov event", date: "2026-11-05", color: "#3b82f6" });
      expect(cal().getEventsForMonth(2026, 10)).toHaveLength(0);
    });
  });

  describe("persistence", () => {
    it("persists events under the webos-calendar key", () => {
      cal().addEvent({ title: "Persisted", date: "2026-11-10", color: "#3b82f6" });
      const raw = JSON.parse(localStorage.getItem("webos-calendar")!);
      expect(Array.isArray(raw.state.events)).toBe(true);
      expect(raw.state.events[0].title).toBe("Persisted");
    });
  });
});
