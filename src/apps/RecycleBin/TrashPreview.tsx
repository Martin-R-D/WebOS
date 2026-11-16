import { useState } from "react";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { contentBytes, filePath } from "../../lib/fileProperties";
import { isImageFile } from "../../lib/openNode";
import { Modal } from "../../shell/Modal/Modal";
import "../../shell/FileDialogs/FileDialogs.css";

export function TrashPreview({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { nodes, rootId, deletedNodes, restoreNode } = useFileSystemStore();
  const entry = deletedNodes[id];
  const [imageFailed, setImageFailed] = useState(false);

  if (!entry) return null;

  const { node } = entry;
  const parent = nodes[entry.originalParentId];
  const destination = parent?.type === "folder" ? parent.id : rootId;
  const conflict = Object.values(nodes).some(
    (item) => item.parentId === destination && item.name === node.name,
  );
  const image =
    isImageFile(node.name) &&
    /^data:image\/(png|jpeg|gif|webp|bmp);base64,/i.test(node.content ?? "");
  const text = /\.(txt|md|json|csv|log|css|html|js|ts|xml)$/i.test(node.name);

  return (
    <Modal
      className="fd-overlay"
      label="Deleted file preview"
      onClose={onClose}
    >
      <section
        className="fd-dialog rb__preview"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="fd-header">{node.name}</header>
        <div className="fd-content">
          <dl>
            <dt>Original location</dt>
            <dd>{entry.originalPath || "Unavailable"}</dd>
            <dt>Deleted</dt>
            <dd>
              {Number.isFinite(entry.deletedAt)
                ? new Date(entry.deletedAt).toLocaleString()
                : "Unavailable"}
            </dd>
            <dt>Type</dt>
            <dd>
              {node.type === "folder"
                ? "Folder"
                : node.name.split(".").pop()?.toUpperCase() + " file"}
            </dd>
            {node.type === "file" && (
              <>
                <dt>Content size</dt>
                <dd>{contentBytes(node.content).toLocaleString()} bytes</dd>
              </>
            )}
            <dt>Restore destination</dt>
            <dd>{filePath(nodes, destination) || "/"}</dd>
          </dl>
          {!parent && (
            <p>
              The original folder is unavailable. This item will be restored to
              Root.
            </p>
          )}
          {conflict && (
            <p>
              A file with this name exists. A numbered “restored” suffix will be
              added.
            </p>
          )}
          {image && !imageFailed ? (
            <img
              src={node.content}
              alt={node.name}
              onError={() => setImageFailed(true)}
            />
          ) : text && node.type === "file" ? (
            <>
              <pre>{(node.content ?? "").slice(0, 20000)}</pre>
              {(node.content?.length ?? 0) > 20000 && (
                <p>Showing the first 20,000 characters.</p>
              )}
            </>
          ) : (
            <p>Preview unavailable. Restore this item to open it.</p>
          )}
        </div>
        <footer className="fd-actions">
          <button className="fd-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="fd-btn"
            onClick={() => {
              restoreNode(id);
              onClose();
            }}
          >
            Restore
          </button>
        </footer>
      </section>
    </Modal>
  );
}
