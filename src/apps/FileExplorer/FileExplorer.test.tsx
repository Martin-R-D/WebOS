import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileExplorer } from "./FileExplorer";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";

const fs = () => useFileSystemStore.getState();
const byName = (name: string) =>
  Object.values(fs().nodes).find((n) => n.name === name)!;

function renderExplorer() {
  const winId = useWindowStore.getState().openWindow({
    appId: "file-explorer",
    title: "File Explorer",
    icon: "Folder",
    width: 720,
    height: 480,
  });
  return render(<FileExplorer windowId={winId} />);
}

describe("FileExplorer search", () => {
  beforeEach(resetAllStores);

  it("shows a search button that opens the search input", async () => {
    renderExplorer();
    const btn = screen.getByLabelText("Search");
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(screen.getByPlaceholderText("Search files…")).toBeInTheDocument();
  });

  it("filters files by name across all folders", async () => {
    renderExplorer();
    await userEvent.click(screen.getByLabelText("Search"));
    const input = screen.getByPlaceholderText("Search files…");
    await userEvent.type(input, "readme");
    expect(screen.getByText("readme.txt")).toBeInTheDocument();
  });

  it("shows 'No results' when nothing matches", async () => {
    renderExplorer();
    await userEvent.click(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByPlaceholderText("Search files…"), "zzzznotfound");
    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it("clears search and returns to folder view when X is clicked", async () => {
    renderExplorer();
    await userEvent.click(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByPlaceholderText("Search files…"), "readme");
    expect(screen.getByText("readme.txt")).toBeInTheDocument();

    const clearBtn = screen.getByPlaceholderText("Search files…")
      .closest(".fx__search")!
      .querySelector(".fx__search-clear")! as HTMLElement;
    await userEvent.click(clearBtn);

    expect(screen.queryByPlaceholderText("Search files…")).not.toBeInTheDocument();
    expect(screen.getByText("About Me.txt")).toBeInTheDocument();
  });

  it("clears search when navigating to a folder via sidebar", async () => {
    renderExplorer();
    await userEvent.click(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByPlaceholderText("Search files…"), "todo");

    const sidebarDocuments = screen.getAllByText("Documents").find(
      (el) => el.closest(".fx__side-item"),
    )!;
    await userEvent.click(sidebarDocuments);

    expect(screen.queryByPlaceholderText("Search files…")).not.toBeInTheDocument();
  });

  it("search is case-insensitive", async () => {
    renderExplorer();
    await userEvent.click(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByPlaceholderText("Search files…"), "README");
    expect(screen.getByText("readme.txt")).toBeInTheDocument();
  });

  it("shows the parent path for each search result", async () => {
    renderExplorer();
    await userEvent.click(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByPlaceholderText("Search files…"), "todo");
    expect(screen.getByText("/Documents")).toBeInTheDocument();
  });

  it("double-clicking a folder result navigates to it and clears search", async () => {
    renderExplorer();
    await userEvent.click(screen.getByLabelText("Search"));
    await userEvent.type(screen.getByPlaceholderText("Search files…"), "Pictures");

    const results = screen.getAllByText("Pictures");
    const gridResult = results.find((el) => el.closest(".fx__item"))!;
    fireEvent.doubleClick(gridResult.closest("button")!);

    expect(screen.queryByPlaceholderText("Search files…")).not.toBeInTheDocument();
    expect(screen.getByText("This folder is empty")).toBeInTheDocument();
  });
});

describe("searchNodes store method", () => {
  beforeEach(resetAllStores);

  it("returns empty array for empty query", () => {
    expect(fs().searchNodes("")).toEqual([]);
    expect(fs().searchNodes("   ")).toEqual([]);
  });

  it("finds nodes by partial name match", () => {
    const results = fs().searchNodes("read");
    expect(results.some((n) => n.name === "readme.txt")).toBe(true);
  });

  it("excludes the root node", () => {
    const results = fs().searchNodes("/");
    expect(results.every((n) => n.id !== fs().rootId)).toBe(true);
  });

  it("sorts folders before files", () => {
    fs().createNode(byName("Desktop").id, "alpha-file.txt", "file", "");
    fs().createNode(byName("Desktop").id, "alpha-folder", "folder");
    const results = fs().searchNodes("alpha");
    expect(results[0].type).toBe("folder");
    expect(results[1].type).toBe("file");
  });

  it("is case-insensitive", () => {
    fs().createNode(byName("Desktop").id, "MyNote.TXT", "file", "hello");
    expect(fs().searchNodes("mynote").some((n) => n.name === "MyNote.TXT")).toBe(true);
    expect(fs().searchNodes("MYNOTE").some((n) => n.name === "MyNote.TXT")).toBe(true);
  });
});
