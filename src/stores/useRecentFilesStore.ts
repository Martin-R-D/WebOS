import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentState {
  entries: { fileId: string; accessedAt: number }[];
  record: (fileId: string) => void;
  remove: (ids: string[]) => void;
  clear: () => void;
}

export const useRecentFilesStore = create<RecentState>()(
  persist(
    (set) => ({
      entries: [],
      record: (fileId) =>
        set((state) => ({
          entries: [
            { fileId, accessedAt: Date.now() },
            ...state.entries.filter((entry) => entry.fileId !== fileId),
          ].slice(0, 10),
        })),
      remove: (ids) =>
        set((state) => ({
          entries: state.entries.filter((entry) => !ids.includes(entry.fileId)),
        })),
      clear: () => set({ entries: [] }),
    }),
    { name: "webos-recent-files", version: 1 },
  ),
);
