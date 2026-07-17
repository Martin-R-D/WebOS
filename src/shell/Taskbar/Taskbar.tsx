import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { useWindowStore } from "../../stores/useWindowStore";
import { formatClock, cx } from "../../lib/helpers";
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

  const [now, setNow] = useState(new Date());

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
        {windows.map((win) => {
          const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[win.icon] ?? Icons.Square;
          return (
            <button
              key={win.id}
              className={cx(
                "taskbar__app",
                win.id === focusedId && "taskbar__app--active",
                win.isMinimized && "taskbar__app--min",
              )}
              onClick={() => handleAppClick(win.id, win.isMinimized)}
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
    </div>
  );
}
