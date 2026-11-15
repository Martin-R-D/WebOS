import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Note {
  id: string;
  text: string;
  color: string;
  createdAt: number;
  pinned: boolean;
}

interface NotesStoreState {
  notes: Note[];
  togglePin: (id: string) => void;
  addNote: (text: string, color: string) => string;
  deleteNote: (id: string) => void;
  updateNote: (id: string, text: string, color: string) => void;
}

export const useNotesStore = create<NotesStoreState>()(
  persist(
    (set) => ({
      notes: [],
      togglePin: (id) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, pinned: !note.pinned } : note,
          ),
        })),

      addNote: (text, color) => {
        const id = crypto.randomUUID();
        set((state) => ({
          notes: [
            ...state.notes,
            {
              id,
              text,
              color,
              createdAt: Date.now(),
              pinned: false,
            },
          ],
        }));
        return id;
      },

      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),

      updateNote: (id, text, color) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, text, color } : n,
          ),
        })),
    }),
    {
      name: "webos-notes",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { notes: Note[] };
        return {
          notes: state.notes.map((note) => ({
            ...note,
            pinned: note.pinned ?? false,
          })),
        };
      },
      partialize: (state) => ({
        notes: state.notes,
      }),
    },
  ),
);
