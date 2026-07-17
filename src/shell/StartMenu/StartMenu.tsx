import * as Icons from "lucide-react";
import { appRegistry } from "../../apps/registry";
import { useWindowStore } from "../../stores/useWindowStore";
import { useSystemStore } from "../../stores/useSystemStore";
import "./StartMenu.css";

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
}

export function StartMenu({ open, onClose }: StartMenuProps) {
  const openWindow = useWindowStore((s) => s.openWindow);
  const windows = useWindowStore((s) => s.windows);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const username = useSystemStore((s) => s.username);

  if (!open) return null;

  function launchApp(appId: string) {
    const app = appRegistry[appId as keyof typeof appRegistry];
    if (!app) return;

    if (app.singleInstance) {
      const existing = windows.find((w) => w.appId === app.id);
      if (existing) {
        focusWindow(existing.id);
        onClose();
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
    onClose();
  }

  function handleLock() {
    useSystemStore.getState().setLocked(true);
    onClose();
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
                onClick={() => launchApp(app.id)}
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
    </div>
  );
}
