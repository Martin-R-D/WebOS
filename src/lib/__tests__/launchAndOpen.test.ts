import { describe, it, expect, beforeEach } from "vitest";
import { launchApp } from "../launch";
import { openFsNode, isImageFile } from "../openNode";
import { useWindowStore } from "../../stores/useWindowStore";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { appRegistry } from "../../apps/registry";
import { resetAllStores } from "../../test/resetStores";
import type { FsNode } from "../../types";

const wins = () => useWindowStore.getState().windows;
const fsNode = (name: string): FsNode =>
  Object.values(useFileSystemStore.getState().nodes).find((n) => n.name === name)!;

describe("launchApp", () => {
  beforeEach(resetAllStores);

  it("opens a window sized and titled from the app definition", () => {
    launchApp("terminal");
    expect(wins()).toHaveLength(1);
    expect(wins()[0]).toMatchObject({
      appId: "terminal",
      title: appRegistry.terminal.name,
      width: appRegistry.terminal.defaultWidth,
      height: appRegistry.terminal.defaultHeight,
    });
  });

  it("opens several windows of a multi-instance app", () => {
    launchApp("terminal");
    launchApp("terminal");
    expect(wins()).toHaveLength(2);
  });

  it("focuses the existing window instead of opening a second one for single-instance apps", () => {
    launchApp("calculator");
    const first = wins()[0].id;
    launchApp("terminal");
    launchApp("calculator");
    expect(wins().filter((w) => w.appId === "calculator")).toHaveLength(1);
    expect(useWindowStore.getState().focusedId).toBe(first);
  });

  it("un-minimizes a single-instance window when launched again", () => {
    launchApp("settings");
    useWindowStore.getState().minimizeWindow(wins()[0].id);
    launchApp("settings");
    expect(wins()[0].isMinimized).toBe(false);
  });

  it("ignores unknown app ids", () => {
    launchApp("does-not-exist" as never);
    expect(wins()).toHaveLength(0);
  });
});

describe("isImageFile", () => {
  it.each(["a.png", "a.JPG", "photo.jpeg", "x.gif", "x.webp", "x.bmp"])("%s is an image", (name) => {
    expect(isImageFile(name)).toBe(true);
  });
  it.each(["a.txt", "png", "archive.png.zip", "notes", ""])("%s is not an image", (name) => {
    expect(isImageFile(name)).toBe(false);
  });
});

describe("openFsNode", () => {
  beforeEach(resetAllStores);

  it("opens a folder in File Explorer pointed at that folder", () => {
    const docs = fsNode("Documents");
    openFsNode(docs);
    expect(wins()).toHaveLength(1);
    expect(wins()[0]).toMatchObject({
      appId: "file-explorer", title: "Documents", launchProps: { folderId: docs.id },
    });
  });

  it("focuses the already-open explorer for the same folder, but opens another for a different folder", () => {
    openFsNode(fsNode("Documents"));
    openFsNode(fsNode("Documents"));
    expect(wins()).toHaveLength(1);
    openFsNode(fsNode("Desktop"));
    expect(wins()).toHaveLength(2);
  });

  it("launches the referenced app for a .app shortcut", () => {
    openFsNode(fsNode("Calculator.app"));
    expect(wins().map((w) => w.appId)).toEqual(["calculator"]);
  });

  it("falls back to the text editor when a .app shortcut points at an unknown app", () => {
    const bogus: FsNode = { ...fsNode("Calculator.app"), content: "not-an-app" };
    openFsNode(bogus);
    expect(wins().map((w) => w.appId)).toEqual(["text-editor"]);
  });

  it("opens text files in the Text Editor with the file id", () => {
    const file = fsNode("readme.txt");
    openFsNode(file);
    expect(wins()[0]).toMatchObject({
      appId: "text-editor", title: "readme.txt", launchProps: { fileId: file.id },
    });
  });

  it("opens image files in Paint", () => {
    const store = useFileSystemStore.getState();
    const id = store.createNode(fsNode("Pictures").id, "drawing.PNG", "file", "data:image/png;base64,AAAA");
    openFsNode(store.getNode(id)!);
    expect(wins()[0]).toMatchObject({ appId: "paint", title: "drawing.PNG", launchProps: { fileId: id } });
  });

  it("does not open the same file twice", () => {
    const file = fsNode("todo.txt");
    openFsNode(file);
    openFsNode(file);
    expect(wins()).toHaveLength(1);
  });
});
