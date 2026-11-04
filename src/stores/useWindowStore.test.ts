import { describe, it, expect, beforeEach } from "vitest";
import { useWindowStore } from "./useWindowStore";
import { resetAllStores } from "../test/resetStores";

const ws = () => useWindowStore.getState();
const open = (title = "w") =>
  ws().openWindow({ appId: "terminal", title, icon: "Square", width: 400, height: 300 });
const win = (id: string) => ws().windows.find((w) => w.id === id)!;

describe("useWindowStore", () => {
  beforeEach(resetAllStores);

  describe("openWindow", () => {
    it("adds a focused window with the requested size and launch props", () => {
      const id = ws().openWindow({
        appId: "text-editor", title: "a.txt", icon: "FileText", width: 500, height: 350,
        launchProps: { fileId: "f1" },
      });
      expect(ws().windows).toHaveLength(1);
      expect(ws().focusedId).toBe(id);
      expect(win(id)).toMatchObject({
        appId: "text-editor", title: "a.txt", width: 500, height: 350,
        isMinimized: false, isMaximized: false, launchProps: { fileId: "f1" },
      });
    });

    it("gives every new window a higher z-index than the previous one", () => {
      const a = open();
      const b = open();
      expect(win(b).zIndex).toBeGreaterThan(win(a).zIndex);
    });

    it("cascades the position of successive windows", () => {
      const a = open();
      const b = open();
      expect(win(b).x).toBe(win(a).x + 30);
      expect(win(b).y).toBe(win(a).y + 30);
    });

    it("wraps the cascade after six windows so windows do not drift off screen", () => {
      const ids = Array.from({ length: 7 }, () => open());
      expect(win(ids[6]).x).toBe(win(ids[0]).x);
    });
  });

  describe("focusWindow", () => {
    it("brings a window to the front and focuses it", () => {
      const a = open();
      const b = open();
      ws().focusWindow(a);
      expect(ws().focusedId).toBe(a);
      expect(win(a).zIndex).toBeGreaterThan(win(b).zIndex);
    });

    it("restores a minimized window", () => {
      const a = open();
      ws().minimizeWindow(a);
      ws().focusWindow(a);
      expect(win(a).isMinimized).toBe(false);
    });
  });

  describe("minimizeWindow / restoreWindow", () => {
    it("minimizing the focused window clears focus", () => {
      const a = open();
      ws().minimizeWindow(a);
      expect(win(a).isMinimized).toBe(true);
      expect(ws().focusedId).toBeNull();
    });

    it("minimizing a non-focused window keeps the focus where it was", () => {
      const a = open();
      const b = open();
      ws().minimizeWindow(a);
      expect(ws().focusedId).toBe(b);
    });

    it("restoring un-minimizes and focuses", () => {
      const a = open();
      ws().minimizeWindow(a);
      ws().restoreWindow(a);
      expect(win(a).isMinimized).toBe(false);
      expect(ws().focusedId).toBe(a);
    });
  });

  describe("toggleMaximize", () => {
    it("maximizes to the viewport minus the taskbar and remembers previous bounds", () => {
      const id = open();
      const before = { x: win(id).x, y: win(id).y, width: win(id).width, height: win(id).height };
      ws().toggleMaximize(id);
      expect(win(id)).toMatchObject({
        isMaximized: true, x: 0, y: 0,
        width: window.innerWidth, height: window.innerHeight - 48,
        prevBounds: before,
      });
    });

    it("restores the exact previous bounds when toggled again", () => {
      const id = open();
      ws().moveWindow(id, 123, 77);
      ws().resizeWindow(id, 555, 333);
      ws().toggleMaximize(id);
      ws().toggleMaximize(id);
      expect(win(id)).toMatchObject({ isMaximized: false, x: 123, y: 77, width: 555, height: 333 });
      expect(win(id).prevBounds).toBeUndefined();
    });
  });

  describe("moveWindow / resizeWindow / setBounds / setTitle", () => {
    it("only changes the targeted window", () => {
      const a = open();
      const b = open();
      const bBefore = { ...win(b) };
      ws().moveWindow(a, 10, 20);
      ws().resizeWindow(a, 700, 600);
      ws().setTitle(a, "renamed");
      expect(win(a)).toMatchObject({ x: 10, y: 20, width: 700, height: 600, title: "renamed" });
      expect(win(b)).toEqual(bBefore);
    });

    it("setBounds updates position and size together", () => {
      const a = open();
      ws().setBounds(a, { x: 1, y: 2, width: 300, height: 200 });
      expect(win(a)).toMatchObject({ x: 1, y: 2, width: 300, height: 200 });
    });
  });

  describe("closeWindow", () => {
    it("removes the window", () => {
      const a = open();
      ws().closeWindow(a);
      expect(ws().windows).toHaveLength(0);
    });

    it("focuses the top-most remaining window when the focused one closes", () => {
      const a = open();
      const b = open();
      const c = open();
      ws().focusWindow(a);
      ws().focusWindow(b);
      ws().closeWindow(b);
      expect(ws().focusedId).toBe(a);
      expect(ws().windows.map((w) => w.id)).toEqual([a, c]);
    });

    it("keeps focus on the current window when a different one closes", () => {
      const a = open();
      const b = open();
      ws().closeWindow(a);
      expect(ws().focusedId).toBe(b);
    });

    it("leaves no focus when the last window closes", () => {
      const a = open();
      ws().closeWindow(a);
      expect(ws().focusedId).toBeNull();
    });
  });
});
