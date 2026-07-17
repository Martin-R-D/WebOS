import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUp, FolderPlus, FilePlus, Folder, FileText } from "lucide-react";
import type { AppProps, ContextMenuItem } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { getApp } from "../registry";
import { ContextMenu } from "../../shell/ContextMenu/ContextMenu";
import { cx } from "../../lib/helpers";
import "./FileExplorer.css";

export function FileExplorer({}: AppProps) {
  const rootId = useFileSystemStore((s) => s.rootId);
  const getChildren = useFileSystemStore((s) => s.getChildren);
  const getNode = useFileSystemStore((s) => s.getNode);
  const getPath = useFileSystemStore((s) => s.getPath);
  const createNode = useFileSystemStore((s) => s.createNode);
  const renameNode = useFileSystemStore((s) => s.renameNode);
  const deleteNode = useFileSystemStore((s) => s.deleteNode);
  const openWindow = useWindowStore((s) => s.openWindow);

  const [history, setHistory] = useState<string[]>([rootId]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

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

  function openFile(nodeId: string) {
    const node = getNode(nodeId);
    if (!node) return;
    const def = getApp("text-editor");
    openWindow({
      appId: "text-editor",
      title: node.name,
      icon: "FileText",
      width: def.defaultWidth,
      height: def.defaultHeight,
      launchProps: { fileId: node.id },
    });
  }

  function handleDoubleClick(nodeId: string) {
    const node = getNode(nodeId);
    if (!node) return;
    if (node.type === "folder") {
      navigateTo(node.id);
    } else {
      openFile(node.id);
    }
  }

  function handleItemContext(e: React.MouseEvent, nodeId: string) {
    e.preventDefault();
    e.stopPropagation();
    const node = getNode(nodeId);
    if (!node) return;

    const items: ContextMenuItem[] = [
      {
        label: "Open",
        icon: node.type === "folder" ? "Folder" : "FileText",
        onClick: () => handleDoubleClick(nodeId),
      },
      {
        label: "Rename",
        icon: "Pencil",
        onClick: () => {
          const name = window.prompt("Rename to:", node.name);
          if (name && name !== node.name) renameNode(nodeId, name);
        },
      },
      {
        label: "Delete",
        icon: "Trash2",
        danger: true,
        separatorBefore: true,
        onClick: () => {
          if (window.confirm(`Delete "${node.name}"?`)) deleteNode(nodeId);
        },
      },
    ];
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
          {children.map((node) => (
            <button
              key={node.id}
              className="fx__item"
              onDoubleClick={() => handleDoubleClick(node.id)}
              onContextMenu={(e) => handleItemContext(e, node.id)}
            >
              {node.type === "folder" ? <Folder size={28} /> : <FileText size={28} />}
              <span>{node.name}</span>
            </button>
          ))}
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
