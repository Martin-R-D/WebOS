import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { resetAllStores } from "../../test/resetStores";
import { Taskbar } from "./Taskbar";

function renderTaskbar() {
  return render(<Taskbar onToggleStart={() => {}} startOpen={false} />);
}

describe("NotificationPanel (via Taskbar)", () => {
  beforeEach(resetAllStores);

  it("bell icon shows no badge when no unread notifications", () => {
    renderTaskbar();
    expect(document.querySelector(".taskbar__bell-badge")).toBeNull();
  });

  it("bell icon shows badge with unread count when notifications exist", () => {
    renderTaskbar();
    act(() => {
      useNotificationStore.getState().push({ title: "A", message: "a" });
      useNotificationStore.getState().push({ title: "B", message: "b" });
    });
    const badge = document.querySelector(".taskbar__bell-badge");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("2");
  });

  it("clicking bell opens the notification panel", () => {
    renderTaskbar();
    const bell = screen.getByLabelText("Toggle notifications");
    fireEvent.click(bell);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("clicking outside closes the panel", () => {
    renderTaskbar();
    const bell = screen.getByLabelText("Toggle notifications");
    fireEvent.click(bell);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });

  it("mark all read button marks all as read", () => {
    renderTaskbar();
    act(() => {
      useNotificationStore.getState().push({ title: "A", message: "a" });
    });
    fireEvent.click(screen.getByLabelText("Toggle notifications"));
    fireEvent.click(screen.getByText("Mark all read"));
    expect(useNotificationStore.getState().notifications.every((n) => n.read)).toBe(true);
  });

  it("clear all button empties notifications", () => {
    renderTaskbar();
    act(() => {
      useNotificationStore.getState().push({ title: "A", message: "a" });
    });
    fireEvent.click(screen.getByLabelText("Toggle notifications"));
    fireEvent.click(screen.getByText("Clear all"));
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });
});
