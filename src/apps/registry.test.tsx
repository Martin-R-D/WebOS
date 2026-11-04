import { describe, it, expect } from "vitest";
import * as Icons from "lucide-react";
import { appRegistry, getApp } from "./registry";
import { useFileSystemStore } from "../stores/useFileSystemStore";

describe("app registry", () => {
  const apps = Object.entries(appRegistry);

  it("registers each app under its own id", () => {
    for (const [key, app] of apps) expect(app.id, key).toBe(key);
  });

  it("gives every app a name, a renderable component and a real lucide icon", () => {
    for (const [key, app] of apps) {
      expect(app.name.trim(), key).not.toBe("");
      expect(typeof app.component, key).toBe("function");
      expect((Icons as Record<string, unknown>)[app.icon], `${key} icon ${app.icon}`).toBeDefined();
    }
  });

  it("has unique display names so `open <name>` is unambiguous", () => {
    const names = apps.map(([, a]) => a.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("has sane window sizes: default size is at least the minimum size", () => {
    for (const [key, app] of apps) {
      expect(app.defaultWidth, key).toBeGreaterThanOrEqual(app.minWidth ?? 0);
      expect(app.defaultHeight, key).toBeGreaterThanOrEqual(app.minHeight ?? 0);
      expect(app.defaultWidth, key).toBeGreaterThan(0);
    }
  });

  it("every app has a .app shortcut in the seeded System Apps folder that points back at it", () => {
    const { nodes } = useFileSystemStore.getInitialState();
    const systemApps = Object.values(nodes).find((n) => n.name === "System Apps")!;
    const shortcuts = Object.values(nodes).filter((n) => n.parentId === systemApps.id);
    const targets = shortcuts.map((s) => s.content).sort();
    expect(targets).toEqual(Object.keys(appRegistry).sort());
    for (const s of shortcuts) {
      expect(s.name).toBe(`${appRegistry[s.content as keyof typeof appRegistry].name}.app`);
    }
  });

  describe("getApp", () => {
    it("returns the definition for a known id", () => {
      expect(getApp("terminal")).toBe(appRegistry.terminal);
    });
  });
});
