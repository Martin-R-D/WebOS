import type { TableSettings } from "./tableData";

export function validateTable(
  value: unknown,
  position: (value: string) => { row: number; column: number } | null,
): void {
  const table = value as TableSettings;
  if (
    !table ||
    !position(table.start ?? "") ||
    !position(table.end ?? "") ||
    typeof table.header !== "boolean" ||
    !Array.isArray(table.filters) ||
    table.filters.length > 52
  )
    throw new Error("Invalid table settings.");
  const a = position(table.start)!;
  const b = position(table.end)!;
  const bounds = {
    firstColumn: Math.min(a.column, b.column),
    lastColumn: Math.max(a.column, b.column),
  };
  for (const filter of table.filters) {
    if (
      !filter ||
      !Number.isInteger(filter.column) ||
      filter.column < bounds.firstColumn ||
      filter.column > bounds.lastColumn ||
      !["values", "contains", "greater", "less", "blank", "nonblank"].includes(
        filter.type,
      ) ||
      typeof filter.value !== "string" ||
      filter.value.length > 10_000 ||
      (["greater", "less"].includes(filter.type) &&
        (!filter.value.trim() || !Number.isFinite(Number(filter.value)))) ||
      !Array.isArray(filter.values) ||
      filter.values.length > 1000 ||
      filter.values.some(
        (item) => typeof item !== "string" || item.length > 10_000,
      )
    )
      throw new Error("Invalid table filter.");
  }
}
