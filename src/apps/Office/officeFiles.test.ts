import { beforeEach, expect, it } from "vitest";
import { officeFiles } from "./officeFiles";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { filePath } from "../../lib/fileProperties";

beforeEach(() => useFileSystemStore.getState().resetFileSystem());

it("lists native documents and preserves recent ordering while reflecting renames and deletion", () => {
  const fs = useFileSystemStore.getState();
  const writer = fs.createNode(fs.rootId, "Report.wdoc", "file", "");
  const sheets = fs.createNode(fs.rootId, "Budget.wsheet", "file", "");
  fs.createNode(fs.rootId, "plain.txt", "file", "");
  const entries = [
    { fileId: writer, accessedAt: 20 },
    { fileId: sheets, accessedAt: 10 },
  ];
  expect(
    officeFiles(
      useFileSystemStore.getState().nodes,
      entries,
      "all",
      "",
      true,
    ).map((node) => node.id),
  ).toEqual([writer, sheets]);
  expect(
    officeFiles(
      useFileSystemStore.getState().nodes,
      entries,
      "sheets",
      "BUD",
      false,
    ).map((node) => node.id),
  ).toEqual([sheets]);
  fs.renameNode(writer, "Renamed.wdoc");
  expect(
    officeFiles(
      useFileSystemStore.getState().nodes,
      entries,
      "writer",
      "renamed",
      true,
    ),
  ).toHaveLength(1);
  fs.deleteNode(writer);
  expect(
    officeFiles(useFileSystemStore.getState().nodes, entries, "all", "", true),
  ).toHaveLength(1);
});

it("handles missing and cyclic paths without hanging", () => {
  expect(filePath({}, "missing")).toBe("");
  const fs = useFileSystemStore.getState();
  const a = fs.createNode(fs.rootId, "A", "folder");
  const b = fs.createNode(a, "B", "folder");
  fs.moveNode(a, b);
  expect(filePath(useFileSystemStore.getState().nodes, b)).toContain("B");
});
