import { useState } from "react";
import * as Icons from "lucide-react";
import { appRegistry } from "../../apps/registry";
import { useSystemStore } from "../../stores/useSystemStore";
import { launchApp } from "../../lib/launch";
import { ContextMenu } from "../ContextMenu/ContextMenu";
import type { AppId, ContextMenuItem } from "../../types";
import "./StartMenu.css";

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
}

export function StartMenu({ open, onClose }: StartMenuProps) {
  const username = useSystemStore((s) => s.username);
  const pinnedApps = useSystemStore((s) => s.pinnedApps);
  const pinApp = useSystemStore((s) => s.pinApp);
  const unpinApp = useSystemStore((s) => s.unpinApp);

  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  if (!open) return null;

  function handleLaunch(appId: string) {
    launchApp(appId as AppId);
    onClose();
  }

  function handleLock() {
    useSystemStore.getState().setLocked(true);
    onClose();
  }

  function handleAppContext(e: React.MouseEvent, appId: AppId) {
    e.preventDefault();
    e.stopPropagation();
    const app = appRegistry[appId];
    const isPinned = pinnedApps.includes(appId);
    const items: ContextMenuItem[] = [
      { label: "Open", icon: app.icon, onClick: () => { launchApp(appId); onClose(); } },
      isPinned
        ? { label: "Unpin from Taskbar", icon: "PinOff", onClick: () => unpinApp(appId) }
        : { label: "Add to Taskbar", icon: "Pin", onClick: () => pinApp(appId) },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  return (
    <div className="startmenu-overlay" onClick={onClose}>
      <div className="startmenu" onClick={(e) => e.stopPropagation()}>
        <div className="startmenu__header">
          <div className="startmenu__avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{username}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-dim)" }}>Welcome back</div>
          </div>
        </div>

        <div className="startmenu__grid">
          {Object.values(appRegistry).map((app) => {
            const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[app.icon] ?? Icons.Square;
            return (
              <button
                key={app.id}
                className="startmenu__app"
                onClick={() => handleLaunch(app.id)}
                onContextMenu={(e) => handleAppContext(e, app.id)}
              >
                <AppIcon size={26} />
                {app.name}
              </button>
            );
          })}
        </div>

        <div className="startmenu__footer">
          <button className="startmenu__app" onClick={handleLock}>
            <Icons.Power size={18} />
            Lock
          </button>
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
