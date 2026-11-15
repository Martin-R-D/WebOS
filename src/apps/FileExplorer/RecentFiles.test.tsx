import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useRecentFilesStore } from "../../stores/useRecentFilesStore";
import { resetAllStores } from "../../test/resetStores";
import { RecentFiles } from "./RecentFiles";

beforeEach(resetAllStores);
it("resolves live names and locations, prunes missing entries and keeps files when history clears", () => {
  const fs = useFileSystemStore.getState();
  const id = fs.createNode(fs.rootId, "first.txt", "file", "hello");
  useRecentFilesStore.getState().record("missing");
  useRecentFilesStore.getState().record(id);
  render(<RecentFiles />);
  expect(useRecentFilesStore.getState().entries).toHaveLength(1);
  act(() => fs.renameNode(id, "renamed.txt"));
  const docs = Object.values(fs.nodes).find(
    (node) => node.name === "Documents",
  )!;
  act(() => fs.moveNode(id, docs.id));
  expect(screen.getByText("/Documents/renamed.txt")).toBeInTheDocument();
  act(() => useRecentFilesStore.getState().clear());
  expect(useFileSystemStore.getState().nodes[id].content).toBe("hello");
});
