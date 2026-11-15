import { expect, it } from "vitest";
import type { FsNode } from "../../types";
import { sortFiles } from "./sortFiles";
import { useExplorerSettingsStore } from "../../stores/useExplorerSettingsStore";

const nodes: FsNode[] = [
  {
    id: "1",
    name: "b.txt",
    type: "file",
    parentId: null,
    createdAt: 0,
    updatedAt: 2,
  },
  {
    id: "2",
    name: "z",
    type: "folder",
    parentId: null,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "3",
    name: "a.png",
    type: "file",
    parentId: null,
    createdAt: 0,
    updatedAt: 3,
  },
];
it("keeps folders first, supports all sort keys and does not mutate inputs", () => {
  expect(sortFiles(nodes, "name", false).map((node) => node.name)).toEqual([
    "z",
    "a.png",
    "b.txt",
  ]);
  expect(sortFiles(nodes, "name", true).map((node) => node.name)).toEqual([
    "z",
    "b.txt",
    "a.png",
  ]);
  expect(sortFiles(nodes, "type", false).map((node) => node.name)).toEqual([
    "z",
    "a.png",
    "b.txt",
  ]);
  expect(sortFiles(nodes, "modified", true).map((node) => node.name)).toEqual([
    "z",
    "a.png",
    "b.txt",
  ]);
  expect(nodes[0].id).toBe("1");
});
it("persists sorting preferences", async () => {
  useExplorerSettingsStore.getState().setSort("modified");
  useExplorerSettingsStore.getState().toggleDirection();
  const saved = localStorage.getItem("webos-explorer-settings")!;
  useExplorerSettingsStore.setState({ sort: "name", descending: false });
  localStorage.setItem("webos-explorer-settings", saved);
  await useExplorerSettingsStore.persist.rehydrate();
  expect(useExplorerSettingsStore.getState()).toMatchObject({
    sort: "modified",
    descending: true,
  });
});
