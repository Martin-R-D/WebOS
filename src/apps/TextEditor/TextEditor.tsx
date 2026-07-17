import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import type { AppProps } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import "./TextEditor.css";

export function TextEditor({ windowId, launchProps }: AppProps) {
  const getNode = useFileSystemStore((s) => s.getNode);
  const updateContent = useFileSystemStore((s) => s.updateContent);
  const createNode = useFileSystemStore((s) => s.createNode);
  const rootId = useFileSystemStore((s) => s.rootId);
  const setTitle = useWindowStore((s) => s.setTitle);

  const initialFileId = (launchProps?.fileId as string) ?? null;
  const [fileId, setFileId] = useState<string | null>(initialFileId);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("Untitled.txt");
  const [dirty, setDirty] = useState(false);

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
    } else {
      const name = window.prompt("File name:", "Untitled.txt");
      if (!name) return;
      const newId = createNode(rootId, name, "file", text);
      setFileId(newId);
      setFileName(name);
    }
    setDirty(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    setDirty(true);
  }

  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;

  return (
    <div className="editor">
      <div className="editor__toolbar">
        <button className="editor__btn" onClick={handleSave}>
          <Save size={14} />
          Save
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
    </div>
  );
}
