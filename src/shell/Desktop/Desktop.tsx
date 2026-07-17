import { useState, type ReactNode } from "react";
import * as Icons from "lucide-react";
import { useSystemStore } from "../../stores/useSystemStore";
import { appRegistry } from "../../apps/registry";
import { launchApp } from "../../lib/launch";
import { cx } from "../../lib/helpers";
import { ContextMenu } from "../ContextMenu/ContextMenu";
import type { AppId, ContextMenuItem } from "../../types";
import "./Desktop.css";

const SHORTCUTS: AppId[] = ["about-me", "file-explorer", "terminal", "browser", "settings"];

const desktopMenuItems: ContextMenuItem[] = [
  { label: "Change Wallpaper", icon: "Image", onClick: () => launchApp("settings") },
  { label: "Open Terminal", icon: "TerminalSquare", onClick: () => launchApp("terminal") },
  { label: "Refresh", icon: "RefreshCw", separatorBefore: true, onClick: () => location.reload() },
];

export function Desktop({ children }: { children?: ReactNode }) {
  const wallpaper = useSystemStore((s) => s.wallpaper);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  function handleDesktopClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".desktop__icon")) return;
    setSelectedId(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  return (
    <div
      className="desktop"
      style={{ background: wallpaper }}
      onClick={handleDesktopClick}
      onContextMenu={handleContextMenu}
    >
      <div className="desktop__icons">
        {SHORTCUTS.map((appId) => {
          const app = appRegistry[appId];
          const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[app.icon] ?? Icons.Square;
          return (
            <button
              key={app.id}
              className={cx("desktop__icon", selectedId === app.id && "desktop__icon--selected")}
              onClick={(e) => { e.stopPropagation(); setSelectedId(app.id); }}
              onDoubleClick={() => launchApp(app.id)}
            >
              <AppIcon size={30} />
              <span>{app.name}</span>
            </button>
          );
        })}
      </div>
      {children}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={desktopMenuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
