import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileSort } from "../apps/FileExplorer/sortFiles";

interface ExplorerSettings {
  sort: FileSort;
  descending: boolean;
  setSort: (sort: FileSort) => void;
  toggleDirection: () => void;
}

export const useExplorerSettingsStore = create<ExplorerSettings>()(
  persist(
    (set) => ({
      sort: "name",
      descending: false,
      setSort: (sort) => set({ sort }),
      toggleDirection: () =>
        set((state) => ({ descending: !state.descending })),
    }),
    {
      name: "webos-explorer-settings",
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted as Partial<ExplorerSettings> | null;
        return {
          ...current,
          sort:
            saved?.sort && ["name", "type", "modified"].includes(saved.sort)
              ? saved.sort
              : "name",
          descending: saved?.descending === true,
        };
      },
      partialize: ({ sort, descending }) => ({ sort, descending }),
    },
  ),
);
