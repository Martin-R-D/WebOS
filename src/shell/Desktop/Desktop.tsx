import { useState, type ReactNode } from "react";
import * as Icons from "lucide-react";
import { useSystemStore } from "../../stores/useSystemStore";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { appRegistry } from "../../apps/registry";
import { launchApp } from "../../lib/launch";
import { openFsNode, isImageFile } from "../../lib/openNode";
import {
  startNodeDrag, startIconDrag, isNodeDrag, isIconDrag,
  getDraggedNodeId, getIconDrag, allowNodeDrop, dropNodeInto,
} from "../../lib/dragDrop";
import { cx, clamp } from "../../lib/helpers";
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

// Icon grid geometry for default (auto-flow) positions
const ICON_W = 88;
const CELL_W = 96;
const CELL_H = 92;
const PAD = 16;

function defaultIconPos(index: number): { x: number; y: number } {
  const usable = window.innerHeight - 64 - PAD * 2; // leave room for the taskbar
  const rows = Math.max(1, Math.floor(usable / CELL_H));
  return {
    x: PAD + Math.floor(index / rows) * CELL_W,
    y: PAD + (index % rows) * CELL_H,
  };
}

function clampIconPos(x: number, y: number): { x: number; y: number } {
  return {
    x: clamp(x, 0, window.innerWidth - ICON_W),
    y: clamp(y, 0, window.innerHeight - 150),
  };
}

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
  const desktopIconPos = useSystemStore((s) => s.desktopIconPos);
  const setDesktopIconPos = useSystemStore((s) => s.setDesktopIconPos);
  const nodes = useFileSystemStore((s) => s.nodes);
  const rootId = useFileSystemStore((s) => s.rootId);
  const getChildren = useFileSystemStore((s) => s.getChildren);
  const renameNode = useFileSystemStore((s) => s.renameNode);
  const deleteNode = useFileSystemStore((s) => s.deleteNode);
  const moveNode = useFileSystemStore((s) => s.moveNode);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [renameTarget, setRenameTarget] = useState<FsNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FsNode | null>(null);
  const [moveTarget, setMoveTarget] = useState<FsNode | null>(null);

  const desktopFolderId = findDesktopFolderId(nodes, rootId);
  const desktopFiles = desktopFolderId ? getChildren(desktopFolderId) : [];

  // Resolve every icon's position: saved position wins, the rest auto-flow
  // down the default column layout.
  const iconPositions: Record<string, { x: number; y: number }> = {};
  {
    let flowIndex = 0;
    const keys = [
      ...APP_SHORTCUTS.map((id) => `app-${id}`),
      ...desktopFiles.map((n) => n.id),
    ];
    for (const key of keys) {
      iconPositions[key] = desktopIconPos[key] ?? defaultIconPos(flowIndex++);
    }
  }

  function handleDesktopClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(".desktop__icon")) return;
    setSelectedId(null);
  }

  // Dropping onto the wallpaper moves the node into the Desktop folder.
  // Drops landing on a window, the taskbar, or the start menu are ignored
  // (those areas handle — or deliberately reject — their own drops).
  function isShellDrop(e: React.DragEvent): boolean {
    return !!(e.target as HTMLElement).closest(".window, .taskbar, .startmenu");
  }

  function handleDesktopDragOver(e: React.DragEvent) {
    if (isShellDrop(e)) return;
    if (isIconDrag(e) || isNodeDrag(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  }

  function handleDesktopDrop(e: React.DragEvent) {
    if (isShellDrop(e)) return;
    e.preventDefault();
    setDragOverId(null);

    // Repositioning an icon that already lives on the desktop
    const icon = getIconDrag(e);
    if (icon) {
      setDesktopIconPos(icon.key, clampIconPos(e.clientX - icon.dx, e.clientY - icon.dy));
      return;
    }

    // A file dragged in from elsewhere (e.g. File Explorer) → move it to the
    // Desktop folder and place its icon right where it was dropped.
    if (desktopFolderId) {
      const nodeId = getDraggedNodeId(e);
      if (dropNodeInto(e, desktopFolderId) && nodeId) {
        setDesktopIconPos(nodeId, clampIconPos(e.clientX - ICON_W / 2, e.clientY - 40));
      }
    }
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
      onDragOver={handleDesktopDragOver}
      onDrop={handleDesktopDrop}
    >
      <div className="desktop__icons">
        {APP_SHORTCUTS.map((appId) => {
          const app = appRegistry[appId];
          const AppIcon = (Icons as unknown as Record<string, Icons.LucideIcon>)[app.icon] ?? Icons.Square;
          const pos = iconPositions[`app-${app.id}`];
          return (
            <button
              key={`app-${app.id}`}
              className={cx("desktop__icon", selectedId === `app-${app.id}` && "desktop__icon--selected")}
              style={{ left: pos.x, top: pos.y }}
              onClick={(e) => { e.stopPropagation(); setSelectedId(`app-${app.id}`); }}
              onDoubleClick={() => launchApp(app.id)}
              onContextMenu={(e) => handleAppContext(e, appId)}
              draggable
              onDragStart={(e) => startIconDrag(e, `app-${app.id}`)}
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
            Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[appDef.icon] ?? Icons.FileText;
            label = node.name.replace(/\.app$/, "");
          } else if (isImageFile(node.name)) {
            Icon = Icons.Image;
          }
          const isFolder = node.type === "folder";
          const pos = iconPositions[node.id];
          return (
            <button
              key={`fs-${node.id}`}
              className={cx(
                "desktop__icon",
                selectedId === `fs-${node.id}` && "desktop__icon--selected",
                dragOverId === node.id && "desktop__icon--dragover",
              )}
              style={{ left: pos.x, top: pos.y }}
              onClick={(e) => { e.stopPropagation(); setSelectedId(`fs-${node.id}`); }}
              onDoubleClick={() => openFsNode(node)}
              onContextMenu={(e) => handleNodeContext(e, node)}
              draggable
              onDragStart={(e) => {
                // icon payload → repositioning on the desktop;
                // node payload → moving the file somewhere else
                startIconDrag(e, node.id);
                if (!isProtectedNode(node, rootId)) startNodeDrag(e, node.id);
              }}
              onDragOver={isFolder ? (e) => { e.stopPropagation(); if (allowNodeDrop(e)) setDragOverId(node.id); } : undefined}
              onDragLeave={isFolder ? () => setDragOverId((cur) => (cur === node.id ? null : cur)) : undefined}
              onDrop={isFolder ? (e) => { e.preventDefault(); e.stopPropagation(); setDragOverId(null); dropNodeInto(e, node.id); } : undefined}
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
