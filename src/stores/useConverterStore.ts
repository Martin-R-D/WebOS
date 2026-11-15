import { create } from "zustand";
import { persist } from "zustand/middleware";
import { categories } from "../apps/UnitConverter/conversion";

interface ConverterState {
  category: string;
  pairs: Record<string, { from: string; to: string }>;
  selectCategory: (category: string) => void;
  setPair: (category: string, from: string, to: string) => void;
}

const defaultPairs = Object.fromEntries(
  Object.entries(categories).map(([key, category]) => [
    key,
    { from: category.units[0].id, to: category.units[1].id },
  ]),
);
export const useConverterStore = create<ConverterState>()(
  persist(
    (set) => ({
      category: "length",
      pairs: defaultPairs,
      selectCategory: (category) => {
        if (Object.hasOwn(categories, category)) set({ category });
      },
      setPair: (category, from, to) => {
        if (
          !categories[category]?.units.some((unit) => unit.id === from) ||
          !categories[category].units.some((unit) => unit.id === to)
        )
          return;
        set((state) => ({
          pairs: { ...state.pairs, [category]: { from, to } },
        }));
      },
    }),
    {
      name: "webos-converter",
      version: 1,
      partialize: ({ category, pairs }) => ({ category, pairs }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ConverterState> | null;
        const pairs = { ...defaultPairs };
        for (const [category, pair] of Object.entries(saved?.pairs ?? {})) {
          if (
            pair &&
            categories[category]?.units.some((unit) => unit.id === pair.from) &&
            categories[category].units.some((unit) => unit.id === pair.to)
          )
            pairs[category] = pair;
        }
        return {
          ...current,
          category:
            saved?.category && Object.hasOwn(categories, saved.category)
              ? saved.category
              : "length",
          pairs,
        };
      },
    },
  ),
);
