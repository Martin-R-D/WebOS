import { address, COLUMNS, position, ROWS } from "./model";
import type { TableSettings } from "./tableData";

export function adjustTable(
  table: TableSettings | undefined,
  axis: "row" | "column",
  index: number,
  deleting: boolean,
): TableSettings | undefined {
  if (!table) return undefined;
  const a = position(table.start)!;
  const b = position(table.end)!;
  const first = {
    row: Math.min(a.row, b.row),
    column: Math.min(a.column, b.column),
  };
  const last = {
    row: Math.max(a.row, b.row),
    column: Math.max(a.column, b.column),
  };
  const headerDeleted = deleting && axis === "row" && index === first.row;
  if (deleting) {
    if (index < first[axis]) {
      first[axis]--;
      last[axis]--;
    } else if (index <= last[axis]) last[axis]--;
  } else {
    if (index <= first[axis]) {
      first[axis]++;
      last[axis]++;
    } else if (index <= last[axis]) last[axis]++;
  }
  if (last[axis] < first[axis]) return undefined;
  last[axis] = Math.min(last[axis], (axis === "row" ? ROWS : COLUMNS) - 1);
  const filters =
    axis === "column"
      ? table.filters
          .filter((filter) => !deleting || filter.column !== index)
          .map((filter) => ({
            ...filter,
            column:
              filter.column >= index
                ? filter.column + (deleting ? -1 : 1)
                : filter.column,
          }))
          .filter((filter) => filter.column < COLUMNS)
      : table.filters;
  return {
    ...table,
    start: address(first.row, first.column),
    end: address(last.row, last.column),
    header: table.header && !headerDeleted,
    filters,
  };
}
