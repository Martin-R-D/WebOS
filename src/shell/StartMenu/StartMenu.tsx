import * as Icons from "lucide-react";
import { appRegistry } from "../../apps/registry";
import { useSystemStore } from "../../stores/useSystemStore";
import { launchApp } from "../../lib/launch";
import "./StartMenu.css";

interface StartMenuProps {
  open: boolean;
  onClose: () => void;
}

export function StartMenu({ open, onClose }: StartMenuProps) {
  const username = useSystemStore((s) => s.username);

  if (!open) return null;

  function handleLaunch(appId: string) {
    launchApp(appId as keyof typeof appRegistry);
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
                onClick={() => handleLaunch(app.id)}
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
