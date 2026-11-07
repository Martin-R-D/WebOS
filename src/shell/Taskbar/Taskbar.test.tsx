import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Taskbar } from "./Taskbar";
import { useWindowStore } from "../../stores/useWindowStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { launchApp } from "../../lib/launch";
import { resetAllStores } from "../../test/resetStores";

const ws = () => useWindowStore.getState();

describe("Taskbar", () => {
  beforeEach(() => {
    resetAllStores();
    vi.useRealTimers();
  });

  it("shows one button per open window", () => {
    launchApp("terminal");
    launchApp("paint");
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    expect(screen.getByRole("button", { name: /Terminal/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Paint/ })).toBeInTheDocument();
  });

  it("Start button toggles via the callback and reflects the open state", async () => {
    const toggle = vi.fn();
    const { rerender } = render(<Taskbar onToggleStart={toggle} startOpen={false} />);
    await userEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Start/ })).not.toHaveClass("taskbar__start--active");
    rerender(<Taskbar onToggleStart={toggle} startOpen />);
    expect(screen.getByRole("button", { name: /Start/ })).toHaveClass("taskbar__start--active");
  });

  it("clicking the focused window minimizes it; clicking again restores it", async () => {
    launchApp("terminal");
    const id = ws().windows[0].id;
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    const btn = screen.getByRole("button", { name: /Terminal/ });
    await userEvent.click(btn);
    expect(ws().windows[0].isMinimized).toBe(true);
    expect(btn).toHaveClass("taskbar__app--min");
    await userEvent.click(btn);
    expect(ws().windows[0].isMinimized).toBe(false);
    expect(ws().focusedId).toBe(id);
  });

  it("clicking a background window focuses it instead of minimizing", async () => {
    launchApp("terminal");
    launchApp("paint");
    const terminalId = ws().windows[0].id;
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    await userEvent.click(screen.getByRole("button", { name: /Terminal/ }));
    expect(ws().focusedId).toBe(terminalId);
    expect(ws().windows[0].isMinimized).toBe(false);
  });

  it("marks the focused window as active", () => {
    launchApp("terminal");
    launchApp("paint");
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    expect(screen.getByRole("button", { name: /Paint/ })).toHaveClass("taskbar__app--active");
    expect(screen.getByRole("button", { name: /Terminal/ })).not.toHaveClass("taskbar__app--active");
  });

  it("shows pinned apps that are not running and launches them on click", async () => {
    useSystemStore.getState().pinApp("calculator");
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    const pinned = screen.getByTitle("Calculator");
    expect(pinned).toHaveClass("taskbar__app--pinned");
    await userEvent.click(pinned);
    expect(ws().windows.map((w) => w.appId)).toEqual(["calculator"]);
  });

  it("does not duplicate a pinned app once it is running", () => {
    useSystemStore.getState().pinApp("calculator");
    launchApp("calculator");
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    expect(screen.getAllByRole("button", { name: /Calculator/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Calculator/ })).toHaveClass("taskbar__app--pinned-running");
  });

  it("right-click on a running pinned app offers Close and Unpin", async () => {
    useSystemStore.getState().pinApp("terminal");
    launchApp("terminal");
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    fireEvent.contextMenu(screen.getByRole("button", { name: /Terminal/ }));
    await userEvent.click(screen.getByText("Unpin"));
    expect(useSystemStore.getState().pinnedApps).toEqual([]);
    fireEvent.contextMenu(screen.getByRole("button", { name: /Terminal/ }));
    expect(screen.queryByText("Unpin")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Close"));
    expect(ws().windows).toHaveLength(0);
  });

  it("right-click on an unpinned running app offers only Close", () => {
    launchApp("terminal");
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    fireEvent.contextMenu(screen.getByRole("button", { name: /Terminal/ }));
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.queryByText("Unpin")).not.toBeInTheDocument();
  });

  it("renders lock button in tray and clicking it calls setLocked(true)", () => {
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    const lockBtn = screen.getByTitle("Lock (Ctrl+L)");
    expect(lockBtn).toBeInTheDocument();
    fireEvent.click(lockBtn);
    expect(useSystemStore.getState().locked).toBe(true);
  });

  it("ticks the clock every second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 9, 59, 30));
    render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
    expect(screen.getByText("9:59 AM")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(31_000); });
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
  });
});
