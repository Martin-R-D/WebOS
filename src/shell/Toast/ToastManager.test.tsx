import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastManager } from "./ToastManager";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { resetAllStores } from "../../test/resetStores";

describe("ToastManager", () => {
  beforeEach(() => {
    resetAllStores();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a toast when a notification is pushed", () => {
    render(<ToastManager />);
    act(() => {
      useNotificationStore.getState().push({ title: "Hello", message: "World" });
    });
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("toast disappears after dismiss is called", () => {
    render(<ToastManager />);
    act(() => {
      useNotificationStore.getState().push({ title: "Bye", message: "Gone" });
    });
    const id = useNotificationStore.getState().notifications[0].id;
    act(() => {
      useNotificationStore.getState().dismiss(id);
    });
    expect(screen.queryByText("Bye")).not.toBeInTheDocument();
  });

  it("clicking × marks the notification as read", () => {
    render(<ToastManager />);
    act(() => {
      useNotificationStore.getState().push({ title: "Close me", message: "click x" });
    });
    const closeBtn = screen.getByLabelText("Dismiss");
    fireEvent.click(closeBtn);
    act(() => vi.advanceTimersByTime(400));
    expect(useNotificationStore.getState().notifications[0].read).toBe(true);
  });
});
