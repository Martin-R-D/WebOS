import { useRef } from "react";
import * as Icons from "lucide-react";
import type { WindowState } from "../../types";
import { useWindowStore } from "../../stores/useWindowStore";
import { getApp } from "../../apps/registry";
import { cx } from "../../lib/helpers";
import { playSound } from "../../lib/sound";
import "./Window.css";

const RESIZE_DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type ResizeDir = (typeof RESIZE_DIRS)[number];

export function Window({ win }: { win: WindowState }) {
  const focusedId = useWindowStore((s) => s.focusedId);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const minimizeWindow = useWindowStore((s) => s.minimizeWindow);
  const toggleMaximize = useWindowStore((s) => s.toggleMaximize);
  const moveWindow = useWindowStore((s) => s.moveWindow);
  const setBounds = useWindowStore((s) => s.setBounds);

  const def = getApp(win.appId);
  const minW = def.minWidth ?? 240;
  const minH = def.minHeight ?? 160;

  const drag = useRef<{ active: boolean } | null>(null);

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

    drag.current = { active: true };
    document.body.classList.add("dragging");
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onResizeStart(e: React.MouseEvent, dir: ResizeDir) {
    e.stopPropagation();
    focusWindow(win.id);

    const start = { mx: e.clientX, my: e.clientY, x: win.x, y: win.y, w: win.width, h: win.height };

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - start.mx;
      const dy = ev.clientY - start.my;
      let { x, y } = start;
      let w = start.w;
      let h = start.h;

      if (dir.includes("e")) w = start.w + dx;
      if (dir.includes("s")) h = start.h + dy;
      if (dir.includes("w")) { w = start.w - dx; x = start.x + dx; }
      if (dir.includes("n")) { h = start.h - dy; y = start.y + dy; }

      if (w < minW) { if (dir.includes("w")) x = start.x + (start.w - minW); w = minW; }
      if (h < minH) { if (dir.includes("n")) y = start.y + (start.h - minH); h = minH; }

      setBounds(win.id, { x, y, width: w, height: h });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.classList.remove("is-resizing");
    }

    document.body.classList.add("is-resizing");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  if (win.isMinimized) return null;

  const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[win.icon] ?? Icons.Square;
  const AppComponent = def.component;

  return (
    <div
      className={cx("window", win.id === focusedId && "window--focused", win.isMaximized && "window--maximized")}
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      }}
      onMouseDown={() => focusWindow(win.id)}
    >
      <div
        className="window__titlebar"
        onMouseDown={onTitleMouseDown}
        onDoubleClick={(e) => {
          if (!(e.target as HTMLElement).closest(".window__btn")) toggleMaximize(win.id);
        }}
      >
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
            onClick={(e) => { e.stopPropagation(); playSound("close"); closeWindow(win.id); }}
          >
            <Icons.X size={14} />
          </button>
        </div>
      </div>
      <div className="window__body">
        <AppComponent windowId={win.id} launchProps={win.launchProps} />
      </div>
      {!win.isMaximized &&
        RESIZE_DIRS.map((dir) => (
          <div
            key={dir}
            className={`window__resize window__resize--${dir}`}
            onMouseDown={(e) => onResizeStart(e, dir)}
          />
        ))}
    </div>
  );
}
