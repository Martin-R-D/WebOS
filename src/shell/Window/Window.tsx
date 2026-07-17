import * as Icons from "lucide-react";
import type { WindowState } from "../../types";
import { useWindowStore } from "../../stores/useWindowStore";
import { cx } from "../../lib/helpers";
import "./Window.css";

export function Window({ win }: { win: WindowState }) {
  const focusedId = useWindowStore((s) => s.focusedId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);

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
      <div className="window__titlebar">
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
