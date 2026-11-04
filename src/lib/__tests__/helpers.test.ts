import { describe, it, expect, vi, afterEach } from "vitest";
import { clamp, cx, formatClock, uid, factoryReset } from "../helpers";

describe("clamp", () => {
  it("returns the value when inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps to min and max", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
  it("keeps boundary values", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("cx", () => {
  it("joins truthy class names with a space", () => {
    expect(cx("a", "b")).toBe("a b");
  });
  it("drops false, null, undefined and empty values", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });
  it("supports conditional classes", () => {
    const focused = true;
    const maximized = false;
    expect(cx("window", focused && "window--focused", maximized && "window--maximized")).toBe(
      "window window--focused",
    );
  });
  it("returns an empty string when nothing is truthy", () => {
    expect(cx(false, null)).toBe("");
  });
});

describe("uid", () => {
  it("returns unique non-empty ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => uid()));
    expect(ids.size).toBe(50);
    expect([...ids][0]).toMatch(/\S+/);
  });
});

describe("formatClock", () => {
  it("formats time as 12-hour with AM/PM and the date with weekday", () => {
    const { time, dateStr } = formatClock(new Date(2026, 10, 4, 15, 7));
    expect(time).toBe("3:07 PM");
    expect(dateStr).toBe("Wed, Nov 4");
  });
  it("shows 12:00 AM at midnight", () => {
    expect(formatClock(new Date(2026, 0, 1, 0, 0)).time).toBe("12:00 AM");
  });
});

describe("factoryReset", () => {
  const original = window.location;
  afterEach(() => {
    Object.defineProperty(window, "location", { value: original, configurable: true });
  });

  it("removes all webos storage keys and reloads, leaving unrelated keys alone", () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...original, reload },
      configurable: true,
    });
    localStorage.setItem("webos-filesystem", "x");
    localStorage.setItem("webos-system", "x");
    localStorage.setItem("webos-profile", "x");
    localStorage.setItem("unrelated", "keep");

    factoryReset();

    expect(localStorage.getItem("webos-filesystem")).toBeNull();
    expect(localStorage.getItem("webos-system")).toBeNull();
    expect(localStorage.getItem("webos-profile")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
