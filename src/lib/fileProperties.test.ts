import { describe, expect, it } from "vitest";
import { contentBytes, fileProperties } from "./fileProperties";
import type { FsNode } from "../types";

const node = (
  id: string,
  parentId: string | null,
  type: "file" | "folder",
  content?: string,
): FsNode => ({
  id,
  name: id,
  parentId,
  type,
  content,
  createdAt: 0,
  updatedAt: 0,
});

describe("file properties", () => {
  it("measures Unicode bytes and decoded image payloads", () => {
    expect(contentBytes("€")).toBe(3);
    expect(contentBytes("data:image/png;base64,YQ==")).toBe(1);
    expect(contentBytes("data:image/png;base64,YWI=")).toBe(2);
    expect(contentBytes()).toBe(0);
  });
  it("counts nested content once and tolerates cycles", () => {
    const nodes = {
      root: node("root", null, "folder"),
      folder: node("folder", "root", "folder"),
      child: node("child", "folder", "folder"),
      file: node("file", "child", "file", "abc"),
    };
    expect(fileProperties(nodes, "folder")).toEqual({
      path: "/folder",
      bytes: 3,
      files: 1,
      folders: 1,
    });
    nodes.folder.parentId = "child";
    expect(fileProperties(nodes, "folder")?.bytes).toBe(3);
    expect(fileProperties(nodes, "missing")).toBeNull();
  });
});
