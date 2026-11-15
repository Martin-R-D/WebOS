import { beforeEach, expect, it } from "vitest";
import { useRecentFilesStore } from "./useRecentFilesStore";
import { useFileSystemStore } from "./useFileSystemStore";
import { resetAllStores } from "../test/resetStores";
import { openFsNode } from "../lib/openNode";
import { useWindowStore } from "./useWindowStore";

beforeEach(resetAllStores);
it("deduplicates, caps at ten, persists and removes deleted descendants", async () => {
  const recent = useRecentFilesStore.getState();
  for (let i = 0; i < 12; i++) recent.record(String(i));
  recent.record("5");
  expect(useRecentFilesStore.getState().entries).toHaveLength(10);
  expect(useRecentFilesStore.getState().entries[0].fileId).toBe("5");
  const saved = localStorage.getItem("webos-recent-files")!;
  recent.clear();
  localStorage.setItem("webos-recent-files", saved);
  await useRecentFilesStore.persist.rehydrate();
  expect(useRecentFilesStore.getState().entries).toHaveLength(10);
  const fs = useFileSystemStore.getState();
  const folder = fs.createNode(fs.rootId, "test", "folder");
  const id = fs.createNode(folder, "a.txt", "file", "hello");
  recent.record(id);
  fs.deleteNode(folder);
  expect(
    useRecentFilesStore.getState().entries.some((entry) => entry.fileId === id),
  ).toBe(false);
  fs.resetFileSystem();
  expect(useRecentFilesStore.getState().entries).toHaveLength(0);
});
it("reuses an editor bound after Save As and tracks reopening", () => {
  const fs = useFileSystemStore.getState();
  const id = fs.createNode(fs.rootId, "saved.txt", "file", "draft");
  const windows = useWindowStore.getState();
  const windowId = windows.openWindow({
    appId: "text-editor",
    title: "Untitled",
    icon: "FileText",
    width: 600,
    height: 400,
  });
  windows.bindFile(windowId, id);
  openFsNode(useFileSystemStore.getState().nodes[id]);
  expect(useWindowStore.getState().windows).toHaveLength(1);
  expect(useRecentFilesStore.getState().entries[0].fileId).toBe(id);
});
