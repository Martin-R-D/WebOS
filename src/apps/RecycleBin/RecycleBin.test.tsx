import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RecycleBin } from "./RecycleBin";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { resetAllStores } from "../../test/resetStores";

function renderApp() {
  return render(<RecycleBin windowId="test-window" />);
}

describe("RecycleBin app", () => {
  beforeEach(resetAllStores);

  it("shows empty state when no deleted nodes", () => {
    renderApp();
    expect(screen.getByText("Recycle Bin is empty")).toBeTruthy();
  });

  it("Empty Recycle Bin button is disabled when empty", () => {
    renderApp();
    const btn = screen.getByRole("button", { name: /empty recycle bin/i });
    expect(btn).toBeDisabled();
  });

  it("lists deleted items when deletedNodes has items", () => {
    const fs = useFileSystemStore.getState();
    const desktopId = Object.values(fs.nodes).find(
      (n) => n.name === "Desktop" && n.parentId === fs.rootId,
    )!.id;
    fs.createNode(desktopId, "test.txt", "file", "hello");
    const fileId = Object.values(useFileSystemStore.getState().nodes).find(
      (n) => n.name === "test.txt",
    )!.id;
    useFileSystemStore.getState().deleteNode(fileId);

    renderApp();
    expect(screen.getByText("test.txt")).toBeTruthy();
  });

  it("Restore button calls restoreNode", () => {
    const fs = useFileSystemStore.getState();
    const desktopId = Object.values(fs.nodes).find(
      (n) => n.name === "Desktop" && n.parentId === fs.rootId,
    )!.id;
    fs.createNode(desktopId, "restore-me.txt", "file", "");
    const fileId = Object.values(useFileSystemStore.getState().nodes).find(
      (n) => n.name === "restore-me.txt",
    )!.id;
    useFileSystemStore.getState().deleteNode(fileId);

    const spy = vi.spyOn(useFileSystemStore.getState(), "restoreNode");
    renderApp();
    const restoreBtn = screen.getByTitle("Restore");
    fireEvent.click(restoreBtn);
    expect(spy).toHaveBeenCalledWith(fileId);
  });

  it("Delete Permanently button calls permanentlyDelete", () => {
    const fs = useFileSystemStore.getState();
    const desktopId = Object.values(fs.nodes).find(
      (n) => n.name === "Desktop" && n.parentId === fs.rootId,
    )!.id;
    fs.createNode(desktopId, "perm.txt", "file", "");
    const fileId = Object.values(useFileSystemStore.getState().nodes).find(
      (n) => n.name === "perm.txt",
    )!.id;
    useFileSystemStore.getState().deleteNode(fileId);

    const spy = vi.spyOn(useFileSystemStore.getState(), "permanentlyDelete");
    renderApp();
    const permBtn = screen.getByTitle("Delete Permanently");
    fireEvent.click(permBtn);
    expect(spy).toHaveBeenCalledWith(fileId);
  });

  it("Empty Recycle Bin button calls emptyRecycleBin and is disabled when empty", () => {
    const fs = useFileSystemStore.getState();
    const desktopId = Object.values(fs.nodes).find(
      (n) => n.name === "Desktop" && n.parentId === fs.rootId,
    )!.id;
    fs.createNode(desktopId, "empty-test.txt", "file", "");
    const fileId = Object.values(useFileSystemStore.getState().nodes).find(
      (n) => n.name === "empty-test.txt",
    )!.id;
    useFileSystemStore.getState().deleteNode(fileId);

    const spy = vi.spyOn(useFileSystemStore.getState(), "emptyRecycleBin");
    renderApp();
    const emptyBtn = screen.getByRole("button", { name: /empty recycle bin/i });
    expect(emptyBtn).not.toBeDisabled();
    fireEvent.click(emptyBtn);
    expect(spy).toHaveBeenCalled();
  });
  it("previews text safely and restores with a conflict suffix", () => {
    const fs = useFileSystemStore.getState();
    const id = fs.createNode(
      fs.rootId,
      "preview.txt",
      "file",
      "<script>example</script>",
    );
    fs.deleteNode(id);
    fs.createNode(fs.rootId, "preview.txt", "file", "existing");
    renderApp();
    fireEvent.click(
      screen.getByRole("button", { name: "Preview preview.txt" }),
    );
    expect(screen.getByText("<script>example</script>")).toBeTruthy();
    expect(screen.getByText(/numbered/)).toBeTruthy();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Restore",
      }),
    );
    expect(useFileSystemStore.getState().nodes[id].name).toBe(
      "preview (restored 1).txt",
    );
    expect(useFileSystemStore.getState().nodes[id].content).toBe(
      "<script>example</script>",
    );
  });

  it("restores to Root when the original folder no longer exists", () => {
    const fs = useFileSystemStore.getState();
    const folder = fs.createNode(fs.rootId, "Temporary", "folder");
    const id = fs.createNode(folder, "orphan.txt", "file", "content");
    fs.deleteNode(id);
    const nodes = { ...useFileSystemStore.getState().nodes };
    delete nodes[folder];
    useFileSystemStore.setState({ nodes });
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Preview orphan.txt" }));
    expect(screen.getByText(/original folder is unavailable/)).toBeTruthy();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Restore",
      }),
    );
    expect(useFileSystemStore.getState().nodes[id].parentId).toBe(fs.rootId);
  });
});
