import { describe, it, expect, beforeEach } from "vitest";
import type React from "react";
import {
  startNodeDrag, startIconDrag, isNodeDrag, isIconDrag, getDraggedNodeId,
  getIconDrag, allowNodeDrop, dropNodeInto,
} from "../dragDrop";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { resetAllStores } from "../../test/resetStores";

function fakeDrag(init: Record<string, string> = {}, rect = { left: 0, top: 0 }) {
  const data = new Map(Object.entries(init));
  let prevented = false;
  const event = {
    clientX: 50,
    clientY: 60,
    currentTarget: { getBoundingClientRect: () => rect },
    preventDefault: () => { prevented = true; },
    dataTransfer: {
      effectAllowed: "",
      dropEffect: "",
      get types() { return [...data.keys()]; },
      setData: (k: string, v: string) => { data.set(k, v); },
      getData: (k: string) => data.get(k) ?? "",
    },
  };
  return { event: event as unknown as React.DragEvent, data, wasPrevented: () => prevented };
}

const fs = () => useFileSystemStore.getState();
const byName = (name: string) => Object.values(fs().nodes).find((n) => n.name === name)!;

describe("drag payload helpers", () => {
  it("startNodeDrag stores the node id and marks the drag as a node drag", () => {
    const { event } = fakeDrag();
    startNodeDrag(event, "abc");
    expect(isNodeDrag(event)).toBe(true);
    expect(isIconDrag(event)).toBe(false);
    expect(getDraggedNodeId(event)).toBe("abc");
    expect(event.dataTransfer.effectAllowed).toBe("move");
  });

  it("startIconDrag records the key and the grab offset inside the icon", () => {
    const { event } = fakeDrag({}, { left: 20, top: 25 });
    startIconDrag(event, "app-terminal");
    expect(isIconDrag(event)).toBe(true);
    expect(isNodeDrag(event)).toBe(false);
    expect(getIconDrag(event)).toEqual({ key: "app-terminal", dx: 30, dy: 35 });
  });

  it("getIconDrag returns null for missing or corrupt payloads", () => {
    expect(getIconDrag(fakeDrag().event)).toBeNull();
    expect(getIconDrag(fakeDrag({ "application/x-webos-icon": "{not json" }).event)).toBeNull();
  });

  it("ignores foreign drags such as text selections", () => {
    const { event, wasPrevented } = fakeDrag({ "text/plain": "hello" });
    expect(isNodeDrag(event)).toBe(false);
    expect(allowNodeDrop(event)).toBe(false);
    expect(wasPrevented()).toBe(false);
  });

  it("allowNodeDrop accepts our drags and shows the move cursor", () => {
    const { event, wasPrevented } = fakeDrag();
    startNodeDrag(event, "abc");
    expect(allowNodeDrop(event)).toBe(true);
    expect(wasPrevented()).toBe(true);
    expect(event.dataTransfer.dropEffect).toBe("move");
  });
});

describe("dropNodeInto", () => {
  beforeEach(resetAllStores);

  function dragOf(nodeId: string) {
    const { event } = fakeDrag();
    startNodeDrag(event, nodeId);
    return event;
  }

  it("moves a file into the target folder", () => {
    const file = byName("About Me.txt");
    const desktop = byName("Desktop");
    expect(dropNodeInto(dragOf(file.id), desktop.id)).toBe(true);
    expect(fs().getNode(file.id)!.parentId).toBe(desktop.id);
  });

  it("does nothing when there is no drag payload", () => {
    expect(dropNodeInto(fakeDrag().event, byName("Desktop").id)).toBe(false);
  });

  it("does nothing when the node is already in that folder", () => {
    const file = byName("readme.txt");
    expect(dropNodeInto(dragOf(file.id), file.parentId!)).toBe(false);
  });

  it("refuses to drop onto a file or an unknown target", () => {
    const file = byName("About Me.txt");
    expect(dropNodeInto(dragOf(file.id), byName("todo.txt").id)).toBe(false);
    expect(dropNodeInto(dragOf(file.id), "nope")).toBe(false);
    expect(dropNodeInto(dragOf("nope"), byName("Desktop").id)).toBe(false);
  });

  it("never moves protected nodes (system folders, .app shortcuts)", () => {
    const desktop = byName("Desktop");
    expect(dropNodeInto(dragOf(byName("Pictures").id), desktop.id)).toBe(false);
    expect(dropNodeInto(dragOf(byName("Calculator.app").id), desktop.id)).toBe(false);
    expect(byName("Pictures").parentId).toBe(fs().rootId);
  });

  it("locks the System Apps folder in both directions", () => {
    const systemApps = byName("System Apps");
    const file = byName("About Me.txt");
    expect(dropNodeInto(dragOf(file.id), systemApps.id)).toBe(false);
    expect(fs().getNode(file.id)!.parentId).toBe(fs().rootId);
  });

  it("refuses to move a folder into itself or one of its descendants", () => {
    const docs = byName("Documents");
    const sub = fs().createNode(docs.id, "sub", "folder");
    expect(dropNodeInto(dragOf(docs.id), docs.id)).toBe(false);
    expect(dropNodeInto(dragOf(docs.id), sub)).toBe(false);
    expect(fs().getNode(docs.id)!.parentId).toBe(fs().rootId);
  });

  it("refuses when the target folder already has an item with the same name", () => {
    const desktop = byName("Desktop");
    fs().createNode(desktop.id, "readme.txt", "file", "");
    const readme = fs().getChildren(byName("Documents").id).find((n) => n.name === "readme.txt")!;
    expect(dropNodeInto(dragOf(readme.id), desktop.id)).toBe(false);
    expect(fs().getNode(readme.id)!.parentId).toBe(byName("Documents").id);
  });
});
