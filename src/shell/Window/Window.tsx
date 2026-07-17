import { useRef } from "react";
import * as Icons from "lucide-react";
import type { WindowState } from "../../types";
import { useWindowStore } from "../../stores/useWindowStore";
import { cx } from "../../lib/helpers";
import "./Window.css";

interface DragState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
}

export function Window({ win }: { win: WindowState }) {
  const focusedId = useWindowStore((s) => s.focusedId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const moveWindow = useWindowStore((s) => s.moveWindow);

  const drag = useRef<DragState | null>(null);

  function onTitleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".window__btn")) return;
    if (win.isMaximized) return;
    focusWindow(win.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = win.x;
    const origY = win.y;

    function onMouseMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const nextX = Math.max(-win.width + 120, Math.min(origX + dx, window.innerWidth - 120));
      const nextY = Math.max(0, Math.min(origY + dy, window.innerHeight - 80));
      moveWindow(win.id, nextX, nextY);
    }

    function onMouseUp() {
      document.body.classList.remove("dragging");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      drag.current = null;
    }

    drag.current = { startX, startY, origX, origY, onMouseMove, onMouseUp };
    document.body.classList.add("dragging");
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  if (win.isMinimized) return null;

  const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[win.icon] ?? Icons.Square;

  return (
    <div
      className={cx("window", win.id === focusedId && "window--focused")}
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }}
      onMouseDown={() => focusWindow(win.id)}
    >
      <div className="window__titlebar" onMouseDown={onTitleMouseDown}>
        <div className="window__title-left">
          <AppIcon size={14} />
          <span className="window__title">{win.title}</span>
        </div>
        <div className="window__controls">
          <button
            className="window__btn"
            onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
          >
            <Icons.Minus size={14} />
          </button>
          <button
            className="window__btn"
            onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}
          >
            <Icons.Square size={12} />
          </button>
          <button
            className="window__btn window__btn--close"
            onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
          >
            <Icons.X size={14} />
          </button>
        </div>
      </div>
      <div className="window__body">
        <div style={{ padding: 16, color: "var(--color-text-dim)" }}>App content here</div>
      </div>
    </div>
  );
}
