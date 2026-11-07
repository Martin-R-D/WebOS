import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useSystemStore } from "../stores/useSystemStore";
import { resetAllStores } from "../test/resetStores";

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    resetAllStores();
  });

  afterEach(() => {
    // ensure handlers are cleaned up between tests
  });

  it("Ctrl+L locks the screen", () => {
    renderHook(() => useKeyboardShortcuts());
    expect(useSystemStore.getState().locked).toBe(false);
    fireEvent.keyDown(window, { key: "l", ctrlKey: true });
    expect(useSystemStore.getState().locked).toBe(true);
  });

  it("Ctrl+L with uppercase key also locks", () => {
    renderHook(() => useKeyboardShortcuts());
    fireEvent.keyDown(window, { key: "L", ctrlKey: true });
    expect(useSystemStore.getState().locked).toBe(true);
  });

  it("plain L does not lock", () => {
    renderHook(() => useKeyboardShortcuts());
    fireEvent.keyDown(window, { key: "l" });
    expect(useSystemStore.getState().locked).toBe(false);
  });
});
