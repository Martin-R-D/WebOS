import type { SheetChart } from "../charts/model";
import { validateCharts } from "../charts/model";
import type { TableSettings } from "./tableData";
import { validateTable } from "./tableValidation";
export const ROWS = 1000;
export const COLUMNS = 52;

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  fill?: string;
  align?: "left" | "center" | "right";
  wrap?: boolean;
  border?: boolean;
  format?: "general" | "number" | "currency" | "percent";
  decimals?: number;
}

interface Cell {
  raw: string;
  style?: CellStyle;
}

export interface Worksheet {
  charts?: SheetChart[];
  table?: TableSettings;
  id: string;
  name: string;
  cells: Record<string, Cell>;
  widths: Record<string, number>;
  heights: Record<string, number>;
}

export interface Workbook {
  sheets: Worksheet[];
}

export function columnName(index: number): string {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

export function address(row: number, column: number): string {
  return columnName(column) + (row + 1);
}

export function position(
  value: string,
): { row: number; column: number } | null {
  const match = /^\$?([A-Z]{1,2})\$?([1-9]\d{0,3})$/i.exec(value);
  if (!match) return null;
  const column =
    Array.from(match[1].toUpperCase()).reduce(
      (total, char) => total * 26 + char.charCodeAt(0) - 64,
      0,
    ) - 1;
  const row = Number(match[2]) - 1;
  return row < ROWS && column < COLUMNS ? { row, column } : null;
}

export function makeWorksheet(name = "Sheet1"): Worksheet {
  return { id: crypto.randomUUID(), name, cells: {}, widths: {}, heights: {} };
}

export function validSheetName(
  name: string,
  sheets: Worksheet[],
  exceptId?: string,
): boolean {
  return (
    name.trim() === name &&
    name.length > 0 &&
    name.length <= 31 &&
    !Array.from(name).some(
      (character) =>
        character.charCodeAt(0) < 32 || "!:'[]/*?\\".includes(character),
    ) &&
    !sheets.some(
      (sheet) =>
        sheet.id !== exceptId &&
        sheet.name.toLowerCase() === name.toLowerCase(),
    )
  );
}

export function validateWorkbook(content: Record<string, unknown>): void {
  if (
    !Array.isArray(content.sheets) ||
    !content.sheets.length ||
    content.sheets.length > 20
  )
    throw new Error("Workbooks must contain 1–20 sheets.");
  const ids = new Set<string>();
  const sheets: Worksheet[] = [];
  for (const sheet of content.sheets as Worksheet[]) {
    if (
      !sheet ||
      typeof sheet.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(sheet.id) ||
      ids.has(sheet.id) ||
      typeof sheet.name !== "string" ||
      !validSheetName(sheet.name, sheets) ||
      !sheet.cells ||
      typeof sheet.cells !== "object" ||
      Array.isArray(sheet.cells)
    )
      throw new Error("Invalid sheet structure.");
    if (sheet.charts !== undefined) validateCharts(sheet.charts, position);
    if (sheet.table !== undefined) validateTable(sheet.table, position);
    ids.add(sheet.id);
    sheets.push(sheet);
    for (const [key, cell] of Object.entries(sheet.cells)) {
      if (
        !position(key) ||
        key !== key.toUpperCase() ||
        key.includes("$") ||
        !cell ||
        typeof cell.raw !== "string" ||
        cell.raw.length > 10_000
      )
        throw new Error("Invalid cell data.");
      const style = cell.style;
      if (style !== undefined) {
        if (!style || typeof style !== "object" || Array.isArray(style))
          throw new Error("Invalid cell formatting.");
        for (const key of ["bold", "italic", "wrap", "border"] as const) {
          if (style[key] !== undefined && typeof style[key] !== "boolean")
            throw new Error("Invalid cell formatting.");
        }
        for (const key of ["color", "fill"] as const) {
          if (style[key] !== undefined && !/^#[0-9a-f]{6}$/i.test(style[key]!))
            throw new Error("Invalid cell color.");
        }
        if (style.align && !["left", "center", "right"].includes(style.align))
          throw new Error("Invalid alignment.");
        if (
          style.format &&
          !["general", "number", "currency", "percent"].includes(style.format)
        )
          throw new Error("Invalid number format.");
        if (
          style.decimals !== undefined &&
          (!Number.isInteger(style.decimals) ||
            style.decimals < 0 ||
            style.decimals > 6)
        )
          throw new Error("Invalid decimal places.");
      }
    }
    for (const [sizes, count, min, max] of [
      [sheet.widths, COLUMNS, 50, 400],
      [sheet.heights, ROWS, 24, 200],
    ] as const) {
      if (!sizes || typeof sizes !== "object" || Array.isArray(sizes))
        throw new Error("Invalid grid dimensions.");
      for (const [index, size] of Object.entries(sizes)) {
        if (
          !/^\d+$/.test(index) ||
          Number(index) >= count ||
          !Number.isFinite(size) ||
          size < min ||
          size > max
        )
          throw new Error("Invalid row or column size.");
      }
    }
  }
}

export function rangeCells(start: string, end: string): string[] {
  const a = position(start);
  const b = position(end);
  if (!a || !b) return [];
  const result: string[] = [];
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row++) {
    for (
      let column = Math.min(a.column, b.column);
      column <= Math.max(a.column, b.column);
      column++
    )
      result.push(address(row, column));
  }
  return result;
}
