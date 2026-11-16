import { AppHeading } from "../shared/AppHeading";
import { PanelsTopLeft } from "lucide-react";
import { useRef, useState } from "react";
import type { AppProps } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useRecentFilesStore } from "../../stores/useRecentFilesStore";
import { openFsNode } from "../../lib/openNode";
import { filePath } from "../../lib/fileProperties";
import { officeKind } from "./documents";
import type { OfficeKind } from "./documents";
import { officeFiles } from "./officeFiles";
import { launchOffice } from "./launchOffice";
import { importOfficeFile } from "./importOffice";
import { TemplateGallery } from "./templates/TemplateGallery";
import "./OfficeHub.css";

export function OfficeHub(_props: AppProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const entries = useRecentFilesStore((state) => state.entries);
  const [kind, setKind] = useState<OfficeKind | "all">("all");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState(true);
  const [templateKind, setTemplateKind] = useState<OfficeKind | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const documents = officeFiles(nodes, entries, kind, query, recent);
  const names = { writer: "Writer", slides: "Slides", sheets: "Sheets" };

  return (
    <section className="office-hub app-design" aria-label="Office">
      <AppHeading
        icon={PanelsTopLeft}
        title="Office"
        subtitle="A PLACE FOR YOUR IDEAS"
      />

      <div className="office-hub__create">
        {(["writer", "slides", "sheets"] as const).map((kind) => (
          <article key={kind}>
            <h2>{names[kind]}</h2>
            <button onClick={() => launchOffice(kind)}>
              New {names[kind]} document
            </button>
            <button onClick={() => setTemplateKind(kind)}>
              {names[kind]} templates
            </button>
          </article>
        ))}
      </div>
      <div className="office-hub__tools">
        <button aria-pressed={recent} onClick={() => setRecent(true)}>
          Recent documents
        </button>
        <button aria-pressed={!recent} onClick={() => setRecent(false)}>
          All Office files
        </button>
        <input
          aria-label="Search Office filenames"
          placeholder="Search filenames…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Office file type"
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as OfficeKind | "all")
          }
        >
          <option value="all">All types</option>
          {Object.entries(names).map(([kind, name]) => (
            <option key={kind} value={kind}>
              {name}
            </option>
          ))}
        </select>
        <button onClick={() => input.current?.click()}>
          Import Office file
        </button>
      </div>
      {error && (
        <p role="alert">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </p>
      )}
      {!documents.length && (
        <p>
          No matching Office documents. Create a document, choose a template or
          import a native file.
        </p>
      )}
      <ul className="office-hub__files">
        {documents.map((node) => {
          const accessed = entries.find(
            (entry) => entry.fileId === node.id,
          )?.accessedAt;
          return (
            <li key={node.id}>
              <button
                className="office-hub__open"
                onClick={() => openFsNode(node)}
              >
                <strong>{node.name}</strong>
                <span>
                  {names[officeKind(node.name)!]} · {filePath(nodes, node.id)}
                </span>
                <small>
                  {accessed
                    ? `Last opened ${new Date(accessed).toLocaleString()}`
                    : "Not in recent history"}
                </small>
              </button>
              <button
                aria-label={`Open location for ${node.name}`}
                onClick={() => {
                  const parent = node.parentId
                    ? nodes[node.parentId]
                    : undefined;
                  if (parent) openFsNode(parent);
                }}
              >
                Open Location
              </button>
            </li>
          );
        })}
      </ul>
      <input
        hidden
        ref={input}
        type="file"
        accept=".wdoc,.wslides,.wsheet"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            await importOfficeFile(file);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Import failed.");
          }
          if (input.current) input.current.value = "";
        }}
      />
      {templateKind && (
        <TemplateGallery
          kind={templateKind}
          onClose={() => setTemplateKind(null)}
        />
      )}
    </section>
  );
}
