import "./SheetsDesign.css";
import { ChartsPanel } from "./charts/ChartsPanel";
import { TablePanel } from "./sheets/TablePanel";
import { visibleRows } from "./sheets/tableData";
import { useMemo, useRef, useState } from "react";
import type { AppProps } from "../../types";
import { Modal } from "../../shell/Modal/Modal";
import { downloadDocument } from "./documents";
import { OfficeFrame } from "./OfficeFrame";
import { useOfficeDocument } from "./useOfficeDocument";
import { useDocumentHistory } from "./useDocumentHistory";
import {
  address,
  COLUMNS,
  makeWorksheet,
  position,
  rangeCells,
  ROWS,
  validSheetName,
  validateWorkbook,
} from "./sheets/model";
import type { CellStyle, Workbook, Worksheet } from "./sheets/model";
import { createEvaluator, formatCell } from "./sheets/formulas";
import {
  changeStructure,
  copyFormula,
  deleteWorksheet,
  renameSheet,
} from "./sheets/references";
import { csvCells, encodeDelimited, parseDelimited } from "./sheets/csv";
import { SheetGrid } from "./sheets/SheetGrid";
import "./Sheets.css";

export function Sheets(props: AppProps) {
  const [initial] = useState(() => ({ sheets: [makeWorksheet()] }));
  const doc = useOfficeDocument("sheets", props, initial, validateWorkbook);
  const history = useDocumentHistory(doc.content, doc.setContent);
  const workbook = doc.content as unknown as Workbook;
  const [activeId, setActiveId] = useState(workbook.sheets[0].id);
  const sheet =
    workbook.sheets.find((item) => item.id === activeId) ?? workbook.sheets[0];
  const [start, setStart] = useState("A1");
  const [end, setEnd] = useState("A1");
  const [range, setRange] = useState("A1");
  const [edit, setEdit] = useState<{ key: string; raw: string } | null>(null);
  const [rename, setRename] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [csvExport, setCsvExport] = useState(false);
  const [clipboard, setClipboard] = useState<{
    text: string;
    start: string;
    cells: Worksheet["cells"];
  } | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [chartsOpen, setChartsOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [visibleOnly, setVisibleOnly] = useState(true);
  const [feedback, setFeedback] = useState("");
  const csvInput = useRef<HTMLInputElement>(null);
  const evaluate = useMemo(() => createEvaluator(workbook), [workbook]);
  const filteredRows = useMemo(
    () => visibleRows(sheet, evaluate),
    [sheet, evaluate],
  );
  const visibleSet = useMemo(() => new Set(filteredRows), [filteredRows]);
  const location = position(start)!;
  const current = sheet.cells[start];

  function updateWorkbook(next: Workbook) {
    history.update({ sheets: next.sheets });
  }

  function updateSheet(next: Worksheet) {
    updateWorkbook({
      sheets: workbook.sheets.map((item) =>
        item.id === sheet.id ? next : item,
      ),
    });
  }

  function editCell(key: string, raw: string) {
    if ((sheet.cells[key]?.raw ?? "") === raw) return;
    const cells = { ...sheet.cells };
    if (!raw && !cells[key]?.style) delete cells[key];
    else cells[key] = { ...cells[key], raw };
    updateSheet({ ...sheet, cells });
  }

  function select(key: string, extend: boolean) {
    if (!extend) setStart(key);
    setEnd(key);
    setRange(extend ? `${start}:${key}` : key);
    setEdit(null);
  }

  function format(style: CellStyle) {
    const cells = { ...sheet.cells };
    for (const key of rangeCells(start, end).filter((key) =>
      visibleSet.has(position(key)!.row),
    ))
      cells[key] = {
        raw: cells[key]?.raw ?? "",
        style: { ...cells[key]?.style, ...style },
      };
    updateSheet({ ...sheet, cells });
  }

  function copyText() {
    const a = position(start)!;
    const b = position(end)!;
    const rows: string[][] = [];
    for (
      let row = Math.min(a.row, b.row);
      row <= Math.max(a.row, b.row);
      row++
    ) {
      if (visibleOnly && !visibleSet.has(row)) continue;
      const values: string[] = [];
      for (
        let column = Math.min(a.column, b.column);
        column <= Math.max(a.column, b.column);
        column++
      )
        values.push(
          formatCell(
            evaluate(sheet.id, address(row, column)),
            sheet.cells[address(row, column)]?.style,
          ),
        );
      rows.push(values);
    }
    return encodeDelimited(rows, "\t");
  }

  function captureCopy() {
    const text = copyText();
    const a = position(start)!;
    const b = position(end)!;
    if (sheet.table?.filters.length) {
      setClipboard(null);
      return text;
    }
    setClipboard({
      text,
      start: address(Math.min(a.row, b.row), Math.min(a.column, b.column)),
      cells: structuredClone(sheet.cells),
    });
    return text;
  }

  function paste(text: string) {
    try {
      if (sheet.table?.filters.length)
        throw new Error("Clear filters before pasting rectangular data.");
      const rows = parseDelimited(text, "\t");
      const height = rows.length;
      const width = Math.max(...rows.map((row) => row.length));
      if (location.row + height > ROWS || location.column + width > COLUMNS)
        throw new Error("Pasted data exceeds the grid boundaries.");
      const cells = { ...sheet.cells };
      const internal = clipboard?.text === text ? clipboard : null;
      const origin = internal ? position(internal.start)! : null;
      rows.forEach((row, offsetRow) =>
        row.forEach((raw, offsetColumn) => {
          const key = address(
            location.row + offsetRow,
            location.column + offsetColumn,
          );
          const original =
            internal && origin
              ? internal.cells[
                  address(origin.row + offsetRow, origin.column + offsetColumn)
                ]
              : undefined;
          cells[key] =
            original && origin
              ? {
                  ...original,
                  style: original.style ? { ...original.style } : undefined,
                  raw: copyFormula(
                    original.raw,
                    location.row - origin.row,
                    location.column - origin.column,
                  ),
                }
              : { ...cells[key], raw };
        }),
      );
      updateSheet({ ...sheet, cells });
      setPasteOpen(false);
      setFeedback("Pasted selection.");
    } catch (cause) {
      doc.setError(
        cause instanceof Error ? cause.message : "Unable to paste data.",
      );
    }
  }

  function structure(axis: "row" | "column", deleting: boolean) {
    try {
      updateWorkbook(
        changeStructure(workbook, sheet.id, axis, location[axis], deleting),
      );
    } catch (cause) {
      doc.setError(
        cause instanceof Error ? cause.message : "Unable to modify the grid.",
      );
    }
  }

  function addSheet() {
    let number = 1;
    while (
      workbook.sheets.some(
        (item) => item.name.toLowerCase() === `sheet${number}`,
      )
    )
      number++;
    const next = makeWorksheet(`Sheet${number}`);
    updateWorkbook({ sheets: [...workbook.sheets, next] });
    setActiveId(next.id);
    select("A1", false);
  }

  function exportCsv() {
    const keys = Object.keys(sheet.cells).filter(
      (key) => sheet.cells[key].raw !== "",
    );
    const lastRow = Math.max(0, ...keys.map((key) => position(key)!.row));
    const lastColumn = Math.max(0, ...keys.map((key) => position(key)!.column));
    const rows = Array.from({ length: lastRow + 1 }, (_, row) => row)
      .filter((row) => !visibleOnly || visibleSet.has(row))
      .map((row) =>
        Array.from({ length: lastColumn + 1 }, (_, column) => {
          const key = address(row, column);
          return formatCell(evaluate(sheet.id, key), sheet.cells[key]?.style);
        }),
      );
    downloadDocument(
      `${sheet.name}.csv`,
      encodeDelimited(rows),
      "text/csv;charset=utf-8",
    );
    setCsvExport(false);
  }

  return (
    <OfficeFrame
      kind="sheets"
      document={doc}
      extra={
        <>
          <button
            onClick={() => csvInput.current?.click()}
            disabled={workbook.sheets.length >= 20}
          >
            Import CSV
          </button>
          <button onClick={() => setCsvExport(true)}>Export CSV</button>
        </>
      }
    >
      <div className="office__toolbar" aria-label="Data tools">
        <button
          aria-pressed={chartsOpen}
          onClick={() => {
            setChartsOpen((open) => !open);
            setDataOpen(false);
          }}
        >
          Charts
        </button>
        <button
          aria-pressed={dataOpen}
          onClick={() => {
            setDataOpen((open) => !open);
            setChartsOpen(false);
          }}
        >
          Sort and filter
        </button>
      </div>
      {Boolean(sheet.table?.filters.length) && (
        <div className="office__toolbar">
          <strong>Filters active</strong>
          <label>
            <input
              type="checkbox"
              checked={visibleOnly}
              onChange={(event) => setVisibleOnly(event.target.checked)}
            />
            Copy and export visible rows only
          </label>
          <button
            onClick={() =>
              updateSheet({ ...sheet, table: { ...sheet.table!, filters: [] } })
            }
          >
            Show all rows
          </button>
        </div>
      )}
      {dataOpen && (
        <TablePanel
          sheet={sheet}
          start={start}
          end={end}
          evaluate={evaluate}
          onClose={() => setDataOpen(false)}
          onChange={(next) => {
            updateSheet(next);
            const visible = visibleRows(next, evaluate);
            if (visible.length && !visible.includes(location.row))
              select(
                address(
                  visible.find((row) => row >= location.row) ?? visible[0],
                  location.column,
                ),
                false,
              );
          }}
        />
      )}
      {!dataOpen && (
        <div className="office__toolbar" aria-label="Spreadsheet tools">
          <label>
            Range{" "}
            <input
              aria-label="Selected range"
              className="sheets__range"
              value={range}
              onChange={(event) => {
                const value = event.target.value.toUpperCase();
                setRange(value);
                const parts = value.split(":");
                if (
                  parts.length <= 2 &&
                  position(parts[0]) &&
                  position(parts[1] ?? parts[0])
                ) {
                  setStart(parts[0].replaceAll("$", ""));
                  setEnd((parts[1] ?? parts[0]).replaceAll("$", ""));
                  setEdit(null);
                }
              }}
            />
          </label>
          <label className="sheets__formula-label">
            Formula / value{" "}
            <input
              aria-label="Formula or value"
              disabled={!visibleSet.has(location.row)}
              value={edit?.key === start ? edit.raw : (current?.raw ?? "")}
              maxLength={10_000}
              onChange={(event) =>
                setEdit({ key: start, raw: event.target.value })
              }
              onBlur={() => {
                if (edit) editCell(edit.key, edit.raw);
                setEdit(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") setEdit(null);
              }}
            />
          </label>
          <button
            onClick={() => {
              if (edit) {
                editCell(edit.key, edit.raw);
                setEdit(null);
              }
            }}
          >
            Apply value
          </button>
          <button
            aria-pressed={Boolean(current?.style?.bold)}
            onClick={() => format({ bold: !current?.style?.bold })}
          >
            Bold
          </button>
          <button
            aria-pressed={Boolean(current?.style?.italic)}
            onClick={() => format({ italic: !current?.style?.italic })}
          >
            Italic
          </button>
          <label>
            Text{" "}
            <input
              aria-label="Cell text color"
              type="color"
              value={current?.style?.color ?? "#202020"}
              onChange={(event) => format({ color: event.target.value })}
            />
          </label>
          <label>
            Fill{" "}
            <input
              aria-label="Cell background"
              type="color"
              value={current?.style?.fill ?? "#ffffff"}
              onChange={(event) => format({ fill: event.target.value })}
            />
          </label>
          <select
            aria-label="Cell alignment"
            value={current?.style?.align ?? "left"}
            onChange={(event) =>
              format({ align: event.target.value as CellStyle["align"] })
            }
          >
            {["left", "center", "right"].map((align) => (
              <option key={align}>{align}</option>
            ))}
          </select>
          <button
            aria-pressed={Boolean(current?.style?.wrap)}
            onClick={() => format({ wrap: !current?.style?.wrap })}
          >
            Wrap
          </button>
          <button
            aria-pressed={Boolean(current?.style?.border)}
            onClick={() => format({ border: !current?.style?.border })}
          >
            Borders
          </button>
          <select
            aria-label="Number format"
            value={current?.style?.format ?? "general"}
            onChange={(event) =>
              format({ format: event.target.value as CellStyle["format"] })
            }
          >
            <option value="general">General</option>
            <option value="number">Number</option>
            <option value="currency">Currency (USD)</option>
            <option value="percent">Percentage</option>
          </select>
          <label>
            Decimals{" "}
            <input
              aria-label="Decimal places"
              type="number"
              min="0"
              max="6"
              value={current?.style?.decimals ?? 2}
              onChange={(event) =>
                format({
                  decimals: Math.max(
                    0,
                    Math.min(6, Math.round(Number(event.target.value))),
                  ),
                })
              }
            />
          </label>
          <button
            onClick={() => {
              const text = captureCopy();
              void navigator.clipboard?.writeText(text).then(
                () => setFeedback("Copied selection."),
                () => setFeedback("Selection copied within Sheets."),
              );
              setFeedback("Selection copied within Sheets.");
            }}
          >
            Copy selection
          </button>
          <button
            onClick={() => {
              setPasteText(clipboard?.text ?? "");
              setPasteOpen(true);
            }}
          >
            Paste data
          </button>
          <button
            onClick={() => {
              const cells = { ...sheet.cells };
              for (const key of rangeCells(start, end).filter((key) =>
                visibleSet.has(position(key)!.row),
              )) {
                if (cells[key]?.style)
                  cells[key] = { raw: "", style: cells[key].style };
                else delete cells[key];
              }
              updateSheet({ ...sheet, cells });
            }}
          >
            Clear contents
          </button>
          <button disabled={!history.canUndo} onClick={history.undo}>
            Undo
          </button>
          <button disabled={!history.canRedo} onClick={history.redo}>
            Redo
          </button>
        </div>
      )}
      {!dataOpen && (
        <div className="office__toolbar sheets__dimensions">
          <label>
            Column width{" "}
            <input
              aria-label="Column width"
              type="number"
              min="50"
              max="400"
              key={`column-${location.column}-${sheet.widths[location.column] ?? 100}`}
              defaultValue={sheet.widths[location.column] ?? 100}
              onBlur={(event) =>
                updateSheet({
                  ...sheet,
                  widths: {
                    ...sheet.widths,
                    [location.column]: Math.max(
                      50,
                      Math.min(400, Number(event.target.value)),
                    ),
                  },
                })
              }
            />
          </label>
          <label>
            Row height{" "}
            <input
              aria-label="Row height"
              type="number"
              min="24"
              max="200"
              key={`row-${location.row}-${sheet.heights[location.row] ?? 28}`}
              defaultValue={sheet.heights[location.row] ?? 28}
              onBlur={(event) =>
                updateSheet({
                  ...sheet,
                  heights: {
                    ...sheet.heights,
                    [location.row]: Math.max(
                      24,
                      Math.min(200, Number(event.target.value)),
                    ),
                  },
                })
              }
            />
          </label>
          <button
            disabled={!visibleSet.has(location.row)}
            onClick={() => structure("row", false)}
          >
            Insert row above
          </button>
          <button
            disabled={!visibleSet.has(location.row)}
            onClick={() => structure("row", true)}
          >
            Delete row
          </button>
          <button
            disabled={!visibleSet.has(location.row)}
            onClick={() => structure("column", false)}
          >
            Insert column before
          </button>
          <button
            disabled={!visibleSet.has(location.row)}
            onClick={() => structure("column", true)}
          >
            Delete column
          </button>
        </div>
      )}
      {dataOpen && (
        <div className="office__toolbar">
          <button disabled={!history.canUndo} onClick={history.undo}>
            Undo
          </button>
          <button disabled={!history.canRedo} onClick={history.redo}>
            Redo
          </button>
        </div>
      )}
      <SheetGrid
        key={sheet.id}
        sheet={sheet}
        rows={filteredRows}
        start={start}
        end={end}
        onSelect={select}
        onEdit={editCell}
        onPaste={paste}
        onCopy={captureCopy}
        evaluate={evaluate}
      />
      {chartsOpen && (
        <ChartsPanel
          key={`charts-${sheet.id}`}
          sheet={sheet}
          start={start}
          end={end}
          evaluate={evaluate}
          onChange={updateSheet}
          onClose={() => setChartsOpen(false)}
        />
      )}
      <nav className="sheets__tabs" aria-label="Workbook sheets">
        {workbook.sheets.map((item) => (
          <button
            key={item.id}
            aria-current={item.id === sheet.id ? "true" : undefined}
            onClick={() => {
              setActiveId(item.id);
              select("A1", false);
            }}
          >
            {item.name}
          </button>
        ))}
        <button disabled={workbook.sheets.length >= 20} onClick={addSheet}>
          Add sheet
        </button>
        <button onClick={() => setRename(sheet.name)}>Rename sheet</button>
        <button
          disabled={workbook.sheets.length === 1}
          onClick={() => setDeleting(true)}
        >
          Delete sheet
        </button>
        <button
          disabled={workbook.sheets[0].id === sheet.id}
          onClick={() => {
            const next = [...workbook.sheets];
            const index = next.findIndex((item) => item.id === sheet.id);
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            updateWorkbook({ sheets: next });
          }}
        >
          Move sheet earlier
        </button>
      </nav>
      <footer role="status">
        {feedback || `${start} · ${ROWS} rows × ${COLUMNS} columns`}
      </footer>
      <input
        hidden
        ref={csvInput}
        type="file"
        accept=".csv,text/csv"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 4_000_000)
              throw new Error("CSV imports must be smaller than 4 MB.");
            const rows = parseDelimited(await file.text());
            let number = 1;
            while (
              workbook.sheets.some(
                (item) => item.name.toLowerCase() === `import${number}`,
              )
            )
              number++;
            const imported = {
              ...makeWorksheet(`Import${number}`),
              cells: csvCells(rows),
            };
            updateWorkbook({ sheets: [...workbook.sheets, imported] });
            setActiveId(imported.id);
            select("A1", false);
          } catch (cause) {
            doc.setError(
              cause instanceof Error ? cause.message : "CSV import failed.",
            );
          }
          if (csvInput.current) csvInput.current.value = "";
        }}
      />
      {rename !== null && (
        <Modal
          className="office__dialog"
          label="Rename sheet"
          onClose={() => setRename(null)}
        >
          <label>
            Sheet name{" "}
            <input
              aria-label="Sheet name"
              value={rename}
              maxLength={31}
              onChange={(event) => setRename(event.target.value)}
            />
          </label>
          <button
            onClick={() => {
              if (!validSheetName(rename, workbook.sheets, sheet.id)) {
                doc.setError(
                  "Choose a unique sheet name with 1–31 characters, without punctuation such as brackets, apostrophes or slashes.",
                );
                return;
              }
              updateWorkbook(renameSheet(workbook, sheet.id, rename));
              setRename(null);
            }}
          >
            Rename
          </button>
          <button onClick={() => setRename(null)}>Cancel</button>
        </Modal>
      )}
      {deleting && (
        <Modal
          className="office__dialog"
          label="Delete sheet"
          onClose={() => setDeleting(false)}
        >
          <p>Delete {sheet.name}? References to its cells will show #REF!.</p>
          <button
            onClick={() => {
              updateWorkbook(deleteWorksheet(workbook, sheet.id));
              setActiveId(
                workbook.sheets.find((item) => item.id !== sheet.id)!.id,
              );
              select("A1", false);
              setDeleting(false);
            }}
          >
            Delete
          </button>
          <button onClick={() => setDeleting(false)}>Cancel</button>
        </Modal>
      )}
      {pasteOpen && (
        <Modal
          className="office__dialog"
          label="Paste spreadsheet data"
          onClose={() => setPasteOpen(false)}
        >
          <p>
            Paste tab-separated cells or use the selection copied within Sheets.
          </p>
          <textarea
            aria-label="Data to paste"
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
          />
          <button onClick={() => paste(pasteText)}>Paste</button>
          <button onClick={() => setPasteOpen(false)}>Cancel</button>
        </Modal>
      )}
      {csvExport && (
        <Modal
          className="office__dialog"
          label="Export CSV"
          onClose={() => setCsvExport(false)}
        >
          <p>
            Export {sheet.name} as displayed values? CSV does not preserve
            formulas, formatting or other sheets. Save a .wsheet file to keep
            them.
          </p>
          {Boolean(sheet.table?.filters.length) && (
            <p>
              {visibleOnly
                ? "Only visible rows will be exported."
                : "All rows, including hidden rows, will be exported."}
            </p>
          )}
          <button onClick={exportCsv}>Export</button>
          <button onClick={() => setCsvExport(false)}>Cancel</button>
        </Modal>
      )}
    </OfficeFrame>
  );
}
