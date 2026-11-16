import type { FsNode } from "../../types";
import type { OfficeKind } from "./documents";
import { officeKind } from "./documents";

export function officeFiles(
  nodes: Record<string, FsNode>,
  entries: { fileId: string; accessedAt: number }[],
  kind: OfficeKind | "all",
  query: string,
  recent: boolean,
): FsNode[] {
  const accessed = new Map(
    entries.map((entry) => [entry.fileId, entry.accessedAt]),
  );
  return Object.values(nodes)
    .filter(
      (node) =>
        node.type === "file" &&
        officeKind(node.name) &&
        (kind === "all" || officeKind(node.name) === kind) &&
        node.name.toLowerCase().includes(query.trim().toLowerCase()) &&
        (!recent || accessed.has(node.id)),
    )
    .sort((a, b) =>
      recent
        ? accessed.get(b.id)! - accessed.get(a.id)!
        : b.updatedAt - a.updatedAt || a.name.localeCompare(b.name),
    );
}
