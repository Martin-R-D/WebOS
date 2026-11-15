import type { FsNode } from "../../types";

export type FileSort = "name" | "type" | "modified";

function extension(node: FsNode) {
  const dot = node.name.lastIndexOf(".");
  return dot > 0 ? node.name.slice(dot + 1).toLowerCase() : "";
}

export function sortFiles(
  nodes: FsNode[],
  sort: FileSort,
  descending: boolean,
) {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    const byName = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    const comparison =
      sort === "modified"
        ? a.updatedAt - b.updatedAt
        : sort === "type"
          ? extension(a).localeCompare(extension(b))
          : byName;
    return (
      (comparison || byName || a.id.localeCompare(b.id)) * (descending ? -1 : 1)
    );
  });
}
