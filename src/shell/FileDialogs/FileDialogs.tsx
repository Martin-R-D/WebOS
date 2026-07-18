import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Folder, ChevronRight, CornerRightUp, FolderInput } from "lucide-react";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { isSelfOrDescendant } from "../../lib/fsGuards";
import type { FsNode } from "../../types";
import "./FileDialogs.css";

/* ---------------- Rename ---------------- */

interface RenameDialogProps {
  node: FsNode;
  onRename: (name: string) => void;
  onCancel: () => void;
}

export function RenameDialog({ node, onRename, onCancel }: RenameDialogProps) {
  const getChildren = useFileSystemStore((s) => s.getChildren);
  const [name, setName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const dot = node.name.lastIndexOf(".");
    inputRef.current?.setSelectionRange(0, dot > 0 ? dot : node.name.length);
  }, []);

  const trimmed = name.trim();
  const siblings = node.parentId ? getChildren(node.parentId) : [];
  const duplicate = siblings.some((n) => n.id !== node.id && n.name === trimmed);
  const invalid = trimmed === "" || duplicate;

  function submit() {
    if (invalid || trimmed === node.name) {
      onCancel();
      return;
    }
    onRename(trimmed);
  }

  return (
    <div className="fd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="fd-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fd-header">
          Rename
          <button className="fd-close" onClick={onCancel}><X size={14} /></button>
        </div>
        <div className="fd-content">
          <span className="fd-label">New name</span>
          <input
            ref={inputRef}
            className="fd-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onCancel();
            }}
          />
          <span className="fd-error">
            {duplicate ? "A file or folder with this name already exists." : ""}
          </span>
        </div>
        <div className="fd-footer">
          <div className="fd-actions">
            <button className="fd-btn fd-btn--cancel" onClick={onCancel}>Cancel</button>
            <button className="fd-btn fd-btn--primary" onClick={submit} disabled={invalid}>
              Rename
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Delete confirm ---------------- */

interface ConfirmDeleteDialogProps {
  node: FsNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({ node, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  return (
    <div className="fd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="fd-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fd-header">
          Delete
          <button className="fd-close" onClick={onCancel}><X size={14} /></button>
        </div>
        <div className="fd-content fd-content--center">
          <AlertTriangle size={28} className="fd-icon-danger" />
          <div className="fd-msg">
            Are you sure you want to delete <strong>{node.name}</strong>
            {node.type === "folder" ? " and everything inside it?" : "?"}
            <br />This can't be undone.
          </div>
        </div>
        <div className="fd-footer">
          <div className="fd-actions">
            <button className="fd-btn fd-btn--cancel" onClick={onCancel}>Cancel</button>
            <button className="fd-btn fd-btn--danger" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Move to (folder picker) ---------------- */

interface MoveDialogProps {
  node: FsNode;
  onMove: (destFolderId: string) => void;
  onCancel: () => void;
}

export function MoveDialog({ node, onMove, onCancel }: MoveDialogProps) {
  const rootId = useFileSystemStore((s) => s.rootId);
  const nodes = useFileSystemStore((s) => s.nodes);
  const getChildren = useFileSystemStore((s) => s.getChildren);
  const getNode = useFileSystemStore((s) => s.getNode);

  const [folderId, setFolderId] = useState(rootId);
  const [error, setError] = useState("");

  const folders = getChildren(folderId).filter((n) => n.type === "folder");

  function buildBreadcrumbs(): { id: string; name: string }[] {
    const crumbs: { id: string; name: string }[] = [];
    let current = getNode(folderId);
    while (current) {
      crumbs.unshift({ id: current.id, name: current.id === rootId ? "/" : current.name });
      current = current.parentId ? getNode(current.parentId) : undefined;
    }
    return crumbs;
  }

  // Can this folder be entered as a move target? Not into the node's own subtree.
  function blocked(folder: FsNode): boolean {
    return node.type === "folder" && isSelfOrDescendant(nodes, node.id, folder.id);
  }

  const alreadyHere = folderId === node.parentId;
  const intoSelf = node.type === "folder" && isSelfOrDescendant(nodes, node.id, folderId);
  const destName = folderId === rootId ? "/" : getNode(folderId)?.name ?? "";

  function confirmMove() {
    if (alreadyHere || intoSelf) return;
    const dupe = getChildren(folderId).some((n) => n.name === node.name);
    if (dupe) {
      setError(`"${node.name}" already exists here.`);
      return;
    }
    onMove(folderId);
  }

  return (
    <div className="fd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="fd-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fd-header">
          Move "{node.name}"
          <button className="fd-close" onClick={onCancel}><X size={14} /></button>
        </div>

        <div className="fd-path">
          {buildBreadcrumbs().map((c, i) => (
            <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              {i > 0 && <ChevronRight size={12} className="fd-path-sep" />}
              <span className="fd-path-seg" onClick={() => { setFolderId(c.id); setError(""); }}>
                {c.name}
              </span>
            </span>
          ))}
        </div>

        <div className="fd-list">
          {folderId !== rootId && (
            <button
              className="fd-item"
              onClick={() => {
                const parent = getNode(folderId)?.parentId;
                if (parent) { setFolderId(parent); setError(""); }
              }}
            >
              <CornerRightUp size={16} /> ..
            </button>
          )}
          {folders.map((f) => (
            <button
              key={f.id}
              className="fd-item"
              disabled={blocked(f)}
              onClick={() => { setFolderId(f.id); setError(""); }}
            >
              <Folder size={16} /> {f.name}
            </button>
          ))}
          {folders.length === 0 && <div className="fd-empty">No subfolders</div>}
        </div>

        <div className="fd-footer">
          <span className="fd-label" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {error
              ? <span style={{ color: "var(--color-danger)" }}>{error}</span>
              : alreadyHere ? "Already in this folder"
              : `Destination: ${destName}`}
          </span>
          <div className="fd-actions">
            <button className="fd-btn fd-btn--cancel" onClick={onCancel}>Cancel</button>
            <button
              className="fd-btn fd-btn--primary"
              onClick={confirmMove}
              disabled={alreadyHere || intoSelf}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FolderInput size={14} /> Move Here
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
