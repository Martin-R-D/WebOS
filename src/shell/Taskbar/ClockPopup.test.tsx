import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Taskbar } from "./Taskbar";
import { resetAllStores } from "../../test/resetStores";

const FIXED_DATE = new Date(2026, 10, 6, 10, 30, 0); // Nov 6, 2026

describe("ClockPopup", () => {
  beforeEach(() => {
    resetAllStores();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderTaskbar() {
    return render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
  }

  it("clock popup is not visible initially", () => {
    renderTaskbar();
    expect(screen.queryByText("November 2026")).not.toBeInTheDocument();
  });

  it("clicking the clock button opens the popup showing current month and year", () => {
    renderTaskbar();
    act(() => { fireEvent.click(screen.getByLabelText("Toggle calendar popup")); });
    expect(screen.getByText("November 2026")).toBeInTheDocument();
  });

  it("popup shows day-of-week column headers", () => {
    renderTaskbar();
    act(() => { fireEvent.click(screen.getByLabelText("Toggle calendar popup")); });
    expect(screen.getByText("Mo")).toBeInTheDocument();
    expect(screen.getByText("Su")).toBeInTheDocument();
  });

  it("clicking outside the popup closes it", () => {
    renderTaskbar();
    act(() => { fireEvent.click(screen.getByLabelText("Toggle calendar popup")); });
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    act(() => { fireEvent.mouseDown(document.body); });
    expect(screen.queryByText("November 2026")).not.toBeInTheDocument();
  });

  it("clicking the clock button again toggles the popup closed", () => {
    renderTaskbar();
    const clockBtn = screen.getByLabelText("Toggle calendar popup");
    act(() => { fireEvent.click(clockBtn); });
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    act(() => { fireEvent.click(clockBtn); });
    expect(screen.queryByText("November 2026")).not.toBeInTheDocument();
  });
});
