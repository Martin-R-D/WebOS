import { useEffect, useRef } from "react";
import * as Icons from "lucide-react";
import type { WindowState } from "../../types";
import { useWindowStore } from "../../stores/useWindowStore";
import { getApp } from "../../apps/registry";
import { cx } from "../../lib/helpers";
import { playSound } from "../../lib/sound";
import "./Window.css";
import { useCompact } from "../../lib/useCompact";

const RESIZE_DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
type ResizeDir = (typeof RESIZE_DIRS)[number];

export function Window({ win }: { win: WindowState }) {
  const compact = useCompact();
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  useEffect(() => { if (compact) cleanup.current?.(); }, [compact]);
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


  function onTitlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest(".window__btn")) return;
    if (compact || win.isMaximized || e.button !== 0) return;
    cleanup.current?.();
    focusWindow(win.id);

    e.currentTarget.setPointerCapture?.(e.pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = win.x;
    const origY = win.y;
    const TASKBAR_HEIGHT = 48;
    const SNAP_THRESHOLD = 20;

    // Create preview overlay
    const preview = document.createElement("div");
    preview.style.position = "fixed";
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "999999";
    preview.style.backgroundColor = "rgba(108, 92, 231, 0.2)";
    preview.style.border = "2px solid rgba(108, 92, 231, 0.6)";
    preview.style.display = "none";
    document.body.appendChild(preview);

    function onMouseMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let nextX = origX + dx;
      let nextY = origY + dy;
      const vw = window.innerWidth;
      const vh = window.innerHeight - TASKBAR_HEIGHT;

      // Boundary constraints
      nextX = Math.max(-win.width + 120, Math.min(nextX, vw - 120));
      nextY = Math.max(0, Math.min(nextY, vh - 80));
      moveWindow(win.id, nextX, nextY);

      // Show snap preview based on proximity to edges
      const distToLeft = nextX;
      const distToRight = vw - (nextX + win.width);
      const distToTop = nextY;

      if (distToLeft < SNAP_THRESHOLD) {
        preview.style.display = "block";
        preview.style.left = "0";
        preview.style.top = "0";
        preview.style.width = vw / 2 + "px";
        preview.style.height = vh + "px";
      } else if (distToRight < SNAP_THRESHOLD) {
        preview.style.display = "block";
        preview.style.left = vw / 2 + "px";
        preview.style.top = "0";
        preview.style.width = vw / 2 + "px";
        preview.style.height = vh + "px";
      } else if (distToTop < SNAP_THRESHOLD) {
        preview.style.display = "block";
        preview.style.left = "0";
        preview.style.top = "0";
        preview.style.width = vw + "px";
        preview.style.height = vh + "px";
      } else {
        preview.style.display = "none";
      }
    }

    function onMouseUp(ev: PointerEvent) {
      cleanup.current?.();

      // Snap to edges
      const vw = window.innerWidth;
      const vh = window.innerHeight - TASKBAR_HEIGHT;
      const finalX = origX + (ev.clientX - startX);
      const finalY = origY + (ev.clientY - startY);

      const distToLeft = finalX;
      const distToRight = vw - (finalX + win.width);
      const distToTop = finalY;

      const moved = Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3;

      if (!moved) {
        // plain click, no snapping
      } else if (distToLeft < SNAP_THRESHOLD) {
        setBounds(win.id, { x: 0, y: 0, width: vw / 2, height: vh });
      } else if (distToRight < SNAP_THRESHOLD) {
        setBounds(win.id, { x: vw / 2, y: 0, width: vw / 2, height: vh });
      } else if (distToTop < SNAP_THRESHOLD) {
        toggleMaximize(win.id);
      }


    }

    cleanup.current = () => {
      document.body.classList.remove("dragging");
      window.removeEventListener("pointermove", onMouseMove);
      window.removeEventListener("pointerup", onMouseUp);
      window.removeEventListener("pointercancel", cancel);
      preview.remove();
      cleanup.current = null;
    };
    function cancel() { cleanup.current?.(); }
    window.addEventListener("pointercancel", cancel);
    document.body.classList.add("dragging");
    window.addEventListener("pointermove", onMouseMove);
    window.addEventListener("pointerup", onMouseUp);
  }

  function onResizeStart(e: React.PointerEvent, dir: ResizeDir) {
    if (compact || e.button !== 0) return;
    cleanup.current?.();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
    focusWindow(win.id);

    const start = { mx: e.clientX, my: e.clientY, x: win.x, y: win.y, w: win.width, h: win.height };

    function onMove(ev: PointerEvent) {
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
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.classList.remove("is-resizing");
      cleanup.current = null;
    }

    cleanup.current = onUp;
    window.addEventListener("pointercancel", onUp);
    document.body.classList.add("is-resizing");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const hidden = win.isMinimized || (compact && win.id !== focusedId);
  const windowRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (hidden || win.id !== focusedId) return;
    const element = windowRef.current;
    if (!element || element.contains(document.activeElement)) return;
    const target = lastFocused.current?.isConnected ? lastFocused.current : element;
    target.focus({ preventScroll: true });
  }, [hidden, focusedId, win.id]);

  const AppIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[win.icon] ?? Icons.Square;
  const AppComponent = def.component;

  return (
    <div
      ref={windowRef}
      tabIndex={-1}
      onFocusCapture={(event) => { if (event.target !== event.currentTarget) lastFocused.current = event.target; }}
      hidden={hidden}
      inert={hidden}
      aria-label={win.title}
      className={cx("window", compact && "window--compact", win.id === focusedId && "window--focused", win.isMaximized && "window--maximized")}
      style={
        compact
          ? { zIndex: win.zIndex }
          : win.isMaximized
          ? { left: 0, top: 0, width: "100vw", height: "calc(100dvh - var(--taskbar-height))", zIndex: win.zIndex }
          : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex }
      }
      onPointerDown={() => focusWindow(win.id)}
    >
      <div
        className="window__titlebar"
        onPointerDown={onTitlePointerDown}
        onDoubleClick={(e) => {
          if (!compact && !(e.target as HTMLElement).closest(".window__btn")) toggleMaximize(win.id);
        }}
      >
        <div className="window__title-left">
          <AppIcon size={14} />
          <span className="window__title">{win.title}</span>
        </div>
        <div className="window__controls">
          <button
            aria-label="Minimize window"
            className="window__btn"
            onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
          >
            <Icons.Minus size={14} />
          </button>
          {!compact && <button
            aria-label="Toggle maximize"
            className="window__btn"
            onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}
          >
            <Icons.Square size={12} />
          </button>}
          <button
            aria-label="Close window"
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
      {!compact && !win.isMaximized &&
        RESIZE_DIRS.map((dir) => (
          <div
            key={dir}
            className={`window__resize window__resize--${dir}`}
            onPointerDown={(e) => onResizeStart(e, dir)}
          />
        ))}
    </div>
  );
}
