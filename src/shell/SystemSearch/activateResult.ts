import { appRegistry } from "../../apps/registry";
import type { AppId } from "../../types";
import { launchApp } from "../../lib/launch";
import { openFsNode } from "../../lib/openNode";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useNotesStore } from "../../stores/useNotesStore";
import { useTodoStore } from "../../stores/useTodoStore";
import { useWindowStore } from "../../stores/useWindowStore";
import type { SearchResult } from "./searchIndex";

export function activateResult(result: SearchResult): void {
  if (result.category === "apps") {
    if (!(result.targetId in appRegistry))
      throw new Error("This app is unavailable.");
    launchApp(result.targetId as AppId);
    return;
  }
  if (result.category === "files") {
    const node = useFileSystemStore.getState().nodes[result.targetId];
    if (!node) throw new Error("This file was deleted.");
    openFsNode(node);
    return;
  }
  const isNote = result.category === "notes";
  const exists = isNote
    ? useNotesStore.getState().notes.some((note) => note.id === result.targetId)
    : useTodoStore.getState().tasks.some((task) => task.id === result.targetId);
  if (!exists)
    throw new Error(
      isNote ? "This note was deleted." : "This task was deleted.",
    );
  const appId = isNote ? "sticky-notes" : "todo-list";
  const launchProps = {
    [isNote ? "noteId" : "taskId"]: result.targetId,
    navigationToken: crypto.randomUUID(),
  };
  const store = useWindowStore.getState();
  const existing = store.windows
    .filter((window) => window.appId === appId)
    .sort((a, b) => b.zIndex - a.zIndex)[0];
  if (existing) {
    store.setLaunchProps(existing.id, launchProps);
    store.focusWindow(existing.id);
    return;
  }
  const app = appRegistry[appId];
  store.openWindow({
    appId,
    title: app.name,
    icon: app.icon,
    width: app.defaultWidth,
    height: app.defaultHeight,
    launchProps,
  });
}
