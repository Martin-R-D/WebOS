import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FsNode, NodeType } from "../types";

interface FsState {
  nodes: Record<string, FsNode>;
  rootId: string;
  getChildren: (parentId: string) => FsNode[];
  getNode: (id: string) => FsNode | undefined;
  createNode: (parentId: string, name: string, type: NodeType, content?: string) => string;
  renameNode: (id: string, newName: string) => void;
  deleteNode: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  moveNode: (id: string, newParentId: string) => void;
  getPath: (id: string) => string;
  resetFileSystem: () => void;
}

function makeNode(
  name: string,
  type: NodeType,
  parentId: string | null,
  content?: string,
): FsNode {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    type,
    parentId,
    content,
    createdAt: now,
    updatedAt: now,
  };
}

function buildSeed(): { nodes: Record<string, FsNode>; rootId: string } {
  const root = makeNode("/", "folder", null);
  const desktop = makeNode("Desktop", "folder", root.id);
  const documents = makeNode("Documents", "folder", root.id);
  const pictures = makeNode("Pictures", "folder", root.id);
  const aboutMe = makeNode(
    "About Me.txt",
    "file",
    root.id,
    "Hi! I'm [Your Name].\n\nWelcome to my interactive portfolio OS.\nOpen the apps, explore the files, and check out my projects.\n\n- Email: you@example.com\n- GitHub: github.com/yourname",
  );
  const readme = makeNode(
    "readme.txt",
    "file",
    documents.id,
    "This is a virtual file system. Anything you create here is saved in your browser.",
  );
  const todo = makeNode(
    "todo.txt",
    "file",
    documents.id,
    "- [ ] Star this repo\n- [ ] Hire this developer\n- [x] Build a cool OS",
  );

  const all = [root, desktop, documents, pictures, aboutMe, readme, todo];
  const nodes: Record<string, FsNode> = {};
  for (const node of all) {
    nodes[node.id] = node;
  }
  return { nodes, rootId: root.id };
}

function collectDescendants(nodes: Record<string, FsNode>, id: string): string[] {
  const ids: string[] = [];
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.pop()!;
    ids.push(current);
    for (const node of Object.values(nodes)) {
      if (node.parentId === current) {
        queue.push(node.id);
      }
    }
  }
  return ids;
}

export const useFileSystemStore = create<FsState>()(
  persist(
    (set, get) => ({
      ...buildSeed(),

      getChildren: (parentId: string) => {
        const { nodes } = get();
        return Object.values(nodes)
          .filter((n) => n.parentId === parentId)
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          });
      },

      getNode: (id: string) => get().nodes[id],

      createNode: (parentId: string, name: string, type: NodeType, content?: string) => {
        const node = makeNode(name, type, parentId, content);
        set((state) => ({
          nodes: { ...state.nodes, [node.id]: node },
        }));
        return node.id;
      },

      renameNode: (id: string, newName: string) => {
        set((state) => {
          const existing = state.nodes[id];
          if (!existing) return state;
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...existing, name: newName, updatedAt: Date.now() },
            },
          };
        });
      },

      deleteNode: (id: string) => {
        set((state) => {
          if (id === state.rootId) return state;
          const idsToRemove = collectDescendants(state.nodes, id);
          const next = { ...state.nodes };
          for (const removeId of idsToRemove) {
            delete next[removeId];
          }
          return { nodes: next };
        });
      },

      updateContent: (id: string, content: string) => {
        set((state) => {
          const existing = state.nodes[id];
          if (!existing) return state;
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...existing, content, updatedAt: Date.now() },
            },
          };
        });
      },

      moveNode: (id: string, newParentId: string) => {
        set((state) => {
          const existing = state.nodes[id];
          if (!existing || id === state.rootId) return state;
          return {
            nodes: {
              ...state.nodes,
              [id]: { ...existing, parentId: newParentId, updatedAt: Date.now() },
            },
          };
        });
      },

      getPath: (id: string) => {
        const { nodes, rootId } = get();
        const parts: string[] = [];
        let current = nodes[id];
        while (current && current.id !== rootId) {
          parts.unshift(current.name);
          current = current.parentId ? nodes[current.parentId] : undefined!;
        }
        return "/" + parts.join("/");
      },

      resetFileSystem: () => {
        set(buildSeed());
      },
    }),
    {
      name: "webos-filesystem",
      partialize: (state) => ({ nodes: state.nodes, rootId: state.rootId }),
    },
  ),
);
