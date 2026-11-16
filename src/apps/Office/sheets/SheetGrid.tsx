import { useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { address, COLUMNS, columnName, position, ROWS } from "./model";
import type { Worksheet } from "./model";
import { formatCell } from "./formulas";
import type { CellValue } from "./formulas";

export function SheetGrid({
  sheet,
  start,
  end,
  onSelect,
  onEdit,
  onPaste,
  onCopy,
  evaluate,
  rows,
}: {
  rows: number[];
  sheet: Worksheet;
  start: string;
  end: string;
  onSelect: (key: string, extend: boolean) => void;
  onEdit: (key: string, raw: string) => void;
  onPaste: (text: string) => void;
  onCopy: () => string;
  evaluate: (sheetId: string, key: string) => CellValue;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const rowOffsets = useMemo(() => {
    const offsets = [32];
    for (let index = 0; index < rows.length; index++)
      offsets.push(offsets[index] + (sheet.heights[rows[index]] ?? 28));
    return offsets;
  }, [sheet.heights, rows]);
  const columnOffsets = useMemo(() => {
    const offsets = [48];
    for (let column = 0; column < COLUMNS; column++)
      offsets.push(offsets[column] + (sheet.widths[column] ?? 100));
    return offsets;
  }, [sheet.widths]);
  const first = Math.max(
    0,
    rowOffsets.findIndex((top) => top >= scrollTop) - 3,
  );
  const last = Math.min(
    rows.length,
    first + Math.ceil((viewport.current?.clientHeight ?? 600) / 24) + 8,
  );
  const a = position(start)!;
  const b = position(end)!;

  function begin(key: string, raw = sheet.cells[key]?.raw ?? "") {
    setEditing(key);
    setDraft(raw);
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    const location = position(key)!;
    const delta = {
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[event.key];
    if (delta) {
      event.preventDefault();
      const nextRow = Math.max(
        0,
        Math.min(
          ROWS - 1,
          delta[0]
            ? rows[
                Math.max(
                  0,
                  Math.min(
                    rows.length - 1,
                    rows.indexOf(location.row) + delta[0],
                  ),
                )
              ]
            : location.row,
        ),
      );
      const nextColumn = Math.max(
        0,
        Math.min(COLUMNS - 1, location.column + delta[1]),
      );
      const next = address(nextRow, nextColumn);
      onSelect(next, event.shiftKey);
      viewport.current?.scrollTo({
        top: Math.max(0, rowOffsets[Math.max(0, rows.indexOf(nextRow))] - 80),
        left: Math.max(0, columnOffsets[nextColumn] - 100),
      });
      requestAnimationFrame(() =>
        viewport.current
          ?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)
          ?.focus(),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      begin(key);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onEdit(key, "");
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      begin(key, event.key);
    }
  }

  return (
    <div
      ref={viewport}
      className="sheets__grid"
      role="grid"
      aria-label={sheet.name}
      aria-rowcount={ROWS}
      aria-colcount={COLUMNS}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      onPaste={(event) => {
        if (
          event.target instanceof HTMLInputElement &&
          !/[\t\r\n]/.test(event.clipboardData.getData("text/plain"))
        )
          return;
        event.preventDefault();
        onPaste(event.clipboardData.getData("text/plain"));
      }}
      onCopy={(event) => {
        if (event.target instanceof HTMLInputElement) return;
        event.preventDefault();
        event.clipboardData.setData("text/plain", onCopy());
      }}
    >
      <div
        style={{
          width: columnOffsets[COLUMNS],
          height: rowOffsets[rows.length],
          position: "relative",
        }}
      >
        <div
          className="sheets__column-headers"
          style={{ height: 32, width: columnOffsets[COLUMNS] }}
        >
          <span style={{ width: 48 }}>#</span>
          {Array.from({ length: COLUMNS }, (_, column) => (
            <button
              key={column}
              role="columnheader"
              style={{ width: sheet.widths[column] ?? 100 }}
              onClick={() => onSelect(address(a.row, column), false)}
            >
              {columnName(column)}
            </button>
          ))}
        </div>
        {Array.from({ length: last - first }, (_, offset) => {
          const row = rows[first + offset];
          const height = sheet.heights[row] ?? 28;
          return (
            <div
              key={row}
              role="row"
              aria-rowindex={row + 1}
              style={{
                position: "absolute",
                top: rowOffsets[first + offset],
                height,
                left: 0,
                width: columnOffsets[COLUMNS],
              }}
            >
              <button
                className="sheets__row-header"
                role="rowheader"
                style={{ height }}
                onClick={() => onSelect(address(row, a.column), false)}
              >
                {row + 1}
              </button>
              {Array.from({ length: COLUMNS }, (_, column) => {
                const key = address(row, column);
                const cell = sheet.cells[key];
                const selected =
                  row >= Math.min(a.row, b.row) &&
                  row <= Math.max(a.row, b.row) &&
                  column >= Math.min(a.column, b.column) &&
                  column <= Math.max(a.column, b.column);
                const style: CSSProperties = {
                  position: "absolute",
                  left: columnOffsets[column],
                  width: sheet.widths[column] ?? 100,
                  height,
                  fontWeight: cell?.style?.bold ? "bold" : "normal",
                  fontStyle: cell?.style?.italic ? "italic" : "normal",
                  color: cell?.style?.color ?? "#202020",
                  background: cell?.style?.fill ?? "#ffffff",
                  textAlign: cell?.style?.align ?? "left",
                  whiteSpace: cell?.style?.wrap ? "pre-wrap" : "nowrap",
                  border: cell?.style?.border ? "1px solid #444" : undefined,
                  outline: selected
                    ? "2px solid var(--color-accent)"
                    : undefined,
                  outlineOffset: -2,
                };
                if (editing === key)
                  return (
                    <input
                      autoFocus
                      key={key}
                      className="sheets__cell"
                      aria-label={`Edit ${key}`}
                      style={style}
                      value={draft}
                      maxLength={10_000}
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={() => {
                        onEdit(key, draft);
                        setEditing(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                        if (event.key === "Escape") {
                          setEditing(null);
                        }
                      }}
                    />
                  );
                return (
                  <button
                    key={key}
                    className="sheets__cell"
                    data-cell={key}
                    role="gridcell"
                    aria-label={key}
                    aria-selected={selected}
                    aria-colindex={column + 1}
                    style={style}
                    onClick={(event) => onSelect(key, event.shiftKey)}
                    onDoubleClick={() => begin(key)}
                    onKeyDown={(event) => keyDown(event, key)}
                  >
                    {formatCell(evaluate(sheet.id, key), cell?.style)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
