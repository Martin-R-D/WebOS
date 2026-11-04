import { describe, it, expect, beforeEach } from "vitest";
import { useSystemStore } from "./useSystemStore";
import { useProfileStore, defaultProfile } from "./useProfileStore";
import { resetAllStores } from "../test/resetStores";

const sys = () => useSystemStore.getState();

describe("useSystemStore", () => {
  beforeEach(resetAllStores);

  it("starts with the documented defaults", () => {
    expect(sys()).toMatchObject({
      theme: "dark", username: "Guest", accentColor: "#6c5ce7",
      soundEnabled: true, pinnedApps: [], desktopIconPos: {}, booted: false,
    });
  });

  it("updates theme, wallpaper, username and accent colour", () => {
    sys().setTheme("midnight");
    sys().setWallpaper("red");
    sys().setUsername("Ada");
    sys().setAccentColor("#ff0000");
    expect(sys()).toMatchObject({ theme: "midnight", wallpaper: "red", username: "Ada", accentColor: "#ff0000" });
  });

  it("toggles sound on and off", () => {
    sys().toggleSound();
    expect(sys().soundEnabled).toBe(false);
    sys().toggleSound();
    expect(sys().soundEnabled).toBe(true);
  });

  describe("pinned apps", () => {
    it("pins an app once and never creates duplicates", () => {
      sys().pinApp("terminal");
      sys().pinApp("terminal");
      expect(sys().pinnedApps).toEqual(["terminal"]);
    });

    it("keeps pin order and unpins only the requested app", () => {
      sys().pinApp("terminal");
      sys().pinApp("paint");
      sys().pinApp("clock");
      sys().unpinApp("paint");
      expect(sys().pinnedApps).toEqual(["terminal", "clock"]);
    });

    it("unpinning an app that is not pinned is harmless", () => {
      sys().pinApp("terminal");
      sys().unpinApp("paint");
      expect(sys().pinnedApps).toEqual(["terminal"]);
    });
  });

  it("remembers desktop icon positions per key without losing others", () => {
    sys().setDesktopIconPos("app-terminal", { x: 10, y: 20 });
    sys().setDesktopIconPos("app-paint", { x: 30, y: 40 });
    sys().setDesktopIconPos("app-terminal", { x: 99, y: 98 });
    expect(sys().desktopIconPos).toEqual({
      "app-terminal": { x: 99, y: 98 },
      "app-paint": { x: 30, y: 40 },
    });
  });

  it("resetSettings restores defaults, pins and icon positions", () => {
    sys().setTheme("light");
    sys().setUsername("Ada");
    sys().pinApp("terminal");
    sys().setDesktopIconPos("k", { x: 1, y: 1 });
    sys().resetSettings();
    expect(sys()).toMatchObject({ theme: "dark", username: "Guest", pinnedApps: [], desktopIconPos: {} });
  });

  it("persists settings but not the transient booted flag", () => {
    sys().setUsername("Ada");
    sys().setBooted(true);
    const saved = JSON.parse(localStorage.getItem("webos-system")!).state;
    expect(saved.username).toBe("Ada");
    expect(saved).not.toHaveProperty("booted");
  });
});

describe("useProfileStore", () => {
  beforeEach(resetAllStores);

  it("starts with the default profile", () => {
    expect(useProfileStore.getState().profile).toEqual(defaultProfile);
  });

  it("stores an edited profile and can reset back to the default", () => {
    useProfileStore.getState().setProfile({ ...defaultProfile, name: "Ada Lovelace", skills: ["Math"] });
    expect(useProfileStore.getState().profile).toMatchObject({ name: "Ada Lovelace", skills: ["Math"] });
    useProfileStore.getState().resetProfile();
    expect(useProfileStore.getState().profile).toEqual(defaultProfile);
  });

  it("persists the profile under webos-profile", () => {
    useProfileStore.getState().setProfile({ ...defaultProfile, name: "Saved" });
    expect(JSON.parse(localStorage.getItem("webos-profile")!).state.profile.name).toBe("Saved");
  });

  it("default profile has well-formed socials and projects", () => {
    for (const s of defaultProfile.socials) expect(s.url).toMatch(/^(https:\/\/|mailto:)/);
    for (const p of defaultProfile.projects) expect(p.tags.length).toBeGreaterThan(0);
  });
});
