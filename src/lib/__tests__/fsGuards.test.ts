import { describe, it, expect, beforeEach } from "vitest";
import { isProtectedNode, isSelfOrDescendant, isSystemAppsFolder } from "../fsGuards";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { resetAllStores } from "../../test/resetStores";
import type { FsNode } from "../../types";

function find(name: string, parentId?: string): FsNode {
  const { nodes } = useFileSystemStore.getState();
  const node = Object.values(nodes).find(
    (n) => n.name === name && (parentId === undefined || n.parentId === parentId),
  );
  if (!node) throw new Error(`seed node not found: ${name}`);
  return node;
}

describe("fsGuards", () => {
  beforeEach(resetAllStores);

  describe("isProtectedNode", () => {
    it("protects the root, the core folders and .app shortcuts", () => {
      const { rootId } = useFileSystemStore.getState();
      expect(isProtectedNode(find("/"), rootId)).toBe(true);
      for (const name of ["Desktop", "Documents", "Pictures", "System Apps"]) {
        expect(isProtectedNode(find(name), rootId), name).toBe(true);
      }
      expect(isProtectedNode(find("Calculator.app"), rootId)).toBe(true);
    });

    it("does not protect regular user files", () => {
      const { rootId } = useFileSystemStore.getState();
      expect(isProtectedNode(find("About Me.txt"), rootId)).toBe(false);
      expect(isProtectedNode(find("readme.txt"), rootId)).toBe(false);
    });

    it("only protects core folder names directly under root", () => {
      const { rootId, createNode } = useFileSystemStore.getState();
      const nestedId = createNode(find("Documents").id, "Desktop", "folder");
      const nested = useFileSystemStore.getState().getNode(nestedId);
      expect(isProtectedNode(nested, rootId)).toBe(false);
    });

    it("treats a missing node as protected so callers never act on it", () => {
      expect(isProtectedNode(undefined, "root")).toBe(true);
    });
  });

  describe("isSystemAppsFolder", () => {
    it("matches only the System Apps folder under root", () => {
      const { rootId } = useFileSystemStore.getState();
      expect(isSystemAppsFolder(find("System Apps"), rootId)).toBe(true);
      expect(isSystemAppsFolder(find("Documents"), rootId)).toBe(false);
      expect(isSystemAppsFolder(find("Calculator.app"), rootId)).toBe(false);
      expect(isSystemAppsFolder(undefined, rootId)).toBe(false);
    });
  });

  describe("isSelfOrDescendant", () => {
    it("is true for the node itself and for deep descendants", () => {
      const docs = find("Documents");
      const a = useFileSystemStore.getState().createNode(docs.id, "a", "folder");
      const b = useFileSystemStore.getState().createNode(a, "b", "folder");
      const nodes = useFileSystemStore.getState().nodes;
      expect(isSelfOrDescendant(nodes, docs.id, docs.id)).toBe(true);
      expect(isSelfOrDescendant(nodes, docs.id, b)).toBe(true);
      expect(isSelfOrDescendant(nodes, docs.id, find("readme.txt").id)).toBe(true);
    });

    it("is false for siblings and for ancestors", () => {
      const { nodes } = useFileSystemStore.getState();
      const docs = find("Documents");
      expect(isSelfOrDescendant(nodes, docs.id, find("Desktop").id)).toBe(false);
      expect(isSelfOrDescendant(nodes, find("readme.txt").id, docs.id)).toBe(false);
    });

    it("is false for unknown ids", () => {
      const { nodes } = useFileSystemStore.getState();
      expect(isSelfOrDescendant(nodes, "x", "does-not-exist")).toBe(false);
    });
  });
});
