import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FocusPhase = "focus" | "short" | "long";
type Completion = { day: string; minutes: number };
interface FocusState {
  phase: FocusPhase;
  status: "idle" | "running" | "paused";
  durations: Record<FocusPhase, number>;
  remaining: number;
  endsAt: number | null;
  sound: boolean;
  completed: Completion[];
  cycle: number;
  start: () => void;
  pause: () => void;
  stop: () => void;
  skip: () => void;
  tick: (now?: number) => FocusPhase | null;
  configure: (phase: FocusPhase, minutes: number) => void;
  setSound: (enabled: boolean) => void;
}

export function localDay(now: number) {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      phase: "focus",
      status: "idle",
      durations: { focus: 25, short: 5, long: 15 },
      remaining: 25 * 60_000,
      endsAt: null,
      sound: false,
      completed: [],
      cycle: 0,
      start: () => {
        const state = get();
        if (state.status === "running") return;
        set({ status: "running", endsAt: Date.now() + state.remaining });
      },
      pause: () => {
        const state = get();
        if (state.status !== "running") return;
        if (state.endsAt! <= Date.now()) {
          state.tick();
          return;
        }
        set({
          status: "paused",
          remaining: state.endsAt! - Date.now(),
          endsAt: null,
        });
      },
      stop: () =>
        set({
          status: "idle",
          endsAt: null,
          remaining: get().durations[get().phase] * 60_000,
        }),
      skip: () => {
        const state = get();
        const phase = state.phase === "focus" ? "short" : "focus";
        set({
          phase,
          status: "idle",
          endsAt: null,
          remaining: state.durations[phase] * 60_000,
        });
      },
      tick: (now = Date.now()) => {
        const state = get();
        if (
          state.status !== "running" ||
          state.endsAt === null ||
          now < state.endsAt
        )
          return null;
        const cycle = state.cycle + (state.phase === "focus" ? 1 : 0);
        const phase =
          state.phase === "focus"
            ? cycle % 4 === 0
              ? "long"
              : "short"
            : "focus";
        const completed =
          state.phase === "focus"
            ? [
                ...state.completed,
                { day: localDay(state.endsAt), minutes: state.durations.focus },
              ].slice(-1000)
            : state.completed;
        set({
          phase,
          cycle,
          completed,
          status: "idle",
          endsAt: null,
          remaining: state.durations[phase] * 60_000,
        });
        return state.phase;
      },
      configure: (phase, minutes) => {
        if (
          get().status !== "idle" ||
          !Number.isFinite(minutes) ||
          minutes < 1 ||
          minutes > 180
        )
          return;
        const durations = { ...get().durations, [phase]: Math.round(minutes) };
        set({ durations, remaining: durations[get().phase] * 60_000 });
      },
      setSound: (sound) => set({ sound }),
    }),
    { name: "webos-focus" },
  ),
);
