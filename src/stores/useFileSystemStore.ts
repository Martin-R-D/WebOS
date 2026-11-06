import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FsNode, NodeType } from "../types";

export interface DeletedEntry {
  node: FsNode;
  originalParentId: string;
  originalPath: string;
  deletedAt: number;
}

interface FsState {
  nodes: Record<string, FsNode>;
  rootId: string;
  deletedNodes: Record<string, DeletedEntry>;
  getChildren: (parentId: string) => FsNode[];
  getNode: (id: string) => FsNode | undefined;
  searchNodes: (query: string) => FsNode[];
  createNode: (parentId: string, name: string, type: NodeType, content?: string) => string;
  renameNode: (id: string, newName: string) => void;
  deleteNode: (id: string) => void;
  updateContent: (id: string, content: string) => void;
  moveNode: (id: string, newParentId: string) => void;
  getPath: (id: string) => string;
  resetFileSystem: () => void;
  restoreNode: (id: string) => void;
  permanentlyDelete: (id: string) => void;
  emptyRecycleBin: () => void;
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

const SYSTEM_APP_FILES: [string, string][] = [
  ["File Explorer.app", "file-explorer"],
  ["Text Editor.app", "text-editor"],
  ["Terminal.app", "terminal"],
  ["Calculator.app", "calculator"],
  ["Settings.app", "settings"],
  ["Browser.app", "browser"],
  ["About Me.app", "about-me"],
  ["Paint.app", "paint"],
  ["Clock.app", "clock"],
  ["Task Manager.app", "task-manager"],
  ["Sticky Notes.app", "sticky-notes"],
  ["Weather.app", "weather"],
  ["Calendar.app", "calendar"],
  ["Recycle Bin.app", "recycle-bin"],
];

function getPathFromNodes(nodes: Record<string, FsNode>, rootId: string, id: string): string {
  const parts: string[] = [];
  let current = nodes[id];
  while (current && current.id !== rootId) {
    parts.unshift(current.name);
    current = current.parentId ? nodes[current.parentId] : undefined!;
  }
  return "/" + parts.join("/");
}

function buildSeed(): { nodes: Record<string, FsNode>; rootId: string; deletedNodes: Record<string, DeletedEntry> } {
  const root = makeNode("/", "folder", null);
  const desktop = makeNode("Desktop", "folder", root.id);
  const documents = makeNode("Documents", "folder", root.id);
  const pictures = makeNode("Pictures", "folder", root.id);
  const systemApps = makeNode("System Apps", "folder", root.id);
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

  // System app shortcuts (.app files contain the appId)
  const appFiles = SYSTEM_APP_FILES.map(([name, content]) =>
    makeNode(name, "file", systemApps.id, content),
  );

  const all = [
    root, desktop, documents, pictures, systemApps, aboutMe, readme, todo,
    ...appFiles,
  ];
  const nodes: Record<string, FsNode> = {};
  for (const node of all) {
    nodes[node.id] = node;
  }
  return { nodes, rootId: root.id, deletedNodes: {} };
}

function hasSiblingName(nodes: Record<string, FsNode>, parentId: string, name: string, excludeId?: string): boolean {
  return Object.values(nodes).some(
    (n) => n.parentId === parentId && n.name === name && n.id !== excludeId,
  );
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

      searchNodes: (query: string) => {
        if (!query.trim()) return [];
        const { nodes, rootId } = get();
        const lower = query.toLowerCase();
        return Object.values(nodes)
          .filter((n) => n.id !== rootId && n.name.toLowerCase().includes(lower))
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          });
      },

      createNode: (parentId: string, name: string, type: NodeType, content?: string) => {
        const { nodes } = get();
        if (hasSiblingName(nodes, parentId, name)) return "";
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
          if (existing.parentId && hasSiblingName(state.nodes, existing.parentId, newName, id)) return state;
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
          const node = state.nodes[id];
          if (!node) return state;
          const now = Date.now();
          const idsToRemove = collectDescendants(state.nodes, id);
          const nextNodes = { ...state.nodes };
          const nextDeleted = { ...state.deletedNodes };
          for (const removeId of idsToRemove) {
            const n = nextNodes[removeId];
            if (n) {
              const originalPath = getPathFromNodes(state.nodes, state.rootId, removeId);
              nextDeleted[removeId] = {
                node: n,
                originalParentId: n.parentId ?? state.rootId,
                originalPath,
                deletedAt: now,
              };
              delete nextNodes[removeId];
            }
          }
          return { nodes: nextNodes, deletedNodes: nextDeleted };
        });
      },

      restoreNode: (id: string) => {
        set((state) => {
          const entry = state.deletedNodes[id];
          if (!entry) return state;
          // collect the top-level node and all its descendants in deletedNodes
          const toRestore: string[] = [id];
          const queue = [id];
          while (queue.length > 0) {
            const cur = queue.pop()!;
            for (const [did, dentry] of Object.entries(state.deletedNodes)) {
              if (dentry.node.parentId === cur && did !== id) {
                toRestore.push(did);
                queue.push(did);
              }
            }
          }
          const nextNodes = { ...state.nodes };
          const nextDeleted = { ...state.deletedNodes };
          for (const rid of toRestore) {
            const e = nextDeleted[rid];
            if (!e) continue;
            const parentId = nextNodes[e.originalParentId] ? e.originalParentId : state.rootId;
            nextNodes[rid] = { ...e.node, parentId };
            delete nextDeleted[rid];
          }
          return { nodes: nextNodes, deletedNodes: nextDeleted };
        });
      },

      permanentlyDelete: (id: string) => {
        set((state) => {
          const nextDeleted = { ...state.deletedNodes };
          // remove node and all descendants in deletedNodes
          const toRemove: string[] = [id];
          const queue = [id];
          while (queue.length > 0) {
            const cur = queue.pop()!;
            for (const [did, dentry] of Object.entries(nextDeleted)) {
              if (dentry.node.parentId === cur && did !== id) {
                toRemove.push(did);
                queue.push(did);
              }
            }
          }
          for (const rid of toRemove) {
            delete nextDeleted[rid];
          }
          return { deletedNodes: nextDeleted };
        });
      },

      emptyRecycleBin: () => {
        set({ deletedNodes: {} });
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
          if (hasSiblingName(state.nodes, newParentId, existing.name, id)) return state;
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
        set({ ...buildSeed(), deletedNodes: {} });
      },
    }),
    {
      name: "webos-filesystem",
      version: 7,
      partialize: (state) => ({ nodes: state.nodes, rootId: state.rootId, deletedNodes: state.deletedNodes }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { nodes: Record<string, FsNode>; rootId: string; deletedNodes?: Record<string, DeletedEntry> };
        if (!state.deletedNodes) state.deletedNodes = {};
        if (version < 7) {
          // ensure the System Apps folder exists
          let sysFolder = Object.values(state.nodes).find(
            (n) => n.parentId === state.rootId && n.type === "folder" && n.name === "System Apps",
          );
          if (!sysFolder) {
            sysFolder = makeNode("System Apps", "folder", state.rootId);
            state.nodes[sysFolder.id] = sysFolder;
          }
          // add any app shortcuts that are missing
          for (const [name, content] of SYSTEM_APP_FILES) {
            const exists = Object.values(state.nodes).some(
              (n) => n.parentId === sysFolder!.id && n.name === name,
            );
            if (!exists) {
              const appNode = makeNode(name, "file", sysFolder.id, content);
              state.nodes[appNode.id] = appNode;
            }
          }
        }
        return state;
      },
    },
  ),
);
