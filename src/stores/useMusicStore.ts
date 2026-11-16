import { create } from "zustand";
import { persist } from "zustand/middleware";
interface Playlist {
  id: string;
  name: string;
  files: string[];
}
interface MusicState {
  playlists: Playlist[];
  volume: number;
  repeat: "off" | "all" | "one";
  shuffle: boolean;
  create: (name: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  addTrack: (id: string, file: string) => void;
  removeTrack: (id: string, file: string) => void;
  removeFiles: (ids: string[]) => void;
  settings: (
    updates: Partial<Pick<MusicState, "volume" | "repeat" | "shuffle">>,
  ) => void;
}
export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
      playlists: [],
      volume: 0.8,
      repeat: "off",
      shuffle: false,
      create: (name) => {
        if (!name.trim() || name.trim().length > 80) return;
        set((state) => ({
          playlists: [
            ...state.playlists,
            { id: crypto.randomUUID(), name: name.trim(), files: [] },
          ],
        }));
      },
      rename: (id, name) => {
        if (!name.trim() || name.trim().length > 80) return;
        set((state) => ({
          playlists: state.playlists.map((list) =>
            list.id === id ? { ...list, name: name.trim() } : list,
          ),
        }));
      },
      remove: (id) =>
        set((state) => ({
          playlists: state.playlists.filter((list) => list.id !== id),
        })),
      addTrack: (id, file) =>
        set((state) => ({
          playlists: state.playlists.map((list) =>
            list.id === id
              ? { ...list, files: [...new Set([...list.files, file])] }
              : list,
          ),
        })),
      removeTrack: (id, file) =>
        set((state) => ({
          playlists: state.playlists.map((list) =>
            list.id === id
              ? { ...list, files: list.files.filter((value) => value !== file) }
              : list,
          ),
        })),
      removeFiles: (ids) =>
        set((state) => ({
          playlists: state.playlists.map((list) => ({
            ...list,
            files: list.files.filter((id) => !ids.includes(id)),
          })),
        })),
      settings: (updates) => set(updates),
    }),
    { name: "webos-music" },
  ),
);
