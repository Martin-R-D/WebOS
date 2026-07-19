import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppId, SystemSettings, ThemeName } from "../types";

export interface IconPos {
  x: number;
  y: number;
}

interface SystemStoreState extends SystemSettings {
  booted: boolean;
  locked: boolean;
  pinnedApps: AppId[];
  // Saved desktop icon positions, keyed by icon key ("app-<id>" or fs node id)
  desktopIconPos: Record<string, IconPos>;
  setDesktopIconPos: (key: string, pos: IconPos) => void;
  setTheme: (t: ThemeName) => void;
  setWallpaper: (w: string) => void;
  setUsername: (n: string) => void;
  setAccentColor: (c: string) => void;
  toggleSound: () => void;
  setBooted: (v: boolean) => void;
  setLocked: (v: boolean) => void;
  pinApp: (id: AppId) => void;
  unpinApp: (id: AppId) => void;
  resetSettings: () => void;
}

const defaults: SystemSettings = {
  theme: "dark",
  wallpaper: "linear-gradient(135deg, #6c5ce7 0%, #00cec9 100%)",
  username: "Guest",
  accentColor: "#6c5ce7",
  soundEnabled: true,
};

export const useSystemStore = create<SystemStoreState>()(
  persist(
    (set) => ({
      ...defaults,
      booted: false,
      locked: false,
      pinnedApps: [],
      desktopIconPos: {},

      setDesktopIconPos: (key, pos) => set((s) => ({
        desktopIconPos: { ...s.desktopIconPos, [key]: pos },
      })),

      setTheme: (t) => set({ theme: t }),
      setWallpaper: (w) => set({ wallpaper: w }),
      setUsername: (n) => set({ username: n }),
      setAccentColor: (c) => set({ accentColor: c }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setBooted: (v) => set({ booted: v }),
      setLocked: (v) => set({ locked: v }),
      pinApp: (id) => set((s) => ({
        pinnedApps: s.pinnedApps.includes(id) ? s.pinnedApps : [...s.pinnedApps, id],
      })),
      unpinApp: (id) => set((s) => ({
        pinnedApps: s.pinnedApps.filter((a) => a !== id),
      })),
      resetSettings: () => set({ ...defaults, pinnedApps: [], desktopIconPos: {} }),
    }),
    {
      name: "webos-system",
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        wallpaper: state.wallpaper,
        username: state.username,
        accentColor: state.accentColor,
        soundEnabled: state.soundEnabled,
        locked: state.locked,
        pinnedApps: state.pinnedApps,
        desktopIconPos: state.desktopIconPos,
      }),
    },
  ),
);
