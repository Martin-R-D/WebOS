import { useState, type ReactNode } from "react";
import * as Icons from "lucide-react";
import { useSystemStore } from "../../stores/useSystemStore";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { appRegistry } from "../../apps/registry";
import { launchApp } from "../../lib/launch";
import { openFsNode, isImageFile } from "../../lib/openNode";
import { cx } from "../../lib/helpers";
import { isProtectedNode } from "../../lib/fsGuards";
import { ContextMenu } from "../ContextMenu/ContextMenu";
import { RenameDialog, ConfirmDeleteDialog, MoveDialog } from "../FileDialogs/FileDialogs";
import type { AppId, ContextMenuItem, FsNode } from "../../types";
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

export function Desktop({ children }: { children?: ReactNode }) {
  const wallpaper = useSystemStore((s) => s.wallpaper);
  const pinnedApps = useSystemStore((s) => s.pinnedApps);
  const pinApp = useSystemStore((s) => s.pinApp);
  const unpinApp = useSystemStore((s) => s.unpinApp);
  const nodes = useFileSystemStore((s) => s.nodes);
  const rootId = useFileSystemStore((s) => s.rootId);
  const getChildren = useFileSystemStore((s) => s.getChildren);
  const renameNode = useFileSystemStore((s) => s.renameNode);
  const deleteNode = useFileSystemStore((s) => s.deleteNode);
  const moveNode = useFileSystemStore((s) => s.moveNode);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [renameTarget, setRenameTarget] = useState<FsNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FsNode | null>(null);
  const [moveTarget, setMoveTarget] = useState<FsNode | null>(null);

  const desktopFolderId = findDesktopFolderId(nodes, rootId);
  const desktopFiles = desktopFolderId ? getChildren(desktopFolderId) : [];

  function handleDesktopClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".desktop__icon")) return;
    setSelectedId(null);
  }

  function handleDesktopContext(e: React.MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, items: desktopMenuItems });
  }

  function handleAppContext(e: React.MouseEvent, appId: AppId) {
    e.preventDefault();
    e.stopPropagation();
    const app = appRegistry[appId];
    const isPinned = pinnedApps.includes(appId);
    const items: ContextMenuItem[] = [
      { label: "Open", icon: app.icon, onClick: () => launchApp(appId) },
      isPinned
        ? { label: "Unpin from Taskbar", icon: "PinOff", onClick: () => unpinApp(appId) }
        : { label: "Add to Taskbar", icon: "Pin", onClick: () => pinApp(appId) },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  function handleNodeContext(e: React.MouseEvent, node: FsNode) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(`fs-${node.id}`);

    const items: ContextMenuItem[] = [
      {
        label: "Open",
        icon: node.type === "folder" ? "Folder" : "FileText",
        onClick: () => openFsNode(node),
      },
    ];

    if (!isProtectedNode(node, rootId)) {
      items.push(
        { label: "Rename", icon: "Pencil", onClick: () => setRenameTarget(node) },
        { label: "Move to…", icon: "FolderInput", onClick: () => setMoveTarget(node) },
        { label: "Delete", icon: "Trash2", danger: true, separatorBefore: true, onClick: () => setDeleteTarget(node) },
      );
    }

    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  return (
    <div
      className="desktop"
      style={{ background: wallpaper }}
      onClick={handleDesktopClick}
      onContextMenu={handleDesktopContext}
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
              onContextMenu={(e) => handleAppContext(e, appId)}
            >
              <AppIcon size={30} />
              <span>{app.name}</span>
            </button>
          );
        })}

        {desktopFiles.map((node) => {
          let Icon: Icons.LucideIcon = node.type === "folder" ? Icons.Folder : Icons.FileText;
          let label = node.name;
          if (node.name.endsWith(".app") && node.content && node.content in appRegistry) {
            const appDef = appRegistry[node.content as AppId];
            Icon = (Icons as Record<string, Icons.LucideIcon>)[appDef.icon] ?? Icons.FileText;
            label = node.name.replace(/\.app$/, "");
          } else if (isImageFile(node.name)) {
            Icon = Icons.Image;
          }
          return (
            <button
              key={`fs-${node.id}`}
              className={cx("desktop__icon", selectedId === `fs-${node.id}` && "desktop__icon--selected")}
              onClick={(e) => { e.stopPropagation(); setSelectedId(`fs-${node.id}`); }}
              onDoubleClick={() => openFsNode(node)}
              onContextMenu={(e) => handleNodeContext(e, node)}
            >
              <Icon size={30} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {children}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={() => setMenu(null)}
        />
      )}
      {renameTarget && (
        <RenameDialog
          node={renameTarget}
          onRename={(name) => { renameNode(renameTarget.id, name); setRenameTarget(null); }}
          onCancel={() => setRenameTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteDialog
          node={deleteTarget}
          onConfirm={() => { deleteNode(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {moveTarget && (
        <MoveDialog
          node={moveTarget}
          onMove={(destId) => { moveNode(moveTarget.id, destId); setMoveTarget(null); }}
          onCancel={() => setMoveTarget(null)}
        />
      )}
    </div>
  );
}
