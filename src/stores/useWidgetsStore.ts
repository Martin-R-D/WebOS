import { create } from "zustand";
import { persist } from "zustand/middleware";
export type WidgetKind = "clock" | "calendar" | "tasks" | "weather";
export interface DesktopWidget {
  id: string;
  kind: WidgetKind;
  x: number;
  y: number;
  large: boolean;
  hour12: boolean;
}
interface WidgetsState {
  widgets: DesktopWidget[];
  add: (kind: WidgetKind) => void;
  update: (
    id: string,
    changes: Partial<Pick<DesktopWidget, "x" | "y" | "large" | "hour12">>,
  ) => void;
  remove: (id: string) => void;
}
export const useWidgetsStore = create<WidgetsState>()(
  persist(
    (set) => ({
      widgets: [],
      add: (kind) =>
        set((state) =>
          state.widgets.some((widget) => widget.kind === kind)
            ? state
            : {
                widgets: [
                  ...state.widgets,
                  {
                    id: crypto.randomUUID(),
                    kind,
                    x: Math.max(0, window.innerWidth - 280),
                    y: 60 + state.widgets.length * 40,
                    large: false,
                    hour12: true,
                  },
                ],
              },
        ),
      update: (id, changes) =>
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, ...changes } : widget,
          ),
        })),
      remove: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((widget) => widget.id !== id),
        })),
    }),
    { name: "webos-widgets" },
  ),
);
