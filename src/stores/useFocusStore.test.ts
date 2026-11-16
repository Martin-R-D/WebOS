import { beforeEach, expect, it, vi, afterEach } from "vitest";
import { useFocusStore as store } from "./useFocusStore";
beforeEach(() => {
  store.setState(store.getInitialState(), true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());
it("accounts for elapsed time once and waits before starting a break", () => {
  store.getState().start();
  vi.advanceTimersByTime(30 * 60_000);
  expect(store.getState().tick()).toBe("focus");
  expect(store.getState().tick()).toBeNull();
  expect(store.getState().completed).toHaveLength(1);
  expect(store.getState().status).toBe("idle");
  expect(store.getState().phase).toBe("short");
});
it("pause and resume preserve remaining time", () => {
  store.getState().start();
  vi.advanceTimersByTime(60_000);
  store.getState().pause();
  expect(store.getState().remaining).toBe(24 * 60_000);
  vi.advanceTimersByTime(600_000);
  store.getState().start();
  expect(store.getState().endsAt! - Date.now()).toBe(24 * 60_000);
});
it("skip does not count a focus session and running settings cannot change", () => {
  store.getState().start();
  store.getState().configure("focus", 1);
  expect(store.getState().durations.focus).toBe(25);
  store.getState().skip();
  expect(store.getState().completed).toHaveLength(0);
});
