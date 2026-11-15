import { beforeEach, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PropertiesDialog } from "./PropertiesDialog";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { resetAllStores } from "../../test/resetStores";

beforeEach(resetAllStores);
it("reflects rename, move, saved content and deletion while open", () => {
  const store = useFileSystemStore.getState();
  const id = store.createNode(store.rootId, "draft.txt", "file", "old");
  render(<PropertiesDialog nodeId={id} onClose={vi.fn()} />);
  expect(screen.getByText("/draft.txt")).toBeInTheDocument();
  act(() => store.renameNode(id, "new.txt"));
  act(() => store.updateContent(id, "€€"));
  expect(screen.getByText("6 bytes")).toBeInTheDocument();
  const documents = Object.values(store.nodes).find(
    (node) => node.name === "Documents",
  )!;
  act(() => store.moveNode(id, documents.id));
  expect(screen.getByText("/Documents/new.txt")).toBeInTheDocument();
  act(() => store.deleteNode(id));
  expect(
    screen.getByText("This item is no longer available."),
  ).toBeInTheDocument();
});
