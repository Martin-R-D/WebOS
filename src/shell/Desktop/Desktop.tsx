import { useState, type ReactNode } from "react";
import * as Icons from "lucide-react";
import { useSystemStore } from "../../stores/useSystemStore";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { appRegistry } from "../../apps/registry";
import { launchApp } from "../../lib/launch";
import { cx } from "../../lib/helpers";
import { ContextMenu } from "../ContextMenu/ContextMenu";
import type { AppId, ContextMenuItem, FsNode } from "../../types";
import { useWindowStore } from "../../stores/useWindowStore";
import "./Desktop.css";

const APP_SHORTCUTS: AppId[] = ["about-me", "file-explorer", "terminal", "browser", "settings"];

const desktopMenuItems: ContextMenuItem[] = [
  { label: "Change Wallpaper", icon: "Image", onClick: () => launchApp("settings") },
  { label: "Open Terminal", icon: "TerminalSquare", onClick: () => launchApp("terminal") },
  { label: "Refresh", icon: "RefreshCw", separatorBefore: true, onClick: () => location.reload() },
];

function findDesktopFolderId(nodes: Record<string, FsNode>, rootId: string): string | null {
  for (const node of Object.values(nodes)) {
    if (node.parentId === rootId && node.type === "folder" && node.name === "Desktop") {
      return node.id;
    }
  }
  return null;
}

function openFileNode(node: FsNode) {
  if (node.type === "folder") {
    const { windows, openWindow, focusWindow } = useWindowStore.getState();
    const existing = windows.find((w) => w.appId === "file-explorer" && w.launchProps?.folderId === node.id);
    if (existing) {
      focusWindow(existing.id);
      return;
    }
    openWindow({
      appId: "file-explorer",
      title: node.name,
      icon: "Folder",
      width: 720,
      height: 480,
      launchProps: { folderId: node.id },
    });
  } else {
    const { windows, openWindow, focusWindow } = useWindowStore.getState();
    const existing = windows.find((w) => w.appId === "text-editor" && w.launchProps?.fileId === node.id);
    if (existing) {
      focusWindow(existing.id);
      return;
    }
    openWindow({
      appId: "text-editor",
      title: node.name,
      icon: "FileText",
      width: 640,
      height: 460,
      launchProps: { fileId: node.id },
    });
  }
}

export function Desktop({ children }: { children?: ReactNode }) {
  const wallpaper = useSystemStore((s) => s.wallpaper);
  const nodes = useFileSystemStore((s) => s.nodes);
  const rootId = useFileSystemStore((s) => s.rootId);
  const getChildren = useFileSystemStore((s) => s.getChildren);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const desktopFolderId = findDesktopFolderId(nodes, rootId);
  const desktopFiles = desktopFolderId ? getChildren(desktopFolderId) : [];

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
        {APP_SHORTCUTS.map((appId) => {
          const app = appRegistry[appId];
          const AppIcon = (Icons as Record<string, Icons.LucideIcon>)[app.icon] ?? Icons.Square;
          return (
            <button
              key={`app-${app.id}`}
              className={cx("desktop__icon", selectedId === `app-${app.id}` && "desktop__icon--selected")}
              onClick={(e) => { e.stopPropagation(); setSelectedId(`app-${app.id}`); }}
              onDoubleClick={() => launchApp(app.id)}
            >
              <AppIcon size={30} />
              <span>{app.name}</span>
            </button>
          );
        })}

        {desktopFiles.map((node) => {
          const Icon = node.type === "folder" ? Icons.Folder : Icons.FileText;
          return (
            <button
              key={`fs-${node.id}`}
              className={cx("desktop__icon", selectedId === `fs-${node.id}` && "desktop__icon--selected")}
              onClick={(e) => { e.stopPropagation(); setSelectedId(`fs-${node.id}`); }}
              onDoubleClick={() => openFileNode(node)}
            >
              <Icon size={30} />
              <span>{node.name}</span>
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
