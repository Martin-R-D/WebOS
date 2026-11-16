import type { ReactNode } from "react";
import { useRef } from "react";
import { SaveDialog } from "../../shell/SaveDialog/SaveDialog";
import { Modal } from "../../shell/Modal/Modal";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { openFsNode } from "../../lib/openNode";
import { decodeDocument, downloadDocument, officeKind } from "./documents";
import type { OfficeKind } from "./documents";
import type { useOfficeDocument } from "./useOfficeDocument";
import "./Office.css";

type DocumentState = ReturnType<typeof useOfficeDocument>;

export function OfficeFrame({
  kind,
  document: doc,
  children,
  extra,
}: {
  kind: OfficeKind;
  document: DocumentState;
  children: ReactNode;
  extra?: ReactNode;
}) {
  const importRef = useRef<HTMLInputElement>(null);
  return (
    <section className="office" aria-label={`${kind} document`}>
      <header className="office__toolbar">
        <strong>{doc.title}</strong>
        <span role="status">{doc.dirty ? "Unsaved changes" : "Saved"}</span>
        <button
          onClick={() => {
            const definition = useWindowStore
              .getState()
              .windows.find((win) => win.appId === kind);
            if (definition)
              useWindowStore.getState().openWindow({
                appId: definition.appId,
                title: "Untitled",
                icon: definition.icon,
                width: 900,
                height: 640,
              });
          }}
        >
          New
        </button>
        <button
          onClick={() => {
            useWindowStore.getState().openWindow({
              appId: "file-explorer",
              title: "Open document",
              icon: "Folder",
              width: 720,
              height: 480,
            });
          }}
        >
          Open
        </button>
        <button onClick={() => doc.save()}>Save</button>
        <button onClick={() => doc.setShowSave(true)}>Save As</button>
        <button onClick={() => downloadDocument(doc.title, doc.serialized)}>
          Download
        </button>
        <button onClick={() => importRef.current?.click()}>Import</button>
        {extra}
        <input
          hidden
          ref={importRef}
          type="file"
          accept={
            kind === "writer"
              ? ".wdoc"
              : kind === "slides"
                ? ".wslides"
                : ".wsheet"
          }
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 4_000_000)
                throw new Error("Import files must be smaller than 4 MB.");
              const raw = await file.text();
              decodeDocument(raw, kind);
              const fs = useFileSystemStore.getState();
              const id = fs.createNode(fs.rootId, file.name, "file", raw);
              if (!id)
                throw new Error(
                  "A file with this name already exists in the root folder.",
                );
              openFsNode(fs.getNode(id)!);
            } catch (cause) {
              doc.setError(
                cause instanceof Error ? cause.message : "Import failed.",
              );
            }
            if (importRef.current) importRef.current.value = "";
          }}
        />
      </header>
      {doc.error && (
        <div className="office__error" role="alert">
          {doc.error}
          <button onClick={() => doc.setError("")}>Dismiss</button>
        </div>
      )}
      {children}
      {doc.showSave && (
        <SaveDialog
          initialName={doc.title}
          onSave={(folder, name, overwrite) => {
            if (officeKind(name) && officeKind(name) !== kind) {
              doc.setError("Choose an extension for this app.");
              return;
            }
            doc.save(folder, name, overwrite);
          }}
          onCancel={doc.cancelSave}
        />
      )}
      {doc.closing && (
        <Modal
          className="office__dialog"
          label="Unsaved document"
          onClose={() => doc.setClosing(false)}
        >
          <p>Save changes to {doc.title} before closing?</p>
          <button onClick={doc.saveAndClose}>Save</button>
          <button onClick={doc.discardAndClose}>Discard</button>
          <button onClick={() => doc.setClosing(false)}>Cancel</button>
        </Modal>
      )}
      {doc.drafts.length > 0 && (
        <Modal
          className="office__dialog"
          label="Recover document"
          onClose={doc.discardDrafts}
        >
          <p>Recover unfinished work?</p>
          {doc.drafts.map((draft) => (
            <button key={draft.key} onClick={() => doc.recover(draft.key)}>
              Recover {draft.name}
            </button>
          ))}
          <button onClick={doc.discardDrafts}>Discard drafts</button>
        </Modal>
      )}
    </section>
  );
}
