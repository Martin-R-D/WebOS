import { address, COLUMNS, columnName, position, ROWS } from "./model";
import type { Workbook, Worksheet } from "./model";

const references =
  /"(?:[^"]|"")*"|(?:(?:'([^']+)'|([A-Z_][A-Z_0-9]*))!)?(\$?)([A-Z]{1,2})(\$?)([1-9]\d{0,3})(?![A-Z_0-9])/gi;

interface Reference {
  sheet?: string;
  row: number;
  column: number;
  absoluteRow: boolean;
  absoluteColumn: boolean;
}

function rewrite(
  raw: string,
  change: (reference: Reference) => Reference | null,
): string {
  if (!raw.startsWith("=")) return raw;
  let previousEnd = -1;
  let previousSheet: string | undefined;
  return raw.replace(
    references,
    (
      match,
      quotedSheet,
      plainSheet,
      dollarColumn,
      letters,
      dollarRow,
      digits,
      offset: number,
    ) => {
      if (
        match.startsWith('"') ||
        (offset > 0 && /[A-Z_0-9.]/i.test(raw[offset - 1]))
      )
        return match;
      const current = position(letters + digits);
      if (!current) return "#REF!";
      const explicitSheet = quotedSheet ?? plainSheet;
      const inheritedSheet =
        !explicitSheet && raw.slice(previousEnd, offset).trim() === ":"
          ? previousSheet
          : undefined;
      previousSheet = explicitSheet ?? inheritedSheet;
      previousEnd = offset + match.length;
      const next = change({
        ...current,
        sheet: previousSheet,
        absoluteColumn: Boolean(dollarColumn),
        absoluteRow: Boolean(dollarRow),
      });
      if (
        !next ||
        next.row < 0 ||
        next.row >= ROWS ||
        next.column < 0 ||
        next.column >= COLUMNS
      )
        return "#REF!";
      const prefix = next.sheet && !inheritedSheet ? `'${next.sheet}'!` : "";
      return (
        prefix +
        (next.absoluteColumn ? "$" : "") +
        columnName(next.column) +
        (next.absoluteRow ? "$" : "") +
        (next.row + 1)
      );
    },
  );
}

export function copyFormula(
  raw: string,
  rowDelta: number,
  columnDelta: number,
): string {
  return rewrite(raw, (reference) => ({
    ...reference,
    row: reference.row + (reference.absoluteRow ? 0 : rowDelta),
    column: reference.column + (reference.absoluteColumn ? 0 : columnDelta),
  }));
}

export function renameSheet(
  workbook: Workbook,
  id: string,
  name: string,
): Workbook {
  const original = workbook.sheets.find((sheet) => sheet.id === id)!;
  return {
    sheets: workbook.sheets.map((sheet) => ({
      ...sheet,
      name: sheet.id === id ? name : sheet.name,
      cells: Object.fromEntries(
        Object.entries(sheet.cells).map(([key, cell]) => [
          key,
          {
            ...cell,
            raw: rewrite(cell.raw, (reference) => ({
              ...reference,
              sheet:
                reference.sheet?.toLowerCase() === original.name.toLowerCase()
                  ? name
                  : reference.sheet,
            })),
          },
        ]),
      ),
    })),
  };
}

export function deleteWorksheet(workbook: Workbook, id: string): Workbook {
  const original = workbook.sheets.find((sheet) => sheet.id === id)!;
  return {
    sheets: workbook.sheets
      .filter((sheet) => sheet.id !== id)
      .map((sheet) => ({
        ...sheet,
        cells: Object.fromEntries(
          Object.entries(sheet.cells).map(([key, cell]) => [
            key,
            {
              ...cell,
              raw: rewrite(cell.raw, (reference) =>
                reference.sheet?.toLowerCase() === original.name.toLowerCase()
                  ? null
                  : reference,
              ),
            },
          ]),
        ),
      })),
  };
}

export function changeStructure(
  workbook: Workbook,
  id: string,
  axis: "row" | "column",
  index: number,
  deleting: boolean,
): Workbook {
  const target = workbook.sheets.find((sheet) => sheet.id === id)!;
  const limit = axis === "row" ? ROWS : COLUMNS;
  if (
    !deleting &&
    Object.keys(target.cells).some((key) => position(key)![axis] === limit - 1)
  )
    throw new Error(
      "The last row or column contains data. Clear it before inserting.",
    );
  function shiftSizes(sizes: Record<string, number>) {
    return Object.fromEntries(
      Object.entries(sizes).flatMap(([key, size]) => {
        const current = Number(key);
        if (deleting && current === index) return [];
        const next = current >= index ? current + (deleting ? -1 : 1) : current;
        return next < limit ? [[next, size]] : [];
      }),
    );
  }
  return {
    sheets: workbook.sheets.map((sheet) => {
      const cells: Worksheet["cells"] = {};
      for (const [key, cell] of Object.entries(sheet.cells)) {
        const location = position(key)!;
        if (sheet.id === id) {
          if (deleting && location[axis] === index) continue;
          if (location[axis] >= index) location[axis] += deleting ? -1 : 1;
        }
        if (location[axis] >= limit) continue;
        const raw = rewrite(cell.raw, (reference) => {
          if (
            (reference.sheet ?? sheet.name).toLowerCase() !==
            target.name.toLowerCase()
          )
            return reference;
          if (deleting && reference[axis] === index) return null;
          return {
            ...reference,
            [axis]:
              reference[axis] >= index
                ? reference[axis] + (deleting ? -1 : 1)
                : reference[axis],
          };
        });
        cells[address(location.row, location.column)] = { ...cell, raw };
      }
      return {
        ...sheet,
        cells,
        ...(sheet.id === id
          ? axis === "row"
            ? { heights: shiftSizes(sheet.heights) }
            : { widths: shiftSizes(sheet.widths) }
          : {}),
      };
    }),
  };
}
