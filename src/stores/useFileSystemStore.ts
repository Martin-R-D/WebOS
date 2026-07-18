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
  const appFileExplorer = makeNode("File Explorer.app", "file", systemApps.id, "file-explorer");
  const appTextEditor = makeNode("Text Editor.app", "file", systemApps.id, "text-editor");
  const appTerminal = makeNode("Terminal.app", "file", systemApps.id, "terminal");
  const appCalculator = makeNode("Calculator.app", "file", systemApps.id, "calculator");
  const appSettings = makeNode("Settings.app", "file", systemApps.id, "settings");
  const appBrowser = makeNode("Browser.app", "file", systemApps.id, "browser");
  const appAboutMe = makeNode("About Me.app", "file", systemApps.id, "about-me");

  const all = [
    root, desktop, documents, pictures, systemApps, aboutMe, readme, todo,
    appFileExplorer, appTextEditor, appTerminal, appCalculator, appSettings, appBrowser, appAboutMe,
  ];
  const nodes: Record<string, FsNode> = {};
  for (const node of all) {
    nodes[node.id] = node;
  }
  return { nodes, rootId: root.id };
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
        set(buildSeed());
      },
    }),
    {
      name: "webos-filesystem",
      version: 2,
      partialize: (state) => ({ nodes: state.nodes, rootId: state.rootId }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { nodes: Record<string, FsNode>; rootId: string };
        if (version < 2) {
          const hasSystemApps = Object.values(state.nodes).some(
            (n) => n.parentId === state.rootId && n.name === "System Apps",
          );
          if (!hasSystemApps) {
            const sysFolder = makeNode("System Apps", "folder", state.rootId);
            const apps: [string, string][] = [
              ["File Explorer.app", "file-explorer"],
              ["Text Editor.app", "text-editor"],
              ["Terminal.app", "terminal"],
              ["Calculator.app", "calculator"],
              ["Settings.app", "settings"],
              ["Browser.app", "browser"],
              ["About Me.app", "about-me"],
            ];
            state.nodes[sysFolder.id] = sysFolder;
            for (const [name, content] of apps) {
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
