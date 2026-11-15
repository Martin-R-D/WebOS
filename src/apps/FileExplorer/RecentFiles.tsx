import { useEffect, useState } from "react";
import { useRecentFilesStore } from "../../stores/useRecentFilesStore";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { isImageFile, openFsNode } from "../../lib/openNode";
import { Modal } from "../../shell/Modal/Modal";

export function RecentFiles() {
  const entries = useRecentFilesStore((state) => state.entries);
  const remove = useRecentFilesStore((state) => state.remove);
  const clear = useRecentFilesStore((state) => state.clear);
  const nodes = useFileSystemStore((state) => state.nodes);
  const getPath = useFileSystemStore((state) => state.getPath);
  const [confirm, setConfirm] = useState(false);
  const visible = entries.filter(
    (entry) =>
      nodes[entry.fileId]?.type === "file" &&
      !nodes[entry.fileId].name.endsWith(".app"),
  );

  useEffect(() => {
    const missing = entries
      .filter(
        (entry) =>
          !nodes[entry.fileId] ||
          nodes[entry.fileId].type !== "file" ||
          nodes[entry.fileId].name.endsWith(".app"),
      )
      .map((entry) => entry.fileId);
    if (missing.length) remove(missing);
  }, [entries, nodes, remove]);

  return (
    <section className="recent-files" aria-label="Recent files">
      <header>
        <h2>Recent files</h2>
        {visible.length > 0 && (
          <button className="fd-btn" onClick={() => setConfirm(true)}>
            Clear recent files
          </button>
        )}
      </header>
      {visible.length === 0 && (
        <p>No recent files yet. Open or save a document to see it here.</p>
      )}
      {visible.map((entry) => {
        const node = nodes[entry.fileId];
        return (
          <div className="recent-files__row" key={node.id}>
            <button
              className="recent-files__open"
              onClick={() => openFsNode(node)}
            >
              <strong>
                {isImageFile(node.name) ? "▧ " : "▤ "}
                {node.name}
              </strong>
              <span>{getPath(node.id)}</span>
              <small>
                Last opened {new Date(entry.accessedAt).toLocaleString()}
              </small>
            </button>
            <button
              className="fd-btn"
              aria-label={`Remove ${node.name} from recent`}
              onClick={() => remove([node.id])}
            >
              Remove
            </button>
          </div>
        );
      })}
      {confirm && (
        <Modal
          className="fd-overlay"
          label="Clear recent files"
          onClose={() => setConfirm(false)}
        >
          <div
            className="fd-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fd-content">
              <p>Clear recent file history? Your files will be kept.</p>
              <button
                className="fd-btn"
                onClick={() => {
                  clear();
                  setConfirm(false);
                }}
              >
                Confirm clear
              </button>
              <button className="fd-btn" onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
