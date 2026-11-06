import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Calendar } from "./Calendar";
import { useCalendarStore } from "../../stores/useCalendarStore";
import { resetAllStores } from "../../test/resetStores";

const cal = () => useCalendarStore.getState();

// Fix date so tests are deterministic: November 6, 2026
const FIXED_DATE = new Date(2026, 10, 6);

describe("Calendar", () => {
  beforeEach(() => {
    resetAllStores();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderCalendar() {
    return render(<Calendar windowId="test-win" />);
  }

  it("renders a month grid with the correct number of day cells for November 2026", () => {
    renderCalendar();
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "31" })).not.toBeInTheDocument();
  });

  it("navigates to the previous month when the left arrow is clicked", () => {
    renderCalendar();
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByLabelText("Previous month")); });
    expect(screen.getByText("October 2026")).toBeInTheDocument();
  });

  it("navigates to the next month when the right arrow is clicked", () => {
    renderCalendar();
    act(() => { fireEvent.click(screen.getByLabelText("Next month")); });
    expect(screen.getByText("December 2026")).toBeInTheDocument();
  });

  it("Today button returns to the current month", () => {
    renderCalendar();
    act(() => { fireEvent.click(screen.getByLabelText("Next month")); });
    expect(screen.getByText("December 2026")).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByRole("button", { name: "Today" })); });
    expect(screen.getByText("November 2026")).toBeInTheDocument();
  });

  it("clicking a day shows the day detail panel", () => {
    renderCalendar();
    act(() => { fireEvent.click(screen.getByRole("button", { name: "15" })); });
    // Detail panel should show the selected date
    expect(screen.getByText(/Sunday.*November.*15|November.*15|15.*November/i)).toBeInTheDocument();
  });

  it("Add Event button reveals the event form", () => {
    renderCalendar();
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Add Event/i })); });
    expect(screen.getByPlaceholderText(/Event title/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("Cancel button hides the form without saving", () => {
    renderCalendar();
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Add Event/i })); });
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Cancel/i })); });
    expect(screen.queryByPlaceholderText(/Event title/i)).not.toBeInTheDocument();
    expect(cal().events).toHaveLength(0);
  });

  it("saving the form calls addEvent on the store", () => {
    renderCalendar();
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Add Event/i })); });
    act(() => { fireEvent.change(screen.getByPlaceholderText(/Event title/i), { target: { value: "My Event" } }); });
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Save/i })); });
    expect(cal().events).toHaveLength(1);
    expect(cal().events[0].title).toBe("My Event");
  });

  it("Save button is disabled when title is empty", () => {
    renderCalendar();
    act(() => { fireEvent.click(screen.getByRole("button", { name: /Add Event/i })); });
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });

  it("delete button requires a second click to confirm, then calls deleteEvent", () => {
    cal().addEvent({ title: "Delete test", date: "2026-11-06", color: "#ef4444" });
    renderCalendar();
    // Multiple elements may show the title (chip + detail list); just check at least one exists
    expect(screen.getAllByText("Delete test").length).toBeGreaterThan(0);
    // First click: confirm mode
    act(() => { fireEvent.click(screen.getByTitle("Delete")); });
    expect(screen.getByTitle("Click again to confirm")).toBeInTheDocument();
    expect(cal().events).toHaveLength(1);
    // Second click: actually deletes
    act(() => { fireEvent.click(screen.getByTitle("Click again to confirm")); });
    expect(cal().events).toHaveLength(0);
  });

  it("edit button opens form pre-filled with event data", () => {
    cal().addEvent({ title: "Editable", date: "2026-11-06", color: "#22c55e", startTime: "09:00" });
    renderCalendar();
    act(() => { fireEvent.click(screen.getByTitle("Edit")); });
    const titleInput = screen.getByPlaceholderText(/Event title/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Editable");
  });
});
