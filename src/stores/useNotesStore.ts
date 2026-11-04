import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Note {
  id: string;
  text: string;
  color: string;
  createdAt: number;
}

interface NotesStoreState {
  notes: Note[];
  addNote: (text: string, color: string) => void;
  deleteNote: (id: string) => void;
  updateNote: (id: string, text: string, color: string) => void;
}

export const useNotesStore = create<NotesStoreState>()(
  persist(
    (set) => ({
      notes: [],

      addNote: (text, color) =>
        set((state) => ({
          notes: [
            ...state.notes,
            {
              id: crypto.randomUUID(),
              text,
              color,
              createdAt: Date.now(),
            },
          ],
        })),

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
      version: 1,
      partialize: (state) => ({
        notes: state.notes,
      }),
    },
  ),
);
