import type { FsNode } from "../types";

// Seed folders that back core OS features — protected from rename/move/delete.
const SYSTEM_FOLDERS = ["Desktop", "Documents", "Pictures"];

export function isProtectedNode(node: FsNode | undefined, rootId: string): boolean {
  if (!node) return true;
  if (node.id === rootId) return true;
  if (
    node.parentId === rootId &&
    node.type === "folder" &&
    SYSTEM_FOLDERS.includes(node.name)
  ) {
    return true;
  }
  return false;
}

// True if `maybeDescendantId` is inside the subtree rooted at `ancestorId`
// (including the ancestor itself). Used to stop moving a folder into itself.
export function isSelfOrDescendant(
  nodes: Record<string, FsNode>,
  ancestorId: string,
  maybeDescendantId: string,
): boolean {
  let current: FsNode | undefined = nodes[maybeDescendantId];
  while (current) {
    if (current.id === ancestorId) return true;
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return false;
}
