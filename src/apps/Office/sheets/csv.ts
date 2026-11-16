import { address, COLUMNS, ROWS } from "./model";
import type { Worksheet } from "./model";

export function parseDelimited(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  const source = text.replace(/^\uFEFF/, "");
  function pushField() {
    row.push(field);
    if (row.length > COLUMNS)
      throw new Error(`Import supports up to ${COLUMNS} columns.`);
    field = "";
    afterQuote = false;
  }
  function pushRow() {
    pushField();
    rows.push(row);
    if (rows.length > ROWS)
      throw new Error(`Import supports up to ${ROWS} rows.`);
    row = [];
  }
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
        afterQuote = true;
      } else field += character;
    } else if (character === delimiter) pushField();
    else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index++;
      pushRow();
    } else if (character === '"' && !field && !afterQuote) quoted = true;
    else {
      if (afterQuote || character === '"')
        throw new Error("Malformed quoted CSV field.");
      field += character;
    }
    if (field.length > 10_000)
      throw new Error("A cell exceeds the 10,000 character limit.");
  }
  if (quoted) throw new Error("CSV contains an unfinished quoted field.");
  if (field || row.length || afterQuote || !rows.length) pushRow();
  return rows;
}

export function encodeDelimited(rows: string[][], delimiter = ","): string {
  return rows
    .map((row) =>
      row
        .map((value) =>
          value.includes(delimiter) || /["\r\n]/.test(value)
            ? `"${value.replaceAll('"', '""')}"`
            : value,
        )
        .join(delimiter),
    )
    .join("\r\n");
}

export function csvCells(rows: string[][]): Worksheet["cells"] {
  return Object.fromEntries(
    rows.flatMap((row, rowIndex) =>
      row.flatMap((raw, column) =>
        raw ? [[address(rowIndex, column), { raw }]] : [],
      ),
    ),
  );
}
