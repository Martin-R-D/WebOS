import type { AppId, FsNode } from "../../types";
import { filePath } from "../../lib/fileProperties";

export type SearchCategory = "apps" | "files" | "notes" | "tasks";
export interface SearchResult {
  id: string;
  category: SearchCategory;
  targetId: string;
  title: string;
  detail: string;
  score: number;
}
interface Sources {
  apps: { id: AppId; name: string }[];
  nodes: Record<string, FsNode>;
  notes: { id: string; text: string; pinned: boolean }[];
  tasks: { id: string; title: string; completed: boolean }[];
}

function score(text: string, query: string): number {
  const value = text.toLowerCase();
  return value === query
    ? 0
    : value.startsWith(query)
      ? 1
      : value.includes(query)
        ? 2
        : -1;
}

export function searchIndex(query: string, sources: Sources): SearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const results: SearchResult[] = [];
  function add(
    category: SearchCategory,
    targetId: string,
    title: string,
    detail: string,
    rank: number,
  ) {
    if (rank >= 0)
      results.push({
        id: `${category}:${targetId}`,
        category,
        targetId,
        title,
        detail,
        score: rank,
      });
  }
  sources.apps.forEach((app) =>
    add("apps", app.id, app.name, "Application", score(app.name, normalized)),
  );
  Object.values(sources.nodes).forEach((node) => {
    const rank = score(node.name, normalized);
    if (node.parentId && rank >= 0)
      add(
        "files",
        node.id,
        node.name,
        `${node.type === "folder" ? "Folder" : "File"} · ${filePath(sources.nodes, node.id)}`,
        rank,
      );
  });
  sources.notes.forEach((note) => {
    const rank = score(note.text, normalized);
    if (rank < 0) return;
    const index = note.text.toLowerCase().indexOf(normalized);
    const excerpt = note.text
      .slice(Math.max(0, index - 40), index + normalized.length + 100)
      .replace(/\s+/g, " ");
    add(
      "notes",
      note.id,
      note.text.split(/\r?\n/)[0].slice(0, 80) || "Sticky note",
      `${note.pinned ? "Pinned note · " : ""}${excerpt}`,
      rank,
    );
  });
  sources.tasks.forEach((task) =>
    add(
      "tasks",
      task.id,
      task.title,
      task.completed ? "Completed task" : "Active task",
      score(task.title, normalized),
    ),
  );
  return results.sort(
    (a, b) =>
      a.score - b.score ||
      a.title.localeCompare(b.title, undefined, {
        sensitivity: "base",
        numeric: true,
      }) ||
      a.id.localeCompare(b.id),
  );
}
