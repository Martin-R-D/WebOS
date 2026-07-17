import { create } from "zustand";
import type { AppId, WindowState } from "../types";

const TASKBAR_HEIGHT = 48;

interface WindowStoreState {
  windows: WindowState[];
  focusedId: string | null;
  topZIndex: number;
  openWindow: (params: {
    appId: AppId;
    title: string;
    icon: string;
    width: number;
    height: number;
    launchProps?: Record<string, unknown>;
  }) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number) => void;
  setBounds: (id: string, b: { x: number; y: number; width: number; height: number }) => void;
  setTitle: (id: string, title: string) => void;
  restoreWindow: (id: string) => void;
}

export const useWindowStore = create<WindowStoreState>()((set, get) => ({
  windows: [],
  focusedId: null,
  topZIndex: 100,

  openWindow: (params) => {
    const id = crypto.randomUUID();
    const { windows, topZIndex } = get();
    const newZ = topZIndex + 1;
    const cascade = windows.length % 6;
    const win: WindowState = {
      id,
      appId: params.appId,
      title: params.title,
      icon: params.icon,
      x: 80 + cascade * 30,
      y: 60 + cascade * 30,
      width: params.width,
      height: params.height,
      zIndex: newZ,
      isMinimized: false,
      isMaximized: false,
      launchProps: params.launchProps,
    };
    set({
      windows: [...windows, win],
      topZIndex: newZ,
      focusedId: id,
    });
    return id;
  },

  closeWindow: (id) => {
    set((state) => {
      const remaining = state.windows.filter((w) => w.id !== id);
      let newFocused: string | null = null;
      if (state.focusedId === id && remaining.length > 0) {
        newFocused = remaining.reduce((top, w) =>
          w.zIndex > top.zIndex ? w : top,
        ).id;
      } else if (state.focusedId !== id) {
        newFocused = state.focusedId;
      }
      return { windows: remaining, focusedId: newFocused };
    });
  },

  focusWindow: (id) => {
    set((state) => {
      const newZ = state.topZIndex + 1;
      return {
        topZIndex: newZ,
        focusedId: id,
        windows: state.windows.map((w) =>
          w.id === id
            ? { ...w, zIndex: newZ, isMinimized: false }
            : w,
        ),
      };
    });
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: true } : w,
      ),
      focusedId: state.focusedId === id ? null : state.focusedId,
    }));
  },

  toggleMaximize: (id) => {
    const { focusWindow } = get();
    set((state) => {
      return {
        windows: state.windows.map((w) => {
          if (w.id !== id) return w;
          if (w.isMaximized) {
            return {
              ...w,
              isMaximized: false,
              x: w.prevBounds?.x ?? 80,
              y: w.prevBounds?.y ?? 60,
              width: w.prevBounds?.width ?? w.width,
              height: w.prevBounds?.height ?? w.height,
              prevBounds: undefined,
            };
          }
          return {
            ...w,
            isMaximized: true,
            prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight - TASKBAR_HEIGHT,
          };
        }),
      };
    });
    focusWindow(id);
  },

  moveWindow: (id, x, y) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, x, y } : w,
      ),
    }));
  },

  resizeWindow: (id, width, height) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, width, height } : w,
      ),
    }));
  },

  setBounds: (id, b) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, ...b } : w,
      ),
    }));
  },

  setTitle: (id, title) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, title } : w,
      ),
    }));
  },

  restoreWindow: (id) => {
    const { focusWindow } = get();
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: false } : w,
      ),
    }));
    focusWindow(id);
  },
}));
