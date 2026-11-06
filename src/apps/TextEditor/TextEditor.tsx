import { useState, useEffect, useRef, useCallback } from "react";
import { Save, SaveAll, Eye, EyeOff, Columns2, Bold, Italic, Strikethrough, Code, Heading, List, Settings2, ChevronUp, ChevronDown } from "lucide-react";
import { marked } from "marked";
import type { AppProps } from "../../types";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { useEditorSettingsStore } from "../../stores/useEditorSettingsStore";
import { SaveDialog } from "../../shell/SaveDialog/SaveDialog";
import "./TextEditor.css";

marked.setOptions({ async: false });

function buildHighlightedText(text: string, matches: number[], currentIndex: number, matchLen: number): React.ReactNode {
  if (!matches.length || !matchLen) return text;
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i];
    const end = start + matchLen;
    if (start > pos) nodes.push(text.slice(pos, start));
    nodes.push(
      <mark key={i} className={i === currentIndex ? "editor__mark--current" : "editor__mark"}>
        {text.slice(start, end)}
      </mark>
    );
    pos = end;
  }
  if (pos < text.length) nodes.push(text.slice(pos));
  return nodes;
}

export function TextEditor({ windowId, launchProps }: AppProps) {
  const getNode = useFileSystemStore((s) => s.getNode);
  const updateContent = useFileSystemStore((s) => s.updateContent);
  const createNode = useFileSystemStore((s) => s.createNode);
  const setTitle = useWindowStore((s) => s.setTitle);
  const { fontSize, fontFamily, lineWrap, setFontSize, setFontFamily, setLineWrap } = useEditorSettingsStore();

  const initialFileId = (launchProps?.fileId as string) ?? null;
  const [fileId, setFileId] = useState<string | null>(initialFileId);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("Untitled.txt");
  const [dirty, setDirty] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);

  // Preview mode: "edit" | "preview" | "split"
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");

  // Find & Replace state
  const [findOpen, setFindOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);

  // Settings popover
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Status bar
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

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

  // Recompute matches when find text or content changes
  useEffect(() => {
    if (!findText) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }
    const found: number[] = [];
    const lower = text.toLowerCase();
    const needle = findText.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf(needle, idx)) !== -1) {
      found.push(idx);
      idx += needle.length;
    }
    setMatches(found);
    setMatchIndex((prev) => (found.length ? Math.min(prev, found.length - 1) : 0));
  }, [findText, text]);


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
    if (!newId) return;
    setFileId(newId);
    setFileName(name);
    setDirty(false);
    setShowSaveAs(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    setDirty(true);
  }

  function updateCursorPos() {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const lines = ta.value.substring(0, pos).split("\n");
    setCursorLine(lines.length);
    setCursorCol(lines[lines.length - 1].length + 1);
  }

  // Find & Replace helpers
  function openFind() {
    setFindOpen(true);
    setReplaceOpen(false);
    setTimeout(() => findInputRef.current?.focus(), 0);
  }

  function openReplace() {
    setFindOpen(true);
    setReplaceOpen(true);
    setTimeout(() => findInputRef.current?.focus(), 0);
  }

  function closeFind() {
    setFindOpen(false);
    setReplaceOpen(false);
  }

  function goNext() {
    if (!matches.length) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    setTimeout(() => {
      if (!textareaRef.current) return;
      const start = matches[next];
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, start + findText.length);
    }, 0);
  }

  function goPrev() {
    if (!matches.length) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    setTimeout(() => {
      if (!textareaRef.current) return;
      const start = matches[prev];
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, start + findText.length);
    }, 0);
  }

  function replaceCurrent() {
    if (!matches.length) return;
    const start = matches[matchIndex];
    const end = start + findText.length;
    const newText = text.substring(0, start) + replaceText + text.substring(end);
    setText(newText);
    setDirty(true);
  }

  function replaceAll() {
    if (!findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const newText = text.replace(regex, replaceText);
    setText(newText);
    setDirty(true);
  }

  // Formatting helpers
  const wrapSelection = useCallback((before: string, after: string, placeholder = "text") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = text.substring(start, end);
    const insert = selected || placeholder;
    const newText = text.substring(0, start) + before + insert + after + text.substring(end);
    setText(newText);
    setDirty(true);
    setTimeout(() => {
      ta.focus();
      const newStart = start + before.length;
      const newEnd = newStart + insert.length;
      ta.setSelectionRange(newStart, newEnd);
    }, 0);
  }, [text]);

  const prependLine = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    setText(newText);
    setDirty(true);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [text]);

  function handleBold() {
    wrapSelection("**", "**", "bold text");
  }
  function handleItalic() {
    wrapSelection("*", "*", "italic text");
  }
  function handleStrikethrough() {
    wrapSelection("~~", "~~", "strikethrough");
  }
  function handleCode() {
    const ta = textareaRef.current;
    if (!ta) return;
    const selected = text.substring(ta.selectionStart, ta.selectionEnd);
    if (selected.includes("\n")) {
      wrapSelection("```\n", "\n```", "code");
    } else {
      wrapSelection("`", "`", "code");
    }
  }
  function handleHeading() {
    prependLine("# ");
  }
  function handleList() {
    prependLine("- ");
  }

  // Keyboard shortcuts on editor container
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey) {
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        openFind();
        return;
      }
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        openReplace();
        return;
      }
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        handleBold();
        return;
      }
      if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        handleItalic();
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSave();
        return;
      }
    }
    if (e.key === "Escape" && findOpen) {
      closeFind();
    }
  }

  const previewHtml = viewMode !== "edit" ? (marked.parse(text) as string) : "";

  const currentParentId = fileId ? getNode(fileId)?.parentId : undefined;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;

  const matchLabel =
    !findText ? "" :
    matches.length === 0 ? "No matches" :
    `${matchIndex + 1} of ${matches.length}`;

  const textareaStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily === "monospace" ? "var(--font-mono, monospace)" : "sans-serif",
    whiteSpace: lineWrap ? "pre-wrap" : "pre",
  };

  return (
    <div className="editor" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="editor__toolbar">
        <button className="editor__btn" onClick={handleSave} title="Save">
          <Save size={14} />
          Save
        </button>
        <button className="editor__btn" onClick={handleSaveAs} title="Save As…">
          <SaveAll size={14} />
          Save As
        </button>
        <div className="editor__sep" />
        <button className="editor__btn editor__btn--icon" onClick={handleBold} title="Bold (Ctrl+B)">
          <Bold size={14} />
        </button>
        <button className="editor__btn editor__btn--icon" onClick={handleItalic} title="Italic (Ctrl+I)">
          <Italic size={14} />
        </button>
        <button className="editor__btn editor__btn--icon" onClick={handleStrikethrough} title="Strikethrough">
          <Strikethrough size={14} />
        </button>
        <button className="editor__btn editor__btn--icon" onClick={handleCode} title="Code">
          <Code size={14} />
        </button>
        <button className="editor__btn editor__btn--icon" onClick={handleHeading} title="Heading">
          <Heading size={14} />
        </button>
        <button className="editor__btn editor__btn--icon" onClick={handleList} title="List">
          <List size={14} />
        </button>
        <div className="editor__sep" />
        <button
          className={`editor__btn editor__btn--icon${viewMode === "preview" ? " editor__btn--active" : ""}`}
          onClick={() => setViewMode(viewMode === "preview" ? "edit" : "preview")}
          title={viewMode === "preview" ? "Edit mode" : "Preview mode"}
        >
          {viewMode === "preview" ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          className={`editor__btn editor__btn--icon${viewMode === "split" ? " editor__btn--active" : ""}`}
          onClick={() => setViewMode(viewMode === "split" ? "edit" : "split")}
          title="Split view"
        >
          <Columns2 size={14} />
        </button>
        <div className="spacer" />
        <div className="editor__settings-wrap">
          <button
            className="editor__btn editor__btn--icon"
            onClick={() => setSettingsOpen((o) => !o)}
            title="Editor settings"
          >
            <Settings2 size={14} />
          </button>
          {settingsOpen && (
            <div className="editor__settings-panel">
              <div className="editor__settings-row">
                <span className="editor__settings-label">Font size</span>
                <div className="editor__settings-group">
                  {([12, 14, 16, 18] as const).map((s) => (
                    <button
                      key={s}
                      className={`editor__btn editor__btn--sm${fontSize === s ? " editor__btn--active" : ""}`}
                      onClick={() => setFontSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="editor__settings-row">
                <span className="editor__settings-label">Font</span>
                <div className="editor__settings-group">
                  <button
                    className={`editor__btn editor__btn--sm${fontFamily === "monospace" ? " editor__btn--active" : ""}`}
                    onClick={() => setFontFamily("monospace")}
                  >
                    Mono
                  </button>
                  <button
                    className={`editor__btn editor__btn--sm${fontFamily === "sans-serif" ? " editor__btn--active" : ""}`}
                    onClick={() => setFontFamily("sans-serif")}
                  >
                    Sans
                  </button>
                </div>
              </div>
              <div className="editor__settings-row">
                <label className="editor__settings-label" htmlFor="lineWrap">
                  Line wrap
                </label>
                <input
                  id="lineWrap"
                  type="checkbox"
                  checked={lineWrap}
                  onChange={(e) => setLineWrap(e.target.checked)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {findOpen && (
        <div className="editor__find">
          <div className="editor__find-row">
            <input
              ref={findInputRef}
              className="editor__find-input"
              placeholder="Find…"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.shiftKey ? goPrev() : goNext();
                if (e.key === "Escape") closeFind();
              }}
            />
            <span className="editor__find-count">{matchLabel}</span>
            <button className="editor__btn editor__btn--icon" onClick={goPrev} title="Previous"><ChevronUp size={14} /></button>
            <button className="editor__btn editor__btn--icon" onClick={goNext} title="Next"><ChevronDown size={14} /></button>
            <button className="editor__btn editor__btn--sm" onClick={closeFind}>✕</button>
          </div>
          {replaceOpen && (
            <div className="editor__find-row">
              <input
                className="editor__find-input"
                placeholder="Replace…"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") closeFind(); }}
              />
              <button className="editor__btn editor__btn--sm" onClick={replaceCurrent}>Replace</button>
              <button className="editor__btn editor__btn--sm" onClick={replaceAll}>Replace All</button>
            </div>
          )}
        </div>
      )}

      <div className={`editor__body${viewMode === "split" ? " editor__body--split" : ""}`}>
        {viewMode !== "preview" && (
          <div className="editor__area-wrap">
            {findOpen && matches.length > 0 && (
              <div ref={backdropRef} className="editor__highlight-backdrop" style={textareaStyle} aria-hidden="true">
                {buildHighlightedText(text, matches, matchIndex, findText.length)}
              </div>
            )}
            <textarea
              ref={textareaRef}
              className="editor__area"
              value={text}
              onChange={handleChange}
              spellCheck={false}
              style={{ ...textareaStyle, ...(findOpen && matches.length > 0 ? { color: "transparent", caretColor: "var(--color-text)", background: "transparent" } : {}) }}
              onSelect={updateCursorPos}
              onClick={updateCursorPos}
              onKeyUp={updateCursorPos}
              onScroll={() => {
                if (backdropRef.current && textareaRef.current) {
                  backdropRef.current.scrollTop = textareaRef.current.scrollTop;
                  backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
                }
              }}
            />
          </div>
        )}
        {viewMode !== "edit" && (
          <div
            className="editor__preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
      </div>

      <div className="editor__statusbar">
        <span className="editor__status-left">Ln {cursorLine}, Col {cursorCol}</span>
        <span className="editor__status-right">{words} words · {chars} chars</span>
      </div>

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
