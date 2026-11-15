import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useResolvedTheme } from "./useResolvedTheme";
import { useSystemStore } from "../stores/useSystemStore";
import { resetAllStores } from "../test/resetStores";

beforeEach(resetAllStores);
afterEach(() => vi.unstubAllGlobals());

it("follows live system changes, respects manual override and removes its listener", () => {
  let dark = false;
  let notify = () => {};
  const remove = vi.fn();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return dark;
      },
      addEventListener: (_event: string, listener: () => void) => {
        notify = listener;
      },
      removeEventListener: remove,
    })),
  );
  useSystemStore.getState().setFollowSystemTheme(true);
  const { result, unmount } = renderHook(useResolvedTheme);
  expect(result.current).toBe("light");
  act(() => {
    dark = true;
    notify();
  });
  expect(result.current).toBe("dark");
  act(() => useSystemStore.getState().setTheme("midnight"));
  act(() => {
    dark = false;
    notify();
  });
  expect(result.current).toBe("midnight");
  expect(useSystemStore.getState().followSystemTheme).toBe(false);
  unmount();
  expect(remove).toHaveBeenCalled();
});

it("persists follow preference, keeps the manual choice and resets to defaults", async () => {
  const store = useSystemStore.getState();
  store.setTheme("midnight");
  store.setFollowSystemTheme(true);
  const saved = localStorage.getItem("webos-system")!;
  store.resetSettings();
  expect(useSystemStore.getState().followSystemTheme).toBe(false);
  localStorage.setItem("webos-system", saved);
  await useSystemStore.persist.rehydrate();
  expect(useSystemStore.getState()).toMatchObject({
    theme: "midnight",
    followSystemTheme: true,
  });
  store.setFollowSystemTheme(false);
  expect(useSystemStore.getState().theme).toBe("midnight");
});
