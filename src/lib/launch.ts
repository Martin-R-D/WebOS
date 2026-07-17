import type { AppId } from "../types";
import { appRegistry } from "../apps/registry";
import { useWindowStore } from "../stores/useWindowStore";
import { playSound } from "./sound";

export function launchApp(appId: AppId) {
  const app = appRegistry[appId];
  if (!app) return;

  const { windows, openWindow, focusWindow } = useWindowStore.getState();

  if (app.singleInstance) {
    const existing = windows.find((w) => w.appId === app.id);
    if (existing) {
      focusWindow(existing.id);
      return;
    }
  }

  openWindow({
    appId: app.id,
    title: app.name,
    icon: app.icon,
    width: app.defaultWidth,
    height: app.defaultHeight,
  });
  playSound("open");
}
