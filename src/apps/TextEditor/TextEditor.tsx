import { useState, useEffect } from "react";
import { Save, SaveAll } from "lucide-react";
import type { AppProps } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { SaveDialog } from "../../shell/SaveDialog/SaveDialog";
import "./TextEditor.css";

export function TextEditor({ windowId, launchProps }: AppProps) {
  const getNode = useFileSystemStore((s) => s.getNode);
  const updateContent = useFileSystemStore((s) => s.updateContent);
  const createNode = useFileSystemStore((s) => s.createNode);
  const setTitle = useWindowStore((s) => s.setTitle);

  const initialFileId = (launchProps?.fileId as string) ?? null;
  const [fileId, setFileId] = useState<string | null>(initialFileId);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("Untitled.txt");
  const [dirty, setDirty] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);

  useEffect(() => {
    if (initialFileId) {
      const node = getNode(initialFileId);
      if (node) {
        setText(node.content ?? "");
        setFileName(node.name);
        setFileId(node.id);
      }
    }
  }, []);

  useEffect(() => {
    setTitle(windowId, dirty ? `${fileName} •` : fileName);
  }, [fileName, dirty, windowId]);

  function handleSave() {
    if (fileId) {
      updateContent(fileId, text);
      setDirty(false);
    } else {
      setShowSaveAs(true);
    }
  }

  function handleSaveAs() {
    setShowSaveAs(true);
  }

  function handleSaveDialogConfirm(folderId: string, name: string, overwriteId?: string) {
    if (overwriteId) {
      updateContent(overwriteId, text);
      setFileId(overwriteId);
      setFileName(name);
      setDirty(false);
      setShowSaveAs(false);
      return;
    }

    if (fileId) {
      const node = getNode(fileId);
      if (node && node.parentId === folderId && node.name === name) {
        updateContent(fileId, text);
        setDirty(false);
        setShowSaveAs(false);
        return;
      }
    }

    const newId = createNode(folderId, name, "file", text);
    if (!newId) return; // name collision (e.g. a folder with this name) — keep dialog open
    setFileId(newId);
    setFileName(name);
    setDirty(false);
    setShowSaveAs(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    setDirty(true);
  }

  const currentParentId = fileId ? getNode(fileId)?.parentId : undefined;

  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;

  return (
    <div className="editor">
      <div className="editor__toolbar">
        <button className="editor__btn" onClick={handleSave} title="Save">
          <Save size={14} />
          Save
        </button>
        <button className="editor__btn" onClick={handleSaveAs} title="Save As…">
          <SaveAll size={14} />
          Save As
        </button>
        <div className="spacer" />
        <span className="editor__count">
          {words} words · {chars} chars
        </span>
      </div>
      <textarea
        className="editor__area"
        value={text}
        onChange={handleChange}
        spellCheck={false}
      />
      {showSaveAs && (
        <SaveDialog
          initialName={fileName}
          initialFolderId={currentParentId ?? undefined}
          onSave={handleSaveDialogConfirm}
          onCancel={() => setShowSaveAs(false)}
        />
      )}
    </div>
  );
}
