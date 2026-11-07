import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BootScreen } from "./BootScreen";
import { resetAllStores } from "../../test/resetStores";

describe("BootScreen", () => {
  beforeEach(() => {
    resetAllStores();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders Monitor icon, WebOS logo, progress bar, and version label", () => {
    render(<BootScreen onDone={() => {}} />);
    // Monitor icon rendered by lucide — check for the boot container
    expect(document.querySelector(".boot")).not.toBeNull();
    expect(document.querySelector(".boot__logo")).not.toBeNull();
    expect(document.querySelector(".boot__bar")).not.toBeNull();
    expect(screen.getByText("v1.0")).toBeInTheDocument();
    // WebOS logo text split across elements
    expect(document.querySelector(".boot__logo")).toHaveTextContent("WebOS");
  });

  it("calls onDone after 2300ms by default", () => {
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2300); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("clicking immediately triggers fade and calls onDone after 300ms", () => {
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    fireEvent.click(document.querySelector(".boot")!);
    expect(document.querySelector(".boot__fadeout")).not.toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("pressing any key skips the boot sequence", () => {
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(document.querySelector(".boot__fadeout")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
