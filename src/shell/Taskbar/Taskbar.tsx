import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { useWindowStore } from "../../stores/useWindowStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { appRegistry } from "../../apps/registry";
import { launchApp } from "../../lib/launch";
import { formatClock, cx } from "../../lib/helpers";
import { ContextMenu } from "../ContextMenu/ContextMenu";
import type { AppId, ContextMenuItem } from "../../types";
import "./Taskbar.css";

interface TaskbarProps {
  onToggleStart: () => void;
  startOpen: boolean;
}

export function Taskbar({ onToggleStart, startOpen }: TaskbarProps) {
  const windows = useWindowStore((s) => s.windows);
  const focusedId = useWindowStore((s) => s.focusedId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const restoreWindow = useWindowStore((s) => s.restoreWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const pinnedApps = useSystemStore((s) => s.pinnedApps);
  const pinApp = useSystemStore((s) => s.pinApp);
  const unpinApp = useSystemStore((s) => s.unpinApp);

  const [now, setNow] = useState(new Date());
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { time, dateStr } = formatClock(now);

  function handleAppClick(winId: string, isMinimized: boolean) {
    if (focusedId === winId && !isMinimized) {
      minimizeWindow(winId);
    } else {
      restoreWindow(winId);
    }
  }

  function handlePinnedContext(e: React.MouseEvent, appId: AppId) {
    e.preventDefault();
    e.stopPropagation();
    const app = appRegistry[appId];
    const items: ContextMenuItem[] = [
      { label: "Open", icon: app.icon, onClick: () => launchApp(appId) },
      { label: "Unpin from Taskbar", icon: "PinOff", onClick: () => unpinApp(appId) },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  function handleRunningContext(e: React.MouseEvent, winId: string, appId: AppId) {
    e.preventDefault();
    e.stopPropagation();
    const isPinned = pinnedApps.includes(appId);
    const items: ContextMenuItem[] = [
      isPinned
        ? { label: "Unpin from Taskbar", icon: "PinOff", onClick: () => unpinApp(appId) }
        : { label: "Add to Taskbar", icon: "Pin", onClick: () => pinApp(appId) },
      { label: "Close", icon: "X", danger: true, separatorBefore: true, onClick: () => closeWindow(winId) },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  const runningAppIds = new Set(windows.map((w) => w.appId));

  return (
    <div className="taskbar">
      <button
        className={cx("taskbar__start", startOpen && "taskbar__start--active")}
        onClick={onToggleStart}
      >
        <Icons.LayoutGrid size={16} />
        <span>Start</span>
      </button>

      <div className="taskbar__apps">
        {/* Pinned apps that are NOT running */}
        {pinnedApps
          .filter((appId) => !runningAppIds.has(appId))
          .map((appId) => {
            const app = appRegistry[appId];
            if (!app) return null;
            const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[app.icon] ?? Icons.Square;
            return (
              <button
                key={`pin-${appId}`}
                className="taskbar__app taskbar__app--pinned"
                onClick={() => launchApp(appId)}
                onContextMenu={(e) => handlePinnedContext(e, appId)}
                title={app.name}
              >
                <AppIcon size={14} />
                <span>{app.name}</span>
              </button>
            );
          })}

        {/* Running windows */}
        {windows.map((win) => {
          const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[win.icon] ?? Icons.Square;
          const isPinned = pinnedApps.includes(win.appId);
          return (
            <button
              key={win.id}
              className={cx(
                "taskbar__app",
                win.id === focusedId && "taskbar__app--active",
                win.isMinimized && "taskbar__app--min",
                isPinned && "taskbar__app--pinned-running",
              )}
              onClick={() => handleAppClick(win.id, win.isMinimized)}
              onContextMenu={(e) => handleRunningContext(e, win.id, win.appId)}
            >
              <AppIcon size={14} />
              <span>{win.title}</span>
            </button>
          );
        })}
      </div>

      <div className="taskbar__tray">
        <Icons.Wifi size={14} />
        <Icons.Volume2 size={14} />
        <div className="taskbar__clock">
          <span>{time}</span>
          <small>{dateStr}</small>
        </div>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
