import type { ReactNode } from "react";
import { useSystemStore } from "../../stores/useSystemStore";
import "./Desktop.css";

export function Desktop({ children }: { children?: ReactNode }) {
  const wallpaper = useSystemStore((s) => s.wallpaper);

  return (
    <div className="desktop" style={{ background: wallpaper }}>
      <div className="desktop__hint">
        Right-click coming soon · double-click icons coming soon
      </div>
      {children}
    </div>
  );
}
