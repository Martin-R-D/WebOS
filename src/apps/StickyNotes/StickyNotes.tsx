import { useEffect, useRef, useState } from "react";
import { Pin, Plus, Trash2 } from "lucide-react";
import type { AppProps } from "../../types";
import { useNotesStore } from "../../stores/useNotesStore";
import "./StickyNotes.css";

const COLORS = [
  { name: "Yellow", value: "#FFF9C4" },
  { name: "Pink", value: "#FFB3D9" },
  { name: "Blue", value: "#B3E5FC" },
  { name: "Green", value: "#C8E6C9" },
  { name: "Purple", value: "#E1BEE7" },
];

export function StickyNotes({ launchProps }: AppProps) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const togglePin = useNotesStore((s) => s.togglePin);
  const notes = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.addNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const updateNote = useNotesStore((s) => s.updateNote);

  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const id = launchProps?.noteId;
    if (
      typeof id !== "string" ||
      !useNotesStore.getState().notes.some((note) => note.id === id)
    )
      return;
    pendingFocus.current = id;
    setQuery("");
    setEditingId(id);
  }, [launchProps?.noteId, launchProps?.navigationToken]);

  useEffect(() => {
    if (query || !pendingFocus.current) return;
    const input = inputs.current.get(pendingFocus.current);
    if (!input) return;
    pendingFocus.current = null;
    input.scrollIntoView({ block: "center" });
    input.focus();
  }, [query, editingId, launchProps?.navigationToken]);

  function handleAddNote() {
    setQuery("");
    const id = addNote("", COLORS[0].value);
    setEditingId(id);
    requestAnimationFrame(() => inputs.current.get(id)?.focus());
  }

  const visible = notes
    .filter(
      (note) =>
        note.id === editingId ||
        note.text.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="sticky-notes">
      <div className="sticky-notes__toolbar">
        <button
          className="sticky-notes__btn-add"
          onClick={handleAddNote}
          title="New note"
        >
          <Plus size={16} />
          Add Note
        </button>
        <input
          aria-label="Search notes"
          placeholder="Search notes…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && <button onClick={() => setQuery("")}>Clear search</button>}
      </div>
      <div className="sticky-notes__grid">
        {notes.length === 0 && (
          <div className="sticky-notes__empty">
            No notes yet. Click "Add Note" to create one.
          </div>
        )}
        {notes.length > 0 && visible.length === 0 && <p>No matching notes.</p>}
        {visible.map((note) => (
          <div
            key={note.id}
            className="sticky-notes__item"
            style={{ backgroundColor: note.color }}
          >
            <div className="sticky-notes__header">
              <button
                className="sticky-notes__pin"
                aria-label={note.pinned ? "Unpin note" : "Pin note"}
                aria-pressed={note.pinned}
                onClick={() => togglePin(note.id)}
              >
                <Pin size={16} />
              </button>
              <select
                value={note.color}
                onChange={(e) => updateNote(note.id, note.text, e.target.value)}
                className="sticky-notes__color-picker"
                title="Change color"
              >
                {COLORS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className="sticky-notes__btn-delete"
                onClick={() => deleteNote(note.id)}
                title="Delete note"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <textarea
              ref={(element) => {
                if (element) inputs.current.set(note.id, element);
                else inputs.current.delete(note.id);
              }}
              aria-label="Note text"
              onFocus={() => setEditingId(note.id)}
              onBlur={() => setEditingId(null)}
              className="sticky-notes__text"
              value={note.text}
              onChange={(e) => updateNote(note.id, e.target.value, note.color)}
              placeholder="Type your note..."
            />
          </div>
        ))}
      </div>
    </div>
  );
}
