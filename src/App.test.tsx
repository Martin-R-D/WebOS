import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { useSystemStore } from "./stores/useSystemStore";
import { useWindowStore } from "./stores/useWindowStore";
import { resetAllStores } from "./test/resetStores";

const sys = () => useSystemStore.getState();

describe("App", () => {
  beforeEach(() => {
    resetAllStores();
    sys().setBooted(true);
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.removeProperty("--color-accent");
  });

  it("shows the boot screen first, then the desktop once the boot animation finishes", () => {
    vi.useFakeTimers();
    try {
      sys().setBooted(false);
      const { container } = render(<App />);
      expect(container.querySelector(".boot")).not.toBeNull();
      expect(container.querySelector(".taskbar")).toBeNull();

      act(() => { vi.advanceTimersByTime(2000); });
      expect(container.querySelector(".boot__fadeout")).not.toBeNull();
      expect(sys().booted).toBe(false);

      act(() => { vi.advanceTimersByTime(400); });
      expect(sys().booted).toBe(true);
      expect(container.querySelector(".boot")).toBeNull();
      expect(container.querySelector(".taskbar")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the lock screen when locked and Enter unlocks to the desktop", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      sys().setLocked(true);
      sys().setUsername("ada");
      const { container } = render(<App />);
      expect(screen.getByText("Press Enter or click to unlock")).toBeInTheDocument();
      expect(screen.getByText("ada")).toBeInTheDocument();
      expect(container.querySelector(".taskbar")).toBeNull();

      await userEvent.keyboard("{Enter}");
      act(() => { vi.advanceTimersByTime(400); });
      expect(sys().locked).toBe(false);
      expect(container.querySelector(".taskbar")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("clicking the lock screen also unlocks", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      sys().setLocked(true);
      render(<App />);
      await userEvent.click(screen.getByText("Press Enter or click to unlock"));
      act(() => { vi.advanceTimersByTime(400); });
      expect(sys().locked).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies the theme and accent colour to the document", () => {
    sys().setTheme("midnight");
    sys().setAccentColor("#00cec9");
    render(<App />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("#00cec9");
  });

  it("opening an app from the Start menu renders its window and closes the menu", async () => {
    const { container } = render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(container.querySelector(".startmenu")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Calculator" }));
    expect(container.querySelector(".startmenu")).toBeNull();
    expect(container.querySelectorAll(".window")).toHaveLength(1);
    expect(container.querySelector(".window__title")).toHaveTextContent("Calculator");
  });

  it("Escape closes an open Start menu", async () => {
    const { container } = render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(container.querySelector(".startmenu")).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(container.querySelector(".startmenu")).toBeNull();
  });

  it("Ctrl+E opens File Explorer through the global shortcuts", async () => {
    const { container } = render(<App />);
    await userEvent.keyboard("{Control>}e{/Control}");
    expect(useWindowStore.getState().windows.map((w) => w.appId)).toEqual(["file-explorer"]);
    expect(container.querySelectorAll(".window")).toHaveLength(1);
  });

  it("closing a window from its title bar removes it from the screen and the taskbar", async () => {
    const { container } = render(<App />);
    await userEvent.keyboard("{Control>}`{/Control}");
    expect(container.querySelectorAll(".window")).toHaveLength(1);
    await userEvent.click(container.querySelector(".window__btn--close")!);
    expect(container.querySelectorAll(".window")).toHaveLength(0);
    expect(container.querySelectorAll(".taskbar__app")).toHaveLength(0);
  });
});
