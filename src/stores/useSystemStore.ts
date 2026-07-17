import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SystemSettings, ThemeName } from "../types";

interface SystemStoreState extends SystemSettings {
  booted: boolean;
  locked: boolean;
  setTheme: (t: ThemeName) => void;
  setWallpaper: (w: string) => void;
  setUsername: (n: string) => void;
  setAccentColor: (c: string) => void;
  toggleSound: () => void;
  setBooted: (v: boolean) => void;
  setLocked: (v: boolean) => void;
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

      setTheme: (t) => set({ theme: t }),
      setWallpaper: (w) => set({ wallpaper: w }),
      setUsername: (n) => set({ username: n }),
      setAccentColor: (c) => set({ accentColor: c }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setBooted: (v) => set({ booted: v }),
      setLocked: (v) => set({ locked: v }),
      resetSettings: () => set({ ...defaults }),
    }),
    {
      name: "webos-system",
      partialize: (state) => ({
        theme: state.theme,
        wallpaper: state.wallpaper,
        username: state.username,
        accentColor: state.accentColor,
        soundEnabled: state.soundEnabled,
        locked: state.locked,
      }),
    },
  ),
);
