import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Flag } from "lucide-react";
import type { AppProps } from "../../types";
import { cx } from "../../lib/helpers";
import { playSound } from "../../lib/sound";
import "./Clock.css";

const TABS = ["Clock", "Stopwatch", "Timer"] as const;
type Tab = (typeof TABS)[number];

const WORLD_ZONES = [
  { label: "New York", tz: "America/New_York" },
  { label: "London", tz: "Europe/London" },
  { label: "Sofia", tz: "Europe/Sofia" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
  { label: "Sydney", tz: "Australia/Sydney" },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatStopwatch(ms: number): string {
  const cs = Math.floor((ms % 1000) / 10);
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return `${pad(m)}:${pad(s)}.${pad(cs)}`;
}

/* ---------------- Clock tab ---------------- */

function ClockTab() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="clock__panel">
      <div className="clock__big">
        {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="clock__date">
        {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
      <div className="clock__world">
        {WORLD_ZONES.map((zone) => (
          <div key={zone.tz} className="clock__zone">
            <span>{zone.label}</span>
            <strong>
              {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone.tz })}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Stopwatch tab ---------------- */

function StopwatchTab() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const baseRef = useRef(0); // accumulated ms when paused
  const startRef = useRef(0); // performance.now() at (re)start

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(baseRef.current + (performance.now() - startRef.current));
    }, 33);
    return () => clearInterval(id);
  }, [running]);

  function toggle() {
    if (running) {
      baseRef.current += performance.now() - startRef.current;
      setRunning(false);
    } else {
      startRef.current = performance.now();
      setRunning(true);
    }
  }

  function reset() {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    baseRef.current = 0;
  }

  function lap() {
    setLaps((prev) => [elapsed, ...prev]);
  }

  return (
    <div className="clock__panel">
      <div className="clock__big clock__big--mono">{formatStopwatch(elapsed)}</div>
      <div className="clock__controls">
        <button className="clock__ctrl clock__ctrl--primary" onClick={toggle}>
          {running ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="clock__ctrl" onClick={lap} disabled={!running}>
          <Flag size={16} />
        </button>
        <button className="clock__ctrl" onClick={reset} disabled={elapsed === 0}>
          <RotateCcw size={16} />
        </button>
      </div>
      {laps.length > 0 && (
        <div className="clock__laps">
          {laps.map((lapMs, i) => (
            <div key={i} className="clock__lap">
              <span>Lap {laps.length - i}</span>
              <strong>{formatStopwatch(lapMs)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Timer tab ---------------- */

function TimerTab() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null); // ms, null = not started
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = endRef.current - Date.now();
      if (left <= 0) {
        setRemaining(0);
        setRunning(false);
        setFinished(true);
        playSound("chime");
        setTimeout(() => playSound("chime"), 400);
        setTimeout(() => playSound("chime"), 800);
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  function start() {
    const total = (minutes * 60 + seconds) * 1000;
    if (total <= 0) return;
    endRef.current = Date.now() + (remaining ?? total);
    setRemaining(remaining ?? total);
    setRunning(true);
    setFinished(false);
  }

  function pause() {
    setRunning(false);
    setRemaining(Math.max(0, endRef.current - Date.now()));
  }

  function reset() {
    setRunning(false);
    setRemaining(null);
    setFinished(false);
  }

  const displayMs = remaining ?? (minutes * 60 + seconds) * 1000;
  const totalS = Math.ceil(displayMs / 1000);

  return (
    <div className="clock__panel">
      <div className={cx("clock__big clock__big--mono", finished && "clock__big--finished")}>
        {pad(Math.floor(totalS / 60))}:{pad(totalS % 60)}
      </div>

      {remaining === null && (
        <div className="clock__setter">
          <label>
            <input
              type="number"
              min={0}
              max={99}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
            />
            min
          </label>
          <label>
            <input
              type="number"
              min={0}
              max={59}
              value={seconds}
              onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
            />
            sec
          </label>
        </div>
      )}

      <div className="clock__controls">
        <button
          className="clock__ctrl clock__ctrl--primary"
          onClick={running ? pause : start}
          disabled={!running && minutes === 0 && seconds === 0 && remaining === null}
        >
          {running ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="clock__ctrl" onClick={reset} disabled={remaining === null}>
          <RotateCcw size={16} />
        </button>
      </div>

      {finished && <div className="clock__done">Time's up!</div>}
    </div>
  );
}

/* ---------------- App shell ---------------- */

export function Clock({}: AppProps) {
  const [tab, setTab] = useState<Tab>("Clock");

  return (
    <div className="clock">
      <div className="clock__tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={cx("clock__tab", tab === t && "clock__tab--active")}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Clock" && <ClockTab />}
      {tab === "Stopwatch" && <StopwatchTab />}
      {tab === "Timer" && <TimerTab />}
    </div>
  );
}
