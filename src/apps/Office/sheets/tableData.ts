import { address, position, ROWS } from "./model";
import type { Worksheet } from "./model";
import type { CellValue } from "./formulas";
import { copyFormula } from "./references";

export interface TableFilter {
  column: number;
  type: "values" | "contains" | "greater" | "less" | "blank" | "nonblank";
  value: string;
  values: string[];
}

export interface TableSettings {
  start: string;
  end: string;
  header: boolean;
  filters: TableFilter[];
}

export interface SortKey {
  column: number;
  descending: boolean;
}

export function tableBounds(table: TableSettings) {
  const a = position(table.start)!;
  const b = position(table.end)!;
  return {
    firstRow: Math.min(a.row, b.row),
    lastRow: Math.max(a.row, b.row),
    firstColumn: Math.min(a.column, b.column),
    lastColumn: Math.max(a.column, b.column),
  };
}

export function visibleRows(
  sheet: Worksheet,
  evaluate: (sheetId: string, key: string) => CellValue,
): number[] {
  const table = sheet.table;
  if (!table?.filters.length)
    return Array.from({ length: ROWS }, (_, row) => row);
  const bounds = tableBounds(table);
  return Array.from({ length: ROWS }, (_, row) => row).filter((row) => {
    if (row < bounds.firstRow + Number(table.header) || row > bounds.lastRow)
      return true;
    return table.filters.every((filter) => {
      const value = evaluate(sheet.id, address(row, filter.column));
      const text = String(value);
      if (filter.type === "blank") return text === "";
      if (filter.type === "nonblank") return text !== "";
      if (filter.type === "values") return filter.values.includes(text);
      if (filter.type === "contains")
        return text.toLowerCase().includes(filter.value.toLowerCase());
      return (
        typeof value === "number" &&
        (filter.type === "greater"
          ? value > Number(filter.value)
          : value < Number(filter.value))
      );
    });
  });
}

function rank(value: CellValue) {
  if (value === "") return 4;
  if (typeof value === "string" && value.startsWith("#")) return 3;
  return typeof value === "number" ? 0 : typeof value === "boolean" ? 1 : 2;
}

export function sortTable(
  sheet: Worksheet,
  table: TableSettings,
  keys: SortKey[],
  evaluate: (sheetId: string, key: string) => CellValue,
): Worksheet {
  const bounds = tableBounds(table);
  const first = bounds.firstRow + Number(table.header);
  const rows = Array.from(
    { length: Math.max(0, bounds.lastRow - first + 1) },
    (_, offset) => first + offset,
  );
  rows.sort((a, b) => {
    for (const key of keys) {
      const left = evaluate(sheet.id, address(a, key.column));
      const right = evaluate(sheet.id, address(b, key.column));
      const category = rank(left) - rank(right);
      if (category) return category;
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              sensitivity: "base",
              numeric: true,
            });
      if (comparison) return key.descending ? -comparison : comparison;
    }
    return a - b;
  });
  const cells = { ...sheet.cells };
  rows.forEach((sourceRow, offset) => {
    const destinationRow = first + offset;
    for (
      let column = bounds.firstColumn;
      column <= bounds.lastColumn;
      column++
    ) {
      const source = sheet.cells[address(sourceRow, column)];
      const destination = address(destinationRow, column);
      if (source)
        cells[destination] = {
          ...source,
          raw: copyFormula(source.raw, destinationRow - sourceRow, 0),
        };
      else delete cells[destination];
    }
  });
  return { ...sheet, cells, table };
}
