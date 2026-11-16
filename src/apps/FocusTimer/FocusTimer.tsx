import { useEffect, useState } from "react";
import type { AppProps } from "../../types";
import {
  localDay,
  useFocusStore,
  type FocusPhase,
} from "../../stores/useFocusStore";
import "./FocusTimer.css";

const labels = { focus: "Focus", short: "Short break", long: "Long break" };
export function FocusTimer({}: AppProps) {
  const state = useFocusStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.ceil(
    Math.max(0, state.endsAt === null ? state.remaining : state.endsAt - now) /
      1000,
  );
  const today = state.completed.filter((entry) => entry.day === localDay(now));
  return (
    <div className="focus-timer">
      <h2>{labels[state.phase]}</h2>
      <output aria-label="Time remaining">
        {String(Math.floor(seconds / 60)).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </output>
      <p>
        {state.status === "idle"
          ? "Ready when you are"
          : state.status === "paused"
            ? "Paused"
            : "Session running"}
      </p>
      <div className="focus-timer__actions">
        {state.status === "running" ? (
          <button onClick={state.pause}>Pause</button>
        ) : (
          <button onClick={state.start}>
            {state.status === "paused" ? "Resume" : "Start"}
          </button>
        )}
        <button onClick={state.stop}>Stop / Reset</button>
        <button onClick={state.skip}>Skip</button>
      </div>
      <fieldset disabled={state.status !== "idle"}>
        <legend>Session lengths in minutes</legend>
        {(Object.keys(labels) as FocusPhase[]).map((phase) => (
          <label key={phase}>
            {labels[phase]}
            <input
              aria-label={`${labels[phase]} minutes`}
              type="number"
              min="1"
              max="180"
              key={`${phase}-${state.durations[phase]}`}
              defaultValue={state.durations[phase]}
              onBlur={(event) =>
                state.configure(phase, Number(event.target.value))
              }
            />
          </label>
        ))}
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={state.sound}
          onChange={(event) => state.setSound(event.target.checked)}
        />
        Completion sound (uses system sound setting)
      </label>
      <p>
        Today: {today.length} completed sessions ·{" "}
        {today.reduce((sum, entry) => sum + entry.minutes, 0)} focus minutes
      </p>
      <p>
        Sessions continue when minimized or closed. Use Stop / Reset to end a
        session. The next session waits for you to press Start.
      </p>
    </div>
  );
}
