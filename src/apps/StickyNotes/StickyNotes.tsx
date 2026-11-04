import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AppProps } from "../../types";
import { useNotesStore } from "../../stores/useNotesStore";
import { cx } from "../../lib/helpers";
import "./StickyNotes.css";

const COLORS = [
  { name: "Yellow", value: "#FFF9C4" },
  { name: "Pink", value: "#FFB3D9" },
  { name: "Blue", value: "#B3E5FC" },
  { name: "Green", value: "#C8E6C9" },
  { name: "Purple", value: "#E1BEE7" },
];

export function StickyNotes({}: AppProps) {
  const notes = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.addNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const updateNote = useNotesStore((s) => s.updateNote);

  function handleAddNote() {
    addNote("New note...", COLORS[0].value);
  }

  return (
    <div className="sticky-notes">
      <div className="sticky-notes__toolbar">
        <button className="sticky-notes__btn-add" onClick={handleAddNote} title="New note">
          <Plus size={16} />
          Add Note
        </button>
      </div>
      <div className="sticky-notes__grid">
        {notes.map((note) => (
          <div key={note.id} className="sticky-notes__item" style={{ backgroundColor: note.color }}>
            <div className="sticky-notes__header">
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
