import { useState, useEffect, useRef } from "react";
import { Folder, FileText, ChevronRight, X, AlertTriangle } from "lucide-react";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import "./SaveDialog.css";

interface SaveDialogProps {
  initialName: string;
  initialFolderId?: string;
  onSave: (folderId: string, fileName: string, overwriteId?: string) => void;
  onCancel: () => void;
}

export function SaveDialog({ initialName, initialFolderId, onSave, onCancel }: SaveDialogProps) {
  const rootId = useFileSystemStore((s) => s.rootId);
  const getChildren = useFileSystemStore((s) => s.getChildren);
  const getNode = useFileSystemStore((s) => s.getNode);

  const [folderId, setFolderId] = useState(initialFolderId ?? rootId);
  const [fileName, setFileName] = useState(initialName);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [folderConflict, setFolderConflict] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const children = getChildren(folderId);

  function buildBreadcrumbs(): { id: string; name: string }[] {
    const crumbs: { id: string; name: string }[] = [];
    let current = getNode(folderId);
    while (current) {
      crumbs.unshift({ id: current.id, name: current.id === rootId ? "/" : current.name });
      current = current.parentId ? getNode(current.parentId) : undefined;
    }
    return crumbs;
  }

  function handleItemDoubleClick(id: string) {
    const node = getNode(id);
    if (node?.type === "folder") {
      setFolderId(id);
    } else if (node) {
      setFileName(node.name);
    }
  }

  function handleSave() {
    const trimmed = fileName.trim();
    if (!trimmed) return;

    // a folder with this name can't be overwritten by a file
    if (children.some((n) => n.name === trimmed && n.type === "folder")) {
      setFolderConflict(true);
      return;
    }

    const existing = children.find(
      (n) => n.name === trimmed && n.type === "file",
    );
    if (existing) {
      setConflictId(existing.id);
      return;
    }

    onSave(folderId, trimmed);
  }

  function handleOverwrite() {
    if (!conflictId) return;
    onSave(folderId, fileName.trim(), conflictId);
    setConflictId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  }

  const crumbs = buildBreadcrumbs();

  return (
    <div className="save-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="save-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <div className="save-dialog__header">
          Save As
          <button className="save-dialog__close" onClick={onCancel}>
            <X size={14} />
          </button>
        </div>

        <div className="save-dialog__path">
          {crumbs.map((c, i) => (
            <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              {i > 0 && <ChevronRight size={12} className="save-dialog__path-sep" />}
              <span className="save-dialog__path-seg" onClick={() => setFolderId(c.id)}>
                {c.name}
              </span>
            </span>
          ))}
        </div>

        <div className="save-dialog__body">
          {folderId !== rootId && (
            <div
              className="save-dialog__item save-dialog__item--folder"
              onDoubleClick={() => {
                const parent = getNode(folderId)?.parentId;
                if (parent) setFolderId(parent);
              }}
            >
              <Folder size={16} /> ..
            </div>
          )}
          {children.map((node) => (
            <div
              key={node.id}
              className={`save-dialog__item save-dialog__item--${node.type}`}
              onDoubleClick={() => handleItemDoubleClick(node.id)}
              onClick={() => { if (node.type === "file") setFileName(node.name); }}
            >
              {node.type === "folder" ? <Folder size={16} /> : <FileText size={16} />}
              {node.name}
            </div>
          ))}
          {children.length === 0 && (
            <div className="save-dialog__empty">Empty folder</div>
          )}
        </div>

        <div className="save-dialog__footer">
          <span className="save-dialog__label">Name:</span>
          <input
            ref={inputRef}
            className="save-dialog__input"
            value={fileName}
            onChange={(e) => { setFileName(e.target.value); setFolderConflict(false); }}
            onKeyDown={handleKeyDown}
          />
          {folderConflict && (
            <span className="save-dialog__folder-error">A folder with this name exists here</span>
          )}
          <div className="save-dialog__actions">
            <button className="save-dialog__btn save-dialog__btn--cancel" onClick={onCancel}>
              Cancel
            </button>
            <button className="save-dialog__btn save-dialog__btn--save" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>

      {conflictId && (
        <div className="save-confirm-overlay">
          <div className="save-confirm">
            <AlertTriangle size={28} className="save-confirm__icon" />
            <div className="save-confirm__title">File already exists</div>
            <div className="save-confirm__msg">
              <strong>{fileName.trim()}</strong> already exists in this folder. Do you want to overwrite it?
            </div>
            <div className="save-confirm__actions">
              <button
                className="save-dialog__btn save-dialog__btn--cancel"
                onClick={() => setConflictId(null)}
              >
                No
              </button>
              <button
                className="save-dialog__btn save-dialog__btn--overwrite"
                onClick={handleOverwrite}
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
