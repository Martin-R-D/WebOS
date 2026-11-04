import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextEditor } from "./TextEditor";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { resetAllStores } from "../../test/resetStores";

const fs = () => useFileSystemStore.getState();
const byName = (name: string, parentId?: string) =>
  Object.values(fs().nodes).find((n) => n.name === name && (parentId === undefined || n.parentId === parentId));
const windowTitle = (id: string) => useWindowStore.getState().windows.find((w) => w.id === id)!.title;

function setup(fileId?: string) {
  const windowId = useWindowStore.getState().openWindow({
    appId: "text-editor", title: "Text Editor", icon: "FileText", width: 600, height: 400,
  });
  render(<TextEditor windowId={windowId} launchProps={fileId ? { fileId } : undefined} />);
  const area = screen.getAllByRole("textbox")[0];
  return { windowId, area, user: userEvent.setup() };
}

describe("TextEditor", () => {
  beforeEach(resetAllStores);

  it("starts as an empty Untitled.txt", () => {
    const { area, windowId } = setup();
    expect(area).toHaveValue("");
    expect(windowTitle(windowId)).toBe("Untitled.txt");
    expect(screen.getByText("0 words · 0 chars")).toBeInTheDocument();
  });

  it("loads an existing file's content and uses its name as the window title", () => {
    const readme = byName("readme.txt")!;
    const { area, windowId } = setup(readme.id);
    expect(area).toHaveValue(readme.content);
    expect(windowTitle(windowId)).toBe("readme.txt");
  });

  it("counts words and characters as you type, ignoring extra whitespace", async () => {
    const { area, user } = setup();
    await user.type(area, "  hello   brave new  world ");
    expect(screen.getByText("4 words · 27 chars")).toBeInTheDocument();
  });

  it("marks the title dirty on edit and Save writes back to the same file and clears the mark", async () => {
    const readme = byName("readme.txt")!;
    const { area, windowId, user } = setup(readme.id);
    await user.type(area, "!");
    expect(windowTitle(windowId)).toBe("readme.txt •");
    await user.click(screen.getByRole("button", { name: /^Save$/ }));
    expect(fs().getNode(readme.id)!.content).toBe(`${readme.content}!`);
    expect(windowTitle(windowId)).toBe("readme.txt");
  });

  it("Save on an unsaved document opens the Save As dialog instead of writing anything", async () => {
    const { area, user } = setup();
    const before = Object.keys(fs().nodes).length;
    await user.type(area, "draft");
    await user.click(screen.getByRole("button", { name: /^Save$/ }));
    expect(screen.getByText("Save As", { selector: ".save-dialog__header" })).toBeInTheDocument();
    expect(Object.keys(fs().nodes)).toHaveLength(before);
  });

  it("Save As creates a new file in the chosen folder and retitles the window", async () => {
    const { area, windowId, user } = setup();
    await user.type(area, "draft body");
    await user.click(screen.getByRole("button", { name: /Save As/ }));
    const dialog = document.querySelector(".save-dialog") as HTMLElement;
    await user.dblClick(within(dialog).getByText("Documents"));
    const name = dialog.querySelector("input") as HTMLInputElement;
    await user.clear(name);
    await user.type(name, "draft.txt");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    const created = byName("draft.txt", byName("Documents")!.id)!;
    expect(created).toMatchObject({ type: "file", content: "draft body" });
    expect(windowTitle(windowId)).toBe("draft.txt");
    expect(document.querySelector(".save-dialog")).toBeNull();
  });

  it("asks before overwriting an existing file and only writes after confirmation", async () => {
    const { area, user } = setup();
    await user.type(area, "NEW");
    await user.click(screen.getByRole("button", { name: /Save As/ }));
    const dialog = document.querySelector(".save-dialog") as HTMLElement;
    await user.dblClick(within(dialog).getByText("Documents"));
    const name = dialog.querySelector("input") as HTMLInputElement;
    await user.clear(name);
    await user.type(name, "readme.txt");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(screen.getByText("File already exists")).toBeInTheDocument();
    const readme = byName("readme.txt")!;
    expect(readme.content).not.toBe("NEW");

    await user.click(screen.getByRole("button", { name: "Overwrite" }));
    expect(fs().getNode(readme.id)!.content).toBe("NEW");
    expect(document.querySelector(".save-dialog")).toBeNull();
  });

  it("choosing No on the overwrite prompt leaves the file untouched and the dialog open", async () => {
    const { area, user } = setup();
    await user.type(area, "NEW");
    await user.click(screen.getByRole("button", { name: /Save As/ }));
    const dialog = document.querySelector(".save-dialog") as HTMLElement;
    await user.dblClick(within(dialog).getByText("Documents"));
    const name = dialog.querySelector("input") as HTMLInputElement;
    await user.clear(name);
    await user.type(name, "todo.txt");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    const before = byName("todo.txt")!.content;
    await user.click(screen.getByRole("button", { name: "No" }));
    expect(byName("todo.txt")!.content).toBe(before);
    expect(document.querySelector(".save-dialog")).not.toBeNull();
  });

  it("refuses to save a file over a folder of the same name", async () => {
    const { area, user } = setup();
    await user.type(area, "x");
    await user.click(screen.getByRole("button", { name: /Save As/ }));
    const dialog = document.querySelector(".save-dialog") as HTMLElement;
    const name = dialog.querySelector("input") as HTMLInputElement;
    await user.clear(name);
    await user.type(name, "Documents");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(screen.getByText("A folder with this name exists here")).toBeInTheDocument();
    expect(byName("Documents")!.type).toBe("folder");
  });

  it("Cancel closes the dialog without creating a file", async () => {
    const { user } = setup();
    const before = Object.keys(fs().nodes).length;
    await user.click(screen.getByRole("button", { name: /Save As/ }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.querySelector(".save-dialog")).toBeNull();
    expect(Object.keys(fs().nodes)).toHaveLength(before);
  });

  it("Save As with the file's own name and folder overwrites that same node instead of duplicating it", async () => {
    const todo = byName("todo.txt")!;
    const { area, user } = setup(todo.id);
    await user.type(area, " more");
    const before = Object.keys(fs().nodes).length;
    await user.click(screen.getByRole("button", { name: /Save As/ }));
    const dialog = document.querySelector(".save-dialog") as HTMLElement;
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Overwrite" }));
    expect(Object.keys(fs().nodes)).toHaveLength(before);
    expect(fs().getNode(todo.id)!.content).toBe(`${todo.content} more`);
  });
});
