import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Calculation {
  id: string;
  expression: string;
  result: number;
  createdAt: number;
}

interface HistoryState {
  entries: Calculation[];
  record: (expression: string, result: number) => void;
  clear: () => void;
}

export const useCalculatorHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      record: (expression, result) => {
        if (!expression.trim() || !Number.isFinite(result)) return;
        set((state) => ({
          entries: [
            {
              id: crypto.randomUUID(),
              expression,
              result,
              createdAt: Date.now(),
            },
            ...state.entries,
          ].slice(0, 20),
        }));
      },
      clear: () => set({ entries: [] }),
    }),
    { name: "webos-calculator-history", version: 1 },
  ),
);
