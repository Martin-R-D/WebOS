import { describe, it, expect, beforeEach } from "vitest";
import { useFileSystemStore } from "./useFileSystemStore";
import { resetAllStores } from "../test/resetStores";

const fs = () => useFileSystemStore.getState();
const byName = (name: string, parentId?: string) =>
  Object.values(fs().nodes).find(
    (n) => n.name === name && (parentId === undefined || n.parentId === parentId),
  )!;

describe("useFileSystemStore", () => {
  beforeEach(resetAllStores);

  describe("seed", () => {
    it("builds a root with the core folders and one shortcut per system app", () => {
      const children = fs().getChildren(fs().rootId).map((n) => n.name);
      expect(children).toEqual(
        expect.arrayContaining(["Desktop", "Documents", "Pictures", "System Apps", "About Me.txt"]),
      );
      const apps = fs().getChildren(byName("System Apps").id);
      expect(apps).toHaveLength(14);
      expect(apps.every((a) => a.name.endsWith(".app") && a.content)).toBe(true);
    });

    it("has a parentless root and every other node pointing at an existing parent", () => {
      expect(fs().nodes[fs().rootId].parentId).toBeNull();
      for (const n of Object.values(fs().nodes).filter((n) => n.id !== fs().rootId)) {
        expect(fs().nodes[n.parentId!], n.name).toBeDefined();
      }
    });
  });

  describe("getChildren", () => {
    it("lists folders first, then files, each sorted case-insensitively", () => {
      const docs = byName("Documents").id;
      fs().createNode(docs, "Zeta", "folder");
      fs().createNode(docs, "alpha", "folder");
      fs().createNode(docs, "Beta.txt", "file", "");
      const names = fs().getChildren(docs).map((n) => n.name);
      expect(names).toEqual(["alpha", "Zeta", "Beta.txt", "readme.txt", "todo.txt"]);
    });

    it("returns an empty list for an empty folder", () => {
      expect(fs().getChildren(byName("Desktop").id)).toEqual([]);
    });
  });

  describe("createNode", () => {
    it("creates a node with content and returns its id", () => {
      const id = fs().createNode(byName("Desktop").id, "note.txt", "file", "hello");
      expect(fs().getNode(id)).toMatchObject({ name: "note.txt", type: "file", content: "hello" });
    });

    it("refuses a duplicate name in the same folder and returns an empty id", () => {
      const desktop = byName("Desktop").id;
      fs().createNode(desktop, "a.txt", "file", "1");
      const before = Object.keys(fs().nodes).length;
      expect(fs().createNode(desktop, "a.txt", "file", "2")).toBe("");
      expect(Object.keys(fs().nodes)).toHaveLength(before);
    });

    it("allows the same name in different folders", () => {
      const a = fs().createNode(byName("Desktop").id, "a.txt", "file", "");
      const b = fs().createNode(byName("Documents").id, "a.txt", "file", "");
      expect(a).not.toBe("");
      expect(b).not.toBe("");
    });
  });

  describe("renameNode", () => {
    it("renames a node", () => {
      const id = fs().createNode(byName("Desktop").id, "old.txt", "file", "");
      fs().renameNode(id, "new.txt");
      expect(fs().getNode(id)!.name).toBe("new.txt");
    });

    it("ignores a rename that would collide with a sibling", () => {
      const desktop = byName("Desktop").id;
      fs().createNode(desktop, "a.txt", "file", "");
      const b = fs().createNode(desktop, "b.txt", "file", "");
      fs().renameNode(b, "a.txt");
      expect(fs().getNode(b)!.name).toBe("b.txt");
    });

    it("allows renaming a node to its own current name", () => {
      const id = fs().createNode(byName("Desktop").id, "same.txt", "file", "");
      fs().renameNode(id, "same.txt");
      expect(fs().getNode(id)!.name).toBe("same.txt");
    });

    it("does nothing for an unknown id", () => {
      const before = fs().nodes;
      fs().renameNode("missing", "x");
      expect(fs().nodes).toBe(before);
    });
  });

  describe("updateContent", () => {
    it("replaces file content", () => {
      const id = fs().createNode(byName("Desktop").id, "n.txt", "file", "a");
      fs().updateContent(id, "b");
      expect(fs().getNode(id)!.content).toBe("b");
    });

    it("does nothing for an unknown id", () => {
      const count = Object.keys(fs().nodes).length;
      fs().updateContent("missing", "x");
      expect(Object.keys(fs().nodes)).toHaveLength(count);
    });
  });

  describe("moveNode", () => {
    it("moves a file to another folder", () => {
      const id = fs().createNode(byName("Desktop").id, "m.txt", "file", "");
      fs().moveNode(id, byName("Documents").id);
      expect(fs().getNode(id)!.parentId).toBe(byName("Documents").id);
    });

    it("refuses to move when the target already has that name", () => {
      const desktop = byName("Desktop").id;
      const id = fs().createNode(desktop, "readme.txt", "file", "");
      fs().moveNode(id, byName("Documents").id);
      expect(fs().getNode(id)!.parentId).toBe(desktop);
    });

    it("never moves the root", () => {
      fs().moveNode(fs().rootId, byName("Documents").id);
      expect(fs().getNode(fs().rootId)!.parentId).toBeNull();
    });
  });

  describe("deleteNode", () => {
    it("soft-deletes a node into deletedNodes instead of removing it", () => {
      const desktop = byName("Desktop").id;
      const id = fs().createNode(desktop, "gone.txt", "file", "bye");
      fs().deleteNode(id);
      expect(fs().getNode(id)).toBeUndefined();
      expect(fs().deletedNodes[id]).toBeDefined();
      expect(fs().deletedNodes[id].node.name).toBe("gone.txt");
    });

    it("soft-deletes a folder together with all descendants", () => {
      const docs = byName("Documents").id;
      const sub = fs().createNode(docs, "sub", "folder");
      const deep = fs().createNode(sub, "deep.txt", "file", "");
      fs().deleteNode(docs);
      expect(fs().getNode(docs)).toBeUndefined();
      expect(fs().getNode(sub)).toBeUndefined();
      expect(fs().getNode(deep)).toBeUndefined();
      expect(fs().deletedNodes[docs]).toBeDefined();
      expect(fs().deletedNodes[sub]).toBeDefined();
      expect(fs().deletedNodes[deep]).toBeDefined();
      expect(byName("Desktop")).toBeDefined();
    });

    it("never deletes the root", () => {
      const count = Object.keys(fs().nodes).length;
      fs().deleteNode(fs().rootId);
      expect(Object.keys(fs().nodes)).toHaveLength(count);
    });
  });

  describe("recycle bin", () => {
    it("restoreNode moves node back to nodes", () => {
      const desktop = byName("Desktop").id;
      const id = fs().createNode(desktop, "restore.txt", "file", "hi");
      fs().deleteNode(id);
      expect(fs().getNode(id)).toBeUndefined();
      fs().restoreNode(id);
      expect(fs().getNode(id)).toBeDefined();
      expect(fs().getNode(id)!.name).toBe("restore.txt");
      expect(fs().deletedNodes[id]).toBeUndefined();
    });

    it("restoreNode restores to rootId if original parent no longer exists", () => {
      const docs = byName("Documents").id;
      const sub = fs().createNode(docs, "tempfolder", "folder");
      const child = fs().createNode(sub, "child.txt", "file", "");
      // delete just the child first (while parent is still in nodes)
      fs().deleteNode(child);
      // now delete the parent (this hard-deletes sub from nodes and moves to deleted)
      fs().deleteNode(sub);
      // restore child — its parent (sub) is no longer in nodes, should go to rootId
      fs().restoreNode(child);
      expect(fs().getNode(child)!.parentId).toBe(fs().rootId);
    });

    it("permanentlyDelete removes from deletedNodes", () => {
      const desktop = byName("Desktop").id;
      const id = fs().createNode(desktop, "perm.txt", "file", "");
      fs().deleteNode(id);
      expect(fs().deletedNodes[id]).toBeDefined();
      fs().permanentlyDelete(id);
      expect(fs().deletedNodes[id]).toBeUndefined();
    });

    it("emptyRecycleBin clears all deletedNodes", () => {
      const desktop = byName("Desktop").id;
      fs().createNode(desktop, "a.txt", "file", "");
      fs().createNode(desktop, "b.txt", "file", "");
      const a = Object.values(fs().nodes).find((n) => n.name === "a.txt")!.id;
      const b = Object.values(fs().nodes).find((n) => n.name === "b.txt")!.id;
      fs().deleteNode(a);
      fs().deleteNode(b);
      expect(Object.keys(fs().deletedNodes).length).toBe(2);
      fs().emptyRecycleBin();
      expect(Object.keys(fs().deletedNodes).length).toBe(0);
    });

    it("descendants are soft-deleted and restored together", () => {
      const docs = byName("Documents").id;
      const folder = fs().createNode(docs, "myfolder", "folder");
      const child = fs().createNode(folder, "child.txt", "file", "");
      fs().deleteNode(folder);
      expect(fs().deletedNodes[folder]).toBeDefined();
      expect(fs().deletedNodes[child]).toBeDefined();
      fs().restoreNode(folder);
      expect(fs().getNode(folder)).toBeDefined();
      expect(fs().getNode(child)).toBeDefined();
      expect(fs().deletedNodes[folder]).toBeUndefined();
      expect(fs().deletedNodes[child]).toBeUndefined();
    });
  });

  describe("getPath", () => {
    it("returns / for the root and slash-joined names for nested nodes", () => {
      expect(fs().getPath(fs().rootId)).toBe("/");
      const id = fs().createNode(byName("Documents").id, "x.txt", "file", "");
      expect(fs().getPath(id)).toBe("/Documents/x.txt");
    });
  });

  describe("resetFileSystem", () => {
    it("restores the seeded file system and drops user data", () => {
      const id = fs().createNode(byName("Desktop").id, "mine.txt", "file", "");
      fs().resetFileSystem();
      expect(fs().getNode(id)).toBeUndefined();
      expect(fs().getChildren(byName("System Apps").id)).toHaveLength(14);
    });
  });

  describe("persistence and migration", () => {
    it("persists nodes under the webos-filesystem key", () => {
      fs().createNode(byName("Desktop").id, "persisted.txt", "file", "");
      const raw = JSON.parse(localStorage.getItem("webos-filesystem")!);
      expect(raw.version).toBe(7);
      const names = Object.values<{ name: string }>(raw.state.nodes).map((n) => n.name);
      expect(names).toContain("persisted.txt");
    });

    it("migrating an old state recreates System Apps and adds shortcuts without touching user files", async () => {
      const mk = (id: string, name: string, type: "file" | "folder", parentId: string | null, content?: string) => ({
        id, name, type, parentId, content, createdAt: 1, updatedAt: 1,
      });
      localStorage.setItem(
        "webos-filesystem",
        JSON.stringify({
          version: 1,
          state: {
            rootId: "root",
            nodes: {
              root: mk("root", "/", "folder", null),
              mine: mk("mine", "mine.txt", "file", "root", "precious"),
            },
          },
        }),
      );
      await useFileSystemStore.persist.rehydrate();
      expect(fs().getChildren(byName("System Apps").id)).toHaveLength(14);
      expect(fs().getNode("mine")!.content).toBe("precious");
    });
  });
});
