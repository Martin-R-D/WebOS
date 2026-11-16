import FormulaParser from "fast-formula-parser";
import { address, COLUMNS, position, ROWS } from "./model";
import type { CellStyle, Workbook } from "./model";

export type CellValue = string | number | boolean;
const functions = new Set(["SUM", "AVERAGE", "MIN", "MAX", "COUNT", "IF"]);

export function createEvaluator(workbook: Workbook) {
  const cache = new Map<string, CellValue | Error>();
  const visiting = new Set<string>();
  let operations = 0;
  const parsers: FormulaParser[] = [];
  const callbacks: ConstructorParameters<typeof FormulaParser>[0][] = [];
  function compute(sheetId: string, key: string): CellValue {
    if (++operations > 100_000) throw new Error("#LIMIT!");
    const sheet = workbook.sheets.find((item) => item.id === sheetId);
    if (!sheet || !position(key)) throw new Error("#REF!");
    const identity = `${sheetId}:${key}`;
    const cached = cache.get(identity);
    if (cached instanceof Error) throw cached;
    if (cached !== undefined) return cached;
    if (visiting.has(identity)) throw new Error("#CYCLE!");
    if (visiting.size > 100) throw new Error("#LIMIT!");
    const raw = sheet.cells[key]?.raw ?? "";
    if (!raw.startsWith("=")) {
      const value = raw.startsWith("'")
        ? raw.slice(1)
        : raw.trim() && Number.isFinite(Number(raw))
          ? Number(raw)
          : raw;
      cache.set(identity, value);
      return value;
    }
    visiting.add(identity);
    try {
      if (raw.length > 2000) throw new Error("#LIMIT!");
      const formula = raw.slice(1).replace(/"(?:[^"]|"")*"/g, '""');
      for (const match of formula.matchAll(/\b([A-Z_][A-Z_0-9]*)\s*\(/gi)) {
        if (!functions.has(match[1].toUpperCase())) throw new Error("#NAME?");
      }
      let dependencyError: Error | undefined;
      function read(sheetName: string | undefined, row: number, col: number) {
        try {
          const target = sheetName
            ? workbook.sheets.find(
                (item) => item.name.toLowerCase() === sheetName.toLowerCase(),
              )
            : sheet;
          if (!target || row < 1 || row > ROWS || col < 1 || col > COLUMNS)
            throw new Error("#REF!");
          const value = compute(target.id, address(row - 1, col - 1));
          return value === "" ? null : value;
        } catch (cause) {
          dependencyError =
            cause instanceof Error ? cause : new Error("#ERROR!");
          throw dependencyError;
        }
      }
      function extrema(args: { value: unknown }[], minimum: boolean) {
        const values = args
          .flatMap((argument) => [argument.value].flat(Infinity))
          .filter((value): value is number => typeof value === "number");
        return values.length
          ? minimum
            ? Math.min(...values)
            : Math.max(...values)
          : 0;
      }
      const depth = visiting.size - 1;
      callbacks[depth] = {
        functions: {
          MIN: (...args) => extrema(args, true),
          MAX: (...args) => extrema(args, false),
        },
        onCell: (reference) =>
          read(reference.sheet, reference.row, reference.col),
        onRange: (range) => {
          if (
            range.from.row < 1 ||
            range.from.col < 1 ||
            range.to.row > ROWS ||
            range.to.col > COLUMNS
          )
            throw new Error("#REF!");
          if (
            (range.to.row - range.from.row + 1) *
              (range.to.col - range.from.col + 1) >
            10_000
          )
            throw new Error("#LIMIT!");
          const values: unknown[][] = [];
          for (let row = range.from.row; row <= range.to.row; row++) {
            const line: unknown[] = [];
            for (let col = range.from.col; col <= range.to.col; col++)
              line.push(read(range.sheet, row, col));
            values.push(line);
          }
          return values;
        },
      };
      const parser = (parsers[depth] ??= new FormulaParser({
        functions: callbacks[depth].functions,
        onCell: (reference) => callbacks[depth].onCell(reference),
        onRange: (range) => callbacks[depth].onRange(range),
      }));
      let value: unknown;
      try {
        const location = position(key)!;
        value = parser.parse(raw.slice(1), {
          sheet: sheet.name,
          row: location.row + 1,
          col: location.column + 1,
        });
      } catch (cause) {
        if (dependencyError) throw dependencyError;
        const message = cause instanceof Error ? cause.message : String(cause);
        throw new Error(
          message.match(
            /#(?:DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A|LIMIT!)/,
          )?.[0] ?? "#ERROR!",
        );
      }
      if (value === null || value === undefined) value = 0;
      if (value instanceof Error) {
        if (dependencyError) throw dependencyError;
        throw new Error(String(value));
      }
      if (typeof value === "number" && !Number.isFinite(value))
        throw new Error("#NUM!");
      if (!["number", "string", "boolean"].includes(typeof value))
        throw new Error("#ERROR!");
      cache.set(identity, value as CellValue);
      return value as CellValue;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error("#ERROR!");
      cache.set(identity, error);
      throw error;
    } finally {
      visiting.delete(identity);
    }
  }
  return (sheetId: string, key: string): CellValue => {
    operations = 0;
    try {
      return compute(sheetId, key);
    } catch (cause) {
      return cause instanceof Error ? cause.message : "#ERROR!";
    }
  };
}

export function formatCell(value: CellValue, style?: CellStyle): string {
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value !== "number" || !style?.format || style.format === "general")
    return String(value);
  const decimals = style.decimals ?? 2;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...(style.format === "currency"
      ? { style: "currency", currency: "USD" }
      : style.format === "percent"
        ? { style: "percent" }
        : {}),
  }).format(value);
}
