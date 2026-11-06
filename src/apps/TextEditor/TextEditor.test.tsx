import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextEditor } from "./TextEditor";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { useEditorSettingsStore } from "../../stores/useEditorSettingsStore";
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
    // word/char count in status bar
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

  // ── Markdown preview ────────────────────────────────────────────────────────

  describe("Markdown preview", () => {
    it("clicking preview toggle shows rendered HTML for markdown heading", async () => {
      const { area, user } = setup();
      await user.type(area, "# Hello");
      await user.click(screen.getByTitle("Preview mode"));
      // The textarea should be hidden and a heading rendered
      expect(screen.queryByRole("textbox")).toBeNull();
      expect(document.querySelector(".editor__preview h1")).not.toBeNull();
      expect(document.querySelector(".editor__preview h1")!.textContent).toMatch(/Hello/);
    });

    it("split view shows both textarea and preview simultaneously", async () => {
      const { area, user } = setup();
      await user.type(area, "# Split");
      await user.click(screen.getByTitle("Split view"));
      // Both textarea and preview visible
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(document.querySelector(".editor__preview")).not.toBeNull();
      expect(document.querySelector(".editor__body--split")).not.toBeNull();
    });

    it("toggling preview off returns to edit mode", async () => {
      const { user } = setup();
      await user.click(screen.getByTitle("Preview mode"));
      expect(screen.queryByRole("textbox")).toBeNull();
      await user.click(screen.getByTitle("Edit mode"));
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  // ── Find & Replace ──────────────────────────────────────────────────────────

  describe("Find & Replace", () => {
    it("Ctrl+F opens the find bar and focuses it", async () => {
      const { area } = setup();
      fireEvent.keyDown(area, { key: "f", ctrlKey: true });
      expect(document.querySelector(".editor__find")).not.toBeNull();
      expect(screen.getByPlaceholderText("Find…")).toBeInTheDocument();
    });

    it("typing in find input shows match count", async () => {
      const { area, user } = setup();
      // Type some text first
      await user.type(area, "cat and cat and dog");
      // Open find
      fireEvent.keyDown(area, { key: "f", ctrlKey: true });
      const findInput = screen.getByPlaceholderText("Find…");
      fireEvent.change(findInput, { target: { value: "cat" } });
      expect(screen.getByText("1 of 2")).toBeInTheDocument();
    });

    it("Next button cycles forward through matches", async () => {
      const { area, user } = setup();
      await user.type(area, "aaa bbb aaa ccc aaa");
      fireEvent.keyDown(area, { key: "f", ctrlKey: true });
      const findInput = screen.getByPlaceholderText("Find…");
      fireEvent.change(findInput, { target: { value: "aaa" } });
      // starts at 1 of 3
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
      await user.click(screen.getByTitle("Next"));
      expect(screen.getByText("2 of 3")).toBeInTheDocument();
      await user.click(screen.getByTitle("Next"));
      expect(screen.getByText("3 of 3")).toBeInTheDocument();
      // wraps around
      await user.click(screen.getByTitle("Next"));
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });

    it("Prev button cycles backward", async () => {
      const { area, user } = setup();
      await user.type(area, "aaa bbb aaa");
      fireEvent.keyDown(area, { key: "f", ctrlKey: true });
      fireEvent.change(screen.getByPlaceholderText("Find…"), { target: { value: "aaa" } });
      await user.click(screen.getByTitle("Previous"));
      // wraps to last (2 of 2)
      expect(screen.getByText("2 of 2")).toBeInTheDocument();
    });

    it("Ctrl+H opens find and replace bar", () => {
      const { area } = setup();
      fireEvent.keyDown(area, { key: "h", ctrlKey: true });
      expect(screen.getByPlaceholderText("Replace…")).toBeInTheDocument();
    });

    it("Replace All replaces all occurrences", async () => {
      const { area, user } = setup();
      await user.type(area, "foo bar foo baz foo");
      fireEvent.keyDown(area, { key: "h", ctrlKey: true });
      fireEvent.change(screen.getByPlaceholderText("Find…"), { target: { value: "foo" } });
      fireEvent.change(screen.getByPlaceholderText("Replace…"), { target: { value: "qux" } });
      await user.click(screen.getByRole("button", { name: "Replace All" }));
      expect(document.querySelector("textarea")).toHaveValue("qux bar qux baz qux");
    });

    it("Escape closes the find bar", async () => {
      const { area, user } = setup();
      fireEvent.keyDown(area, { key: "f", ctrlKey: true });
      expect(document.querySelector(".editor__find")).not.toBeNull();
      screen.getByPlaceholderText("Find…");
      await user.keyboard("{Escape}");
      expect(document.querySelector(".editor__find")).toBeNull();
    });

    it("shows No matches when find text has no matches", async () => {
      const { area, user } = setup();
      await user.type(area, "hello world");
      fireEvent.keyDown(area, { key: "f", ctrlKey: true });
      await user.type(screen.getByPlaceholderText("Find…"), "xyz");
      expect(screen.getByText("No matches")).toBeInTheDocument();
    });
  });

  // ── Formatting toolbar ──────────────────────────────────────────────────────

  describe("Formatting toolbar", () => {
    it("Bold button wraps selected text in **...**", async () => {
      const { area, user } = setup();
      // Type text then select it via fireEvent
      await user.type(area, "hello");
      // Select all text
      fireEvent.select(area, { target: { selectionStart: 0, selectionEnd: 5 } });
      // Set actual selection
      (area as HTMLTextAreaElement).setSelectionRange(0, 5);
      await user.click(screen.getByTitle("Bold (Ctrl+B)"));
      expect(area).toHaveValue("**hello**");
    });

    it("Italic button wraps selection in *...*", async () => {
      const { area, user } = setup();
      await user.type(area, "world");
      (area as HTMLTextAreaElement).setSelectionRange(0, 5);
      await user.click(screen.getByTitle("Italic (Ctrl+I)"));
      expect(area).toHaveValue("*world*");
    });

    it("Strikethrough wraps selection in ~~...~~", async () => {
      const { area, user } = setup();
      await user.type(area, "strike");
      (area as HTMLTextAreaElement).setSelectionRange(0, 6);
      await user.click(screen.getByTitle("Strikethrough"));
      expect(area).toHaveValue("~~strike~~");
    });

    it("Ctrl+B keyboard shortcut bolds selected text", async () => {
      const { area } = setup();
      fireEvent.change(area, { target: { value: "test" } });
      (area as HTMLTextAreaElement).setSelectionRange(0, 4);
      fireEvent.keyDown(area, { key: "b", ctrlKey: true });
      expect(area).toHaveValue("**test**");
    });

    it("Ctrl+I keyboard shortcut italicizes selected text", async () => {
      const { area } = setup();
      fireEvent.change(area, { target: { value: "word" } });
      (area as HTMLTextAreaElement).setSelectionRange(0, 4);
      fireEvent.keyDown(area, { key: "i", ctrlKey: true });
      expect(area).toHaveValue("*word*");
    });

    it("Code button wraps single-line selection in backticks", async () => {
      const { area, user } = setup();
      await user.type(area, "code");
      (area as HTMLTextAreaElement).setSelectionRange(0, 4);
      await user.click(screen.getByTitle("Code"));
      expect(area).toHaveValue("`code`");
    });

    it("Heading button prepends # to the current line", async () => {
      const { area, user } = setup();
      await user.type(area, "My heading");
      (area as HTMLTextAreaElement).setSelectionRange(0, 0);
      await user.click(screen.getByTitle("Heading"));
      expect((area as HTMLTextAreaElement).value).toMatch(/^# My heading/);
    });

    it("List button prepends - to the current line", async () => {
      const { area, user } = setup();
      await user.type(area, "Item");
      (area as HTMLTextAreaElement).setSelectionRange(0, 0);
      await user.click(screen.getByTitle("List"));
      expect((area as HTMLTextAreaElement).value).toMatch(/^- Item/);
    });
  });

  // ── Editor settings ─────────────────────────────────────────────────────────

  describe("Editor settings", () => {
    it("font size change applies to textarea style", async () => {
      const { user } = setup();
      await user.click(screen.getByTitle("Editor settings"));
      await user.click(screen.getByRole("button", { name: "16" }));
      const area = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(area.style.fontSize).toBe("16px");
    });

    it("line wrap toggle changes textarea whiteSpace style", async () => {
      const { user } = setup();
      const area = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(area.style.whiteSpace).toBe("pre");
      await user.click(screen.getByTitle("Editor settings"));
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);
      expect(area.style.whiteSpace).toBe("pre-wrap");
    });

    it("settings persist in useEditorSettingsStore", async () => {
      const { user } = setup();
      await user.click(screen.getByTitle("Editor settings"));
      await user.click(screen.getByRole("button", { name: "18" }));
      expect(useEditorSettingsStore.getState().fontSize).toBe(18);
    });

    it("font family toggle switches between mono and sans", async () => {
      const { user } = setup();
      await user.click(screen.getByTitle("Editor settings"));
      await user.click(screen.getByRole("button", { name: "Sans" }));
      const area = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(area.style.fontFamily).toBe("sans-serif");
    });
  });

  // ── Status bar ──────────────────────────────────────────────────────────────

  describe("Status bar", () => {
    it("shows word and char count in status bar", async () => {
      const { area, user } = setup();
      await user.type(area, "hello world");
      expect(screen.getByText("2 words · 11 chars")).toBeInTheDocument();
    });

    it("status bar shows Ln and Col", () => {
      setup();
      expect(screen.getByText(/Ln 1, Col 1/)).toBeInTheDocument();
    });
  });
});
