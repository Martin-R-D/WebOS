import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LockScreen } from "./LockScreen";
import { useSystemStore } from "../../stores/useSystemStore";
import { resetAllStores } from "../../test/resetStores";

describe("LockScreen", () => {
  beforeEach(() => {
    resetAllStores();
    useSystemStore.getState().setUsername("TestUser");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders clock, username, and hint text", () => {
    render(<LockScreen onUnlock={() => {}} />);
    // hint text
    expect(screen.getByText("Press Enter or click to unlock")).toBeInTheDocument();
    // username
    expect(screen.getByText("TestUser")).toBeInTheDocument();
    // avatar initial
    expect(screen.getByText("T")).toBeInTheDocument();
    // clock element is present
    expect(document.querySelector(".lock__clock")).not.toBeNull();
  });

  it("clicking triggers unlock animation then calls onUnlock after 350ms", () => {
    const onUnlock = vi.fn();
    render(<LockScreen onUnlock={onUnlock} />);
    fireEvent.click(document.querySelector(".lock")!);
    expect(document.querySelector(".lock--unlocking")).not.toBeNull();
    expect(onUnlock).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(350); });
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("pressing Enter triggers unlock animation then calls onUnlock after 350ms", () => {
    const onUnlock = vi.fn();
    render(<LockScreen onUnlock={onUnlock} />);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(document.querySelector(".lock--unlocking")).not.toBeNull();
    expect(onUnlock).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(350); });
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("double-click does not call onUnlock twice", () => {
    const onUnlock = vi.fn();
    render(<LockScreen onUnlock={onUnlock} />);
    fireEvent.click(document.querySelector(".lock")!);
    fireEvent.click(document.querySelector(".lock")!);
    act(() => { vi.advanceTimersByTime(400); });
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });
});
