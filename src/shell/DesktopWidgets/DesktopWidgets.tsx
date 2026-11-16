import { useEffect, useRef, useState } from "react";
import {
  useWidgetsStore,
  type DesktopWidget,
  type WidgetKind,
} from "../../stores/useWidgetsStore";
import { useTodoStore } from "../../stores/useTodoStore";
import { useCalendarStore } from "../../stores/useCalendarStore";
import { useWeatherStore } from "../../stores/useWeatherStore";
import { localDay } from "../../stores/useFocusStore";
import { weatherLabel, toF } from "../../apps/Weather/weatherApi";
import { launchApp } from "../../lib/launch";
import { useCompact } from "../../lib/useCompact";
import "./DesktopWidgets.css";

const names: Record<WidgetKind, string> = {
  clock: "Clock",
  calendar: "Calendar",
  tasks: "Tasks",
  weather: "Weather",
};
function WidgetContent({
  widget,
  now,
}: {
  widget: DesktopWidget;
  now: number;
}) {
  const tasks = useTodoStore((state) => state.tasks);
  const toggle = useTodoStore((state) => state.toggle);
  const events = useCalendarStore((state) => state.events);
  const weather = useWeatherStore();
  if (widget.kind === "clock")
    return (
      <>
        <strong className="widgets__time">
          {new Date(now).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: widget.hour12,
          })}
        </strong>
        <p>{new Date(now).toLocaleDateString([], { dateStyle: "full" })}</p>
        <label>
          <input
            type="checkbox"
            checked={widget.hour12}
            onChange={(event) =>
              useWidgetsStore
                .getState()
                .update(widget.id, { hour12: event.target.checked })
            }
          />
          12-hour clock
        </label>
        <button onClick={() => launchApp("clock")}>Open Clock</button>
      </>
    );
  if (widget.kind === "tasks")
    return (
      <>
        {tasks
          .filter((task) => !task.completed)
          .slice(0, widget.large ? 6 : 3)
          .map((task) => (
            <label className="widgets__task" key={task.id}>
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggle(task.id)}
              />
              {task.title}
            </label>
          ))}
        {!tasks.some((task) => !task.completed) && <p>No incomplete tasks.</p>}
        <button onClick={() => launchApp("todo-list")}>Open To-Do List</button>
      </>
    );
  if (widget.kind === "calendar") {
    const upcoming = events
      .filter((event) => event.date >= localDay(now))
      .sort((a, b) =>
        `${a.date} ${a.startTime ?? ""}`.localeCompare(
          `${b.date} ${b.startTime ?? ""}`,
        ),
      )
      .slice(0, widget.large ? 5 : 2);
    return (
      <>
        {upcoming.map((event) => (
          <p key={event.id}>
            <strong>{event.title}</strong>
            <br />
            {event.date} {event.startTime}
          </p>
        ))}
        {!upcoming.length && <p>No upcoming events.</p>}
        <button onClick={() => launchApp("calendar")}>Open Calendar</button>
      </>
    );
  }
  return (
    <>
      <strong>{weather.city}</strong>
      {weather.weather ? (
        <p>
          {weather.unit === "C"
            ? weather.weather.current.temp
            : toF(weather.weather.current.temp)}
          °{weather.unit} · {weatherLabel(weather.weather.current.weatherCode)}
        </p>
      ) : (
        <p>
          {weather.loading
            ? "Loading weather…"
            : weather.error || "Open Weather to load conditions."}
        </p>
      )}
      <button onClick={() => launchApp("weather")}>Open Weather</button>
    </>
  );
}

export function DesktopWidgets() {
  const { widgets, add, update, remove } = useWidgetsStore();
  const compact = useCompact();
  const [menu, setMenu] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const drag = useRef<{
    id: string;
    pointer: number;
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const hasWeather = widgets.some((widget) => widget.kind === "weather");
  useEffect(() => {
    function refresh() {
      if (!document.hidden) setNow(Date.now());
    }
    function resize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("resize", resize);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("resize", resize);
    };
  }, []);
  useEffect(() => {
    if (!hasWeather) return;
    function refresh() {
      if (!document.hidden) void useWeatherStore.getState().refresh();
    }
    if (!useWeatherStore.getState().weather) refresh();
    const timer = window.setInterval(refresh, 600_000);
    return () => window.clearInterval(timer);
  }, [hasWeather]);
  return (
    <div
      className="widgets"
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <div className="widgets__add">
        <button aria-expanded={menu} onClick={() => setMenu(!menu)}>
          Add widget
        </button>
        {menu && (
          <div className="widgets__menu">
            {(Object.keys(names) as WidgetKind[]).map((kind) => (
              <button
                key={kind}
                disabled={widgets.some((widget) => widget.kind === kind)}
                onClick={() => {
                  add(kind);
                  setMenu(false);
                }}
              >
                {names[kind]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="widgets__items">
        {widgets.map((widget) => {
          const width = widget.large ? 320 : 240;
          const height = widget.large ? 300 : 220;
          const x = Math.max(0, Math.min(widget.x, viewport.width - width - 8));
          const y = Math.max(
            48,
            Math.min(widget.y, viewport.height - height - 90),
          );
          return (
            <section
              key={widget.id}
              aria-label={`${names[widget.kind]} widget`}
              className={`widgets__card ${widget.large ? "widgets__card--large" : ""}`}
              style={compact ? {} : { left: x, top: y }}
            >
              <header>
                <button
                  className="widgets__handle"
                  aria-label={`Move ${names[widget.kind]} widget`}
                  disabled={compact}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    drag.current = {
                      id: widget.id,
                      pointer: event.pointerId,
                      x: event.clientX,
                      y: event.clientY,
                      originX: x,
                      originY: y,
                    };
                  }}
                  onPointerMove={(event) => {
                    const active = drag.current;
                    if (
                      !active ||
                      active.id !== widget.id ||
                      active.pointer !== event.pointerId
                    )
                      return;
                    update(widget.id, {
                      x: Math.max(
                        0,
                        Math.min(
                          active.originX + event.clientX - active.x,
                          viewport.width - width - 8,
                        ),
                      ),
                      y: Math.max(
                        48,
                        Math.min(
                          active.originY + event.clientY - active.y,
                          viewport.height - height - 90,
                        ),
                      ),
                    });
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                >
                  ⠿ {names[widget.kind]}
                </button>
                <button
                  aria-label={`Remove ${names[widget.kind]} widget`}
                  onClick={() => remove(widget.id)}
                >
                  ×
                </button>
              </header>
              <div className="widgets__content">
                <WidgetContent widget={widget} now={now} />
              </div>
              <label>
                Size{" "}
                <select
                  aria-label={`${names[widget.kind]} widget size`}
                  value={widget.large ? "large" : "small"}
                  onChange={(event) =>
                    update(widget.id, { large: event.target.value === "large" })
                  }
                >
                  <option value="small">Small</option>
                  <option value="large">Large</option>
                </select>
              </label>
            </section>
          );
        })}
      </div>
    </div>
  );
}
