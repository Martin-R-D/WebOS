import { useState } from "react";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { fileProperties } from "../../lib/fileProperties";
import { isProtectedNode } from "../../lib/fsGuards";
import { Modal } from "../Modal/Modal";
import "./FileDialogs.css";
import "./PropertiesDialog.css";

export function PropertiesDialog({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const rootId = useFileSystemStore((state) => state.rootId);
  const node = nodes[nodeId];
  const properties = fileProperties(nodes, nodeId);
  const [message, setMessage] = useState("");

  async function copyPath() {
    if (!properties) return;
    try {
      await navigator.clipboard.writeText(properties.path);
      setMessage("Path copied");
    } catch {
      setMessage("Could not copy. Select the path to copy it manually.");
    }
  }

  return (
    <Modal className="fd-overlay" label="Properties" onClose={onClose}>
      <section
        className="fd-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="fd-header">Properties</header>
        <div className="fd-content">
          {node && properties ? (
            <>
              <dl className="properties">
                <dt>Name</dt>
                <dd>{node.name}</dd>
                <dt>Type</dt>
                <dd>
                  {node.type === "folder"
                    ? "Folder"
                    : node.name.endsWith(".app")
                      ? "Application shortcut"
                      : `${node.name.includes(".") ? node.name.split(".").pop()?.toUpperCase() : "Plain"} file`}
                </dd>
                <dt>Location</dt>
                <dd>{properties.path}</dd>
                <dt>Content size</dt>
                <dd>{properties.bytes.toLocaleString()} bytes</dd>
                {node.type === "folder" && (
                  <>
                    <dt>Contains</dt>
                    <dd>
                      {properties.files} files, {properties.folders} folders
                    </dd>
                  </>
                )}
                <dt>Created</dt>
                <dd>{new Date(node.createdAt).toLocaleString()}</dd>
                <dt>Modified</dt>
                <dd>{new Date(node.updatedAt).toLocaleString()}</dd>
                <dt>Protected item</dt>
                <dd>{isProtectedNode(node, rootId) ? "Yes" : "No"}</dd>
              </dl>
              <p>
                Information reflects saved content. Content size excludes
                browser storage overhead.
              </p>
              <button className="fd-btn" onClick={copyPath}>
                Copy path
              </button>
            </>
          ) : (
            <p>This item is no longer available.</p>
          )}
          <p role="status">{message}</p>
        </div>
        <footer className="fd-footer">
          <button className="fd-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </Modal>
  );
}
