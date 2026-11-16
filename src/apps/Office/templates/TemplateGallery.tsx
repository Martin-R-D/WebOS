import { useState } from "react";
import { Modal } from "../../../shell/Modal/Modal";
import { useWindowStore } from "../../../stores/useWindowStore";
import type { OfficeKind } from "../documents";
import { officeTemplates } from "./catalog";
import "./TemplateGallery.css";

export function TemplateGallery({
  kind,
  onClose,
}: {
  kind: OfficeKind;
  onClose: () => void;
}) {
  const templates = officeTemplates.filter(
    (template) => template.kind === kind,
  );
  const [selectedId, setSelectedId] = useState(templates[0].id);
  const selected = templates.find((template) => template.id === selectedId)!;

  function create() {
    const current = useWindowStore
      .getState()
      .windows.find((window) => window.appId === kind);
    if (!current) return;
    useWindowStore.getState().openWindow({
      appId: current.appId,
      title: selected.name,
      icon: current.icon,
      width: current.width,
      height: current.height,
      launchProps: { templateContent: selected.create() },
    });
    onClose();
  }

  return (
    <Modal
      className="office__dialog templates"
      label="Office templates"
      onClose={onClose}
    >
      <h2>Choose a template</h2>
      <div className="templates__choices">
        {templates.map((template) => (
          <button
            key={template.id}
            aria-pressed={template.id === selectedId}
            onClick={() => setSelectedId(template.id)}
          >
            {template.name}
          </button>
        ))}
      </div>
      <article className="templates__preview" aria-label="Template preview">
        <h3>{selected.name}</h3>
        <p>{selected.description}</p>
        {selected.preview.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <small>
          Sample content can be edited. A new unsaved document will open.
        </small>
      </article>
      <button onClick={create}>Create document</button>
      <button onClick={onClose}>Cancel</button>
    </Modal>
  );
}
