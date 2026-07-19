import { useFileSystemStore } from "../stores/useFileSystemStore";
import { isProtectedNode, isSelfOrDescendant, isSystemAppsFolder } from "./fsGuards";
import { playSound } from "./sound";

// Custom MIME types so we only react to our own drags (not text selections, images, etc.)
const NODE_MIME = "application/x-webos-node";
// Desktop icon reposition drags carry the icon key + where inside the icon it was grabbed.
const ICON_MIME = "application/x-webos-icon";

export function startNodeDrag(e: React.DragEvent, nodeId: string) {
  e.dataTransfer.setData(NODE_MIME, nodeId);
  e.dataTransfer.effectAllowed = "move";
}

/** Mark a desktop icon drag so dropping on the wallpaper repositions it. */
export function startIconDrag(e: React.DragEvent, iconKey: string) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  e.dataTransfer.setData(
    ICON_MIME,
    JSON.stringify({ key: iconKey, dx: e.clientX - rect.left, dy: e.clientY - rect.top }),
  );
  e.dataTransfer.effectAllowed = "move";
}

// True while something we recognise is being dragged (payload itself is
// only readable on drop, but the type list is readable during dragover).
export function isNodeDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(NODE_MIME);
}

export function isIconDrag(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(ICON_MIME);
}

export function getDraggedNodeId(e: React.DragEvent): string {
  return e.dataTransfer.getData(NODE_MIME);
}

export function getIconDrag(e: React.DragEvent): { key: string; dx: number; dy: number } | null {
  const raw = e.dataTransfer.getData(ICON_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Call from dragover on a valid target to allow the drop + show the move cursor.
export function allowNodeDrop(e: React.DragEvent) {
  if (!isNodeDrag(e)) return false;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  return true;
}

/** Move the dragged node into `targetFolderId`. Returns true if the move happened. */
export function dropNodeInto(e: React.DragEvent, targetFolderId: string): boolean {
  const nodeId = getDraggedNodeId(e);
  if (!nodeId) return false;

  const { nodes, rootId, getNode, moveNode } = useFileSystemStore.getState();
  const node = getNode(nodeId);
  const target = getNode(targetFolderId);
  if (!node || !target || target.type !== "folder") return false;
  if (node.parentId === targetFolderId) return false; // already there — no-op

  const parent = node.parentId ? getNode(node.parentId) : undefined;
  if (
    isProtectedNode(node, rootId) ||
    isSystemAppsFolder(target, rootId) || // System Apps: nothing goes in…
    isSystemAppsFolder(parent, rootId) || // …and nothing comes out
    isSelfOrDescendant(nodes, nodeId, targetFolderId) ||
    Object.values(nodes).some(
      (n) => n.parentId === targetFolderId && n.name === node.name && n.id !== nodeId,
    )
  ) {
    playSound("error");
    return false;
  }

  moveNode(nodeId, targetFolderId);
  playSound("click");
  return true;
}
