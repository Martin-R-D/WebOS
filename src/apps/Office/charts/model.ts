export interface SheetChart {
  id: string;
  title: string;
  type: "bar" | "line" | "pie";
  start: string;
  end: string;
  header: boolean;
  sourceMissing?: boolean;
}

export function validateCharts(
  value: unknown,
  position: (value: string) => unknown,
): void {
  if (!Array.isArray(value) || value.length > 20)
    throw new Error("A sheet supports up to 20 charts.");
  const ids = new Set<string>();
  for (const chart of value as SheetChart[]) {
    if (
      !chart ||
      typeof chart.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(chart.id) ||
      ids.has(chart.id) ||
      typeof chart.title !== "string" ||
      !chart.title.trim() ||
      chart.title.length > 100 ||
      !["bar", "line", "pie"].includes(chart.type) ||
      !position(chart.start) ||
      !position(chart.end) ||
      typeof chart.header !== "boolean" ||
      (chart.sourceMissing !== undefined &&
        typeof chart.sourceMissing !== "boolean")
    )
      throw new Error("Invalid chart definition.");
    ids.add(chart.id);
  }
}
