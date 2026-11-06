import { Trash2, Trash, RotateCcw, X, FileText, Folder } from "lucide-react";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import type { AppProps } from "../../types";
import "./RecycleBin.css";

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}

export function RecycleBin({}: AppProps) {
  const deletedNodes = useFileSystemStore((s) => s.deletedNodes);
  const restoreNode = useFileSystemStore((s) => s.restoreNode);
  const permanentlyDelete = useFileSystemStore((s) => s.permanentlyDelete);
  const emptyRecycleBin = useFileSystemStore((s) => s.emptyRecycleBin);

  // Show only top-level deleted items (not descendants of other deleted items)
  const topLevel = Object.entries(deletedNodes).filter(
    ([id]) => !Object.keys(deletedNodes).some(
      (otherId) => otherId !== id && deletedNodes[otherId]?.node.id === deletedNodes[id].node.parentId,
    ),
  );

  const isEmpty = topLevel.length === 0;

  function handleRestoreAll() {
    for (const [id] of topLevel) {
      restoreNode(id);
    }
  }

  return (
    <div className="rb">
      <div className="rb__toolbar">
        <button
          className="rb__btn rb__btn--danger"
          disabled={isEmpty}
          onClick={emptyRecycleBin}
        >
          <Trash size={14} />
          Empty Recycle Bin
        </button>
        <button
          className="rb__btn"
          disabled={isEmpty}
          onClick={handleRestoreAll}
        >
          <RotateCcw size={14} />
          Restore All
        </button>
      </div>

      {isEmpty ? (
        <div className="rb__empty">
          <Trash2 size={48} className="rb__empty-icon" />
          <span>Recycle Bin is empty</span>
        </div>
      ) : (
        <div className="rb__list">
          <div className="rb__list-header">
            <span className="rb__col-name">Name</span>
            <span className="rb__col-path">Original Location</span>
            <span className="rb__col-time">Deleted</span>
            <span className="rb__col-actions" />
          </div>
          {topLevel
            .sort(([, a], [, b]) => b.deletedAt - a.deletedAt)
            .map(([id, entry]) => {
              const Icon = entry.node.type === "folder" ? Folder : FileText;
              return (
                <div key={id} className="rb__row">
                  <span className="rb__col-name">
                    <Icon size={16} className="rb__row-icon" />
                    {entry.node.name}
                  </span>
                  <span className="rb__col-path" title={entry.originalPath}>
                    {entry.originalPath}
                  </span>
                  <span className="rb__col-time">{formatTimeAgo(entry.deletedAt)}</span>
                  <span className="rb__col-actions">
                    <button
                      className="rb__action-btn"
                      title="Restore"
                      onClick={() => restoreNode(id)}
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      className="rb__action-btn rb__action-btn--danger"
                      title="Delete Permanently"
                      onClick={() => permanentlyDelete(id)}
                    >
                      <X size={14} />
                    </button>
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
