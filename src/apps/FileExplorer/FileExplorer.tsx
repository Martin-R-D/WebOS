import { useState } from "react";
import * as Icons from "lucide-react";
import { ChevronLeft, ChevronRight, ArrowUp, FolderPlus, FilePlus, Folder, FileText } from "lucide-react";
import type { AppProps, AppId, ContextMenuItem, FsNode } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useSystemStore } from "../../stores/useSystemStore";
import { appRegistry } from "../registry";
import { launchApp } from "../../lib/launch";
import { openFsNode, isImageFile } from "../../lib/openNode";
import { ContextMenu } from "../../shell/ContextMenu/ContextMenu";
import { RenameDialog, ConfirmDeleteDialog, MoveDialog } from "../../shell/FileDialogs/FileDialogs";
import { isProtectedNode } from "../../lib/fsGuards";
import { cx } from "../../lib/helpers";
import "./FileExplorer.css";

function findDesktopFolderId(nodes: Record<string, import("../../types").FsNode>, rootId: string): string | null {
  for (const node of Object.values(nodes)) {
    if (node.parentId === rootId && node.type === "folder" && node.name === "Desktop") {
      return node.id;
    }
  }
  return null;
}

export function FileExplorer({}: AppProps) {
  const rootId = useFileSystemStore((s) => s.rootId);
  const nodes = useFileSystemStore((s) => s.nodes);
  const getChildren = useFileSystemStore((s) => s.getChildren);
  const getNode = useFileSystemStore((s) => s.getNode);
  const getPath = useFileSystemStore((s) => s.getPath);
  const createNode = useFileSystemStore((s) => s.createNode);
  const renameNode = useFileSystemStore((s) => s.renameNode);
  const deleteNode = useFileSystemStore((s) => s.deleteNode);
  const moveNode = useFileSystemStore((s) => s.moveNode);

  const [history, setHistory] = useState<string[]>([rootId]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [renameTarget, setRenameTarget] = useState<FsNode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FsNode | null>(null);
  const [moveTarget, setMoveTarget] = useState<FsNode | null>(null);

  const currentFolderId = history[historyIndex];
  const children = getChildren(currentFolderId);
  const currentPath = getPath(currentFolderId);
  const currentNode = getNode(currentFolderId);

  const topFolders = getChildren(rootId).filter((n) => n.type === "folder");

  function navigateTo(folderId: string) {
    const next = history.slice(0, historyIndex + 1);
    next.push(folderId);
    setHistory(next);
    setHistoryIndex(next.length - 1);
  }

  function goBack() {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  }

  function goForward() {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  }

  function goUp() {
    if (currentNode && currentNode.parentId) navigateTo(currentNode.parentId);
  }

  function handleDoubleClick(nodeId: string) {
    const node = getNode(nodeId);
    if (!node) return;
    if (node.type === "folder") {
      navigateTo(node.id);
    } else {
      openFsNode(node);
    }
  }

  function handleItemContext(e: React.MouseEvent, nodeId: string) {
    e.preventDefault();
    e.stopPropagation();
    const node = getNode(nodeId);
    if (!node) return;

    // .app files get app-specific context menu
    if (node.name.endsWith(".app") && node.content && node.content in appRegistry) {
      const appId = node.content as AppId;
      const app = appRegistry[appId];
      const { pinnedApps, pinApp, unpinApp } = useSystemStore.getState();
      const isPinned = pinnedApps.includes(appId);
      const items: ContextMenuItem[] = [
        { label: "Open", icon: app.icon, onClick: () => launchApp(appId) },
        isPinned
          ? { label: "Unpin from Taskbar", icon: "PinOff", onClick: () => unpinApp(appId) }
          : { label: "Add to Taskbar", icon: "Pin", onClick: () => pinApp(appId) },
      ];
      setMenu({ x: e.clientX, y: e.clientY, items });
      return;
    }

    const items: ContextMenuItem[] = [
      {
        label: "Open",
        icon: node.type === "folder" ? "Folder" : "FileText",
        onClick: () => handleDoubleClick(nodeId),
      },
    ];

    if (!isProtectedNode(node, rootId)) {
      items.push(
        { label: "Rename", icon: "Pencil", onClick: () => setRenameTarget(node) },
        { label: "Move to…", icon: "FolderInput", onClick: () => setMoveTarget(node) },
      );

      const desktopId = findDesktopFolderId(nodes, rootId);
      if (desktopId && node.parentId !== desktopId) {
        items.push({
          label: "Move to Desktop",
          icon: "MonitorDown",
          onClick: () => moveNode(node.id, desktopId),
        });
      }

      items.push(
        { label: "Delete", icon: "Trash2", danger: true, separatorBefore: true, onClick: () => setDeleteTarget(node) },
      );
    }

    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  function handleEmptyContext(e: React.MouseEvent) {
    e.preventDefault();
    const items: ContextMenuItem[] = [
      {
        label: "New Folder",
        icon: "FolderPlus",
        onClick: () => createNode(currentFolderId, "New Folder", "folder"),
      },
      {
        label: "New File",
        icon: "FilePlus",
        onClick: () => createNode(currentFolderId, "untitled.txt", "file", ""),
      },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  return (
    <div className="fx">
      <div className="fx__toolbar">
        <button className="fx__btn" disabled={historyIndex <= 0} onClick={goBack}>
          <ChevronLeft size={16} />
        </button>
        <button className="fx__btn" disabled={historyIndex >= history.length - 1} onClick={goForward}>
          <ChevronRight size={16} />
        </button>
        <button className="fx__btn" disabled={!currentNode?.parentId} onClick={goUp}>
          <ArrowUp size={16} />
        </button>
        <div className="fx__path">{currentPath}</div>
        <button className="fx__btn" onClick={() => createNode(currentFolderId, "New Folder", "folder")}>
          <FolderPlus size={16} />
        </button>
        <button className="fx__btn" onClick={() => createNode(currentFolderId, "untitled.txt", "file", "")}>
          <FilePlus size={16} />
        </button>
      </div>

      <div className="fx__body">
        <div className="fx__sidebar">
          <button
            className={cx("fx__side-item", currentFolderId === rootId && "fx__side-item--active")}
            onClick={() => navigateTo(rootId)}
          >
            <Folder size={14} /> Root
          </button>
          {topFolders.map((f) => (
            <button
              key={f.id}
              className={cx("fx__side-item", currentFolderId === f.id && "fx__side-item--active")}
              onClick={() => navigateTo(f.id)}
            >
              <Folder size={14} /> {f.name}
            </button>
          ))}
        </div>

        <div className="fx__grid" onContextMenu={handleEmptyContext}>
          {children.length === 0 && (
            <div className="fx__empty">This folder is empty</div>
          )}
          {children.map((node) => {
            let NodeIcon: Icons.LucideIcon = node.type === "folder" ? Folder : FileText;
            let displayName = node.name;

            if (node.name.endsWith(".app") && node.content && node.content in appRegistry) {
              const appDef = appRegistry[node.content as AppId];
              NodeIcon = (Icons as Record<string, Icons.LucideIcon>)[appDef.icon] ?? FileText;
              displayName = node.name.replace(/\.app$/, "");
            } else if (isImageFile(node.name)) {
              NodeIcon = Icons.Image;
            }

            return (
              <button
                key={node.id}
                className="fx__item"
                onDoubleClick={() => handleDoubleClick(node.id)}
                onContextMenu={(e) => handleItemContext(e, node.id)}
              >
                <NodeIcon size={28} />
                <span>{displayName}</span>
              </button>
            );
          })}
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
