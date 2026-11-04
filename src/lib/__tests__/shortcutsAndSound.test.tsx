import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "../useKeyboardShortcuts";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";

const press = (init: KeyboardEventInit) => {
  const e = new KeyboardEvent("keydown", { cancelable: true, bubbles: true, ...init });
  window.dispatchEvent(e);
  return e;
};
const appIds = () => useWindowStore.getState().windows.map((w) => w.appId);

describe("useKeyboardShortcuts", () => {
  beforeEach(resetAllStores);

  it("Ctrl+` launches the terminal and prevents the browser default", () => {
    renderHook(() => useKeyboardShortcuts());
    const e = press({ key: "`", ctrlKey: true });
    expect(appIds()).toEqual(["terminal"]);
    expect(e.defaultPrevented).toBe(true);
  });

  it("Ctrl+E (any case) launches File Explorer and Ctrl+, launches Settings", () => {
    renderHook(() => useKeyboardShortcuts());
    press({ key: "E", ctrlKey: true });
    press({ key: ",", ctrlKey: true });
    expect(appIds()).toEqual(["file-explorer", "settings"]);
  });

  it("Cmd (metaKey) works like Ctrl", () => {
    renderHook(() => useKeyboardShortcuts());
    press({ key: "e", metaKey: true });
    expect(appIds()).toEqual(["file-explorer"]);
  });

  it("repeating a single-instance shortcut focuses instead of duplicating", () => {
    renderHook(() => useKeyboardShortcuts());
    press({ key: ",", ctrlKey: true });
    press({ key: ",", ctrlKey: true });
    expect(appIds()).toEqual(["settings"]);
  });

  it("ignores the keys without a modifier, or with extra Alt/Shift", () => {
    renderHook(() => useKeyboardShortcuts());
    press({ key: "e" });
    press({ key: "e", ctrlKey: true, altKey: true });
    press({ key: "e", ctrlKey: true, shiftKey: true });
    expect(appIds()).toEqual([]);
  });

  it("still works while typing in a text field", () => {
    renderHook(() => useKeyboardShortcuts());
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    press({ key: "`", ctrlKey: true });
    expect(appIds()).toEqual(["terminal"]);
    input.remove();
  });

  it("Escape broadcasts webos:close-menus without preventing the default", () => {
    renderHook(() => useKeyboardShortcuts());
    const listener = vi.fn();
    window.addEventListener("webos:close-menus", listener);
    const e = press({ key: "Escape" });
    window.removeEventListener("webos:close-menus", listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(false);
  });

  it("stops listening after unmount", () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    unmount();
    press({ key: "`", ctrlKey: true });
    expect(appIds()).toEqual([]);
  });
});

describe("playSound", () => {
  const oscillator = { type: "", frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
  let created = 0;

  beforeEach(async () => {
    resetAllStores();
    vi.resetModules();
    created = 0;
    oscillator.connect.mockReturnValue(gain);
    gain.connect.mockReturnValue(undefined);
    oscillator.start.mockClear();
    oscillator.stop.mockClear();
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "running";
        currentTime = 0;
        destination = {};
        constructor() { created++; }
        resume() {}
        createOscillator() { return oscillator; }
        createGain() { return gain; }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function load() {
    const sound = await import("../sound");
    const system = await import("../../stores/useSystemStore");
    return { playSound: sound.playSound, system: system.useSystemStore };
  }

  it("plays a tone with the frequency and waveform of the named sound", async () => {
    const { playSound } = await load();
    playSound("error");
    expect(oscillator.type).toBe("square");
    expect(oscillator.frequency.value).toBe(200);
    expect(oscillator.start).toHaveBeenCalledTimes(1);
    expect(oscillator.stop).toHaveBeenCalledWith(0.12);
  });

  it("is silent and never creates an audio context when sound is disabled", async () => {
    const { playSound, system } = await load();
    system.setState({ soundEnabled: false });
    playSound("open");
    expect(created).toBe(0);
    expect(oscillator.start).not.toHaveBeenCalled();
  });

  it("reuses a single audio context across sounds", async () => {
    const { playSound } = await load();
    playSound("open");
    playSound("close");
    expect(created).toBe(1);
  });

  it("does not throw when the browser has no Web Audio support", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { playSound } = await load();
    expect(() => playSound("chime")).not.toThrow();
  });
});
