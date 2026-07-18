import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { X, Square } from "lucide-react";
import type { AppProps } from "../../types";
import { useWindowStore } from "../../stores/useWindowStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { getApp } from "../registry";
import "./TaskManager.css";

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export function TaskManager({ windowId }: AppProps) {
  const windows = useWindowStore((s) => s.windows);
  const focusedId = useWindowStore((s) => s.focusedId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const theme = useSystemStore((s) => s.theme);

  const [uptime, setUptime] = useState(performance.now());

  useEffect(() => {
    const id = setInterval(() => setUptime(performance.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function closeAll() {
    // close everything except the task manager itself
    for (const win of windows) {
      if (win.id !== windowId) closeWindow(win.id);
    }
  }

  return (
    <div className="tm">
      <div className="tm__stats">
        <div className="tm__stat">
          <span>Uptime</span>
          <strong>{formatUptime(uptime)}</strong>
        </div>
        <div className="tm__stat">
          <span>Windows</span>
          <strong>{windows.length}</strong>
        </div>
        <div className="tm__stat">
          <span>Theme</span>
          <strong style={{ textTransform: "capitalize" }}>{theme}</strong>
        </div>
        <div className="tm__stat">
          <span>Memory</span>
          <strong>∞ free</strong>
        </div>
      </div>

      <div className="tm__header">
        <span>Running tasks</span>
        <button className="tm__endall" onClick={closeAll} disabled={windows.length <= 1}>
          End all tasks
        </button>
      </div>

      <div className="tm__list">
        {windows.map((win) => {
          const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[win.icon] ?? Square;
          const isSelf = win.id === windowId;
          return (
            <div
              key={win.id}
              className={`tm__row ${win.id === focusedId ? "tm__row--focused" : ""}`}
            >
              <AppIcon size={16} className="tm__row-icon" />
              <div className="tm__row-info">
                <div className="tm__row-title">{win.title}</div>
                <div className="tm__row-sub">
                  {getApp(win.appId).name} · {win.isMinimized ? "Minimized" : "Running"}
                </div>
              </div>
              <button className="tm__row-btn" onClick={() => focusWindow(win.id)} title="Focus">
                <Icons.Eye size={14} />
              </button>
              <button
                className="tm__row-btn tm__row-btn--danger"
                onClick={() => closeWindow(win.id)}
                disabled={isSelf}
                title={isSelf ? "That's me!" : "End task"}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
