import type { FsNode } from "../types";

export function contentBytes(content = ""): number {
  const image = content.match(
    /^data:image\/[^;,]+;base64,([A-Za-z0-9+/]*={0,2})$/,
  );
  if (image) {
    const payload = image[1];
    return (
      Math.floor((payload.length * 3) / 4) -
      (payload.match(/=*$/)?.[0].length ?? 0)
    );
  }
  return new TextEncoder().encode(content).length;
}

export function filePath(nodes: Record<string, FsNode>, id: string): string {
  const node = nodes[id];
  if (!node) return "";
  const parts: string[] = [];
  const ancestors = new Set<string>();
  let current: FsNode | undefined = node;
  while (current && current.parentId && !ancestors.has(current.id)) {
    ancestors.add(current.id);
    parts.unshift(current.name);
    current = nodes[current.parentId];
  }

  return "/" + parts.join("/");
}

export function fileProperties(nodes: Record<string, FsNode>, id: string) {
  const node = nodes[id];
  if (!node) return null;
  const path = filePath(nodes, id);

  const children = new Map<string, FsNode[]>();
  for (const item of Object.values(nodes)) {
    if (!item.parentId) continue;
    const siblings = children.get(item.parentId) ?? [];
    siblings.push(item);
    children.set(item.parentId, siblings);
  }
  const seen = new Set<string>();
  const queue = [node];
  let bytes = 0;
  let files = 0;
  let folders = 0;
  while (queue.length) {
    const item = queue.pop()!;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (item.type === "file") {
      bytes += contentBytes(item.content);
      if (item.id !== id) files++;
    } else {
      if (item.id !== id) folders++;
      queue.push(...(children.get(item.id) ?? []));
    }
  }
  return { path, bytes, files, folders };
}
