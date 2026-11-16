import { useState } from "react";
import { address, columnName } from "./model";
import type { Worksheet } from "./model";
import type { CellValue } from "./formulas";
import { sortTable, tableBounds, visibleRows } from "./tableData";
import type { TableFilter, TableSettings } from "./tableData";

export function TablePanel({
  sheet,
  start,
  end,
  onChange,
  evaluate,
  onClose,
}: {
  sheet: Worksheet;
  start: string;
  end: string;
  onChange: (sheet: Worksheet) => void;
  evaluate: (id: string, key: string) => CellValue;
  onClose: () => void;
}) {
  const [header, setHeader] = useState(sheet.table?.header ?? true);
  const [column, setColumn] = useState("");
  const [secondary, setSecondary] = useState("");
  const [descending, setDescending] = useState(false);
  const [secondaryDescending, setSecondaryDescending] = useState(false);
  const [type, setType] = useState<TableFilter["type"]>("contains");
  const [value, setValue] = useState("");
  const [values, setValues] = useState<string[]>([]);
  const table: TableSettings = sheet.table ?? {
    start,
    end,
    header,
    filters: [],
  };
  const bounds = tableBounds(table);
  const columns = Array.from(
    { length: bounds.lastColumn - bounds.firstColumn + 1 },
    (_, index) => bounds.firstColumn + index,
  );
  const selectedColumn =
    columns.includes(Number(column)) && column !== ""
      ? Number(column)
      : columns[0];
  const options = Array.from(
    new Set(
      Array.from(
        {
          length: Math.max(
            0,
            bounds.lastRow - bounds.firstRow + 1 - Number(table.header),
          ),
        },
        (_, index) =>
          String(
            evaluate(
              sheet.id,
              address(
                bounds.firstRow + Number(table.header) + index,
                selectedColumn,
              ),
            ),
          ),
      ),
    ),
  ).sort();
  const visible = visibleRows(sheet, evaluate).filter(
    (row) =>
      row >= bounds.firstRow + Number(table.header) && row <= bounds.lastRow,
  ).length;
  const label = (column: number) =>
    `${columnName(column)}${table.header ? `: ${evaluate(sheet.id, address(bounds.firstRow, column))}` : ""}`;

  return (
    <div className="office__toolbar sheets__data" aria-label="Sort and filter">
      <strong>
        Table {table.start}:{table.end}
      </strong>
      <button
        onClick={() =>
          onChange({ ...sheet, table: { start, end, header, filters: [] } })
        }
      >
        Use selected range
      </button>
      <label>
        <input
          type="checkbox"
          checked={table.header}
          onChange={(event) => {
            setHeader(event.target.checked);
            onChange({
              ...sheet,
              table: { ...table, header: event.target.checked },
            });
          }}
        />
        First row is headers
      </label>
      <select
        aria-label="Sort or filter column"
        value={selectedColumn}
        onChange={(event) => {
          setColumn(event.target.value);
          setValues([]);
        }}
      >
        {columns.map((column) => (
          <option key={column} value={column}>
            {label(column)}
          </option>
        ))}
      </select>
      <label>
        <input
          type="checkbox"
          checked={descending}
          onChange={(event) => setDescending(event.target.checked)}
        />
        Descending
      </label>
      <select
        aria-label="Secondary sort column"
        value={secondary}
        onChange={(event) => setSecondary(event.target.value)}
      >
        <option value="">No secondary sort</option>
        {columns.map((column) => (
          <option key={column} value={column}>
            {label(column)}
          </option>
        ))}
      </select>
      <label>
        <input
          type="checkbox"
          checked={secondaryDescending}
          onChange={(event) => setSecondaryDescending(event.target.checked)}
        />
        Secondary descending
      </label>
      <button
        onClick={() =>
          onChange(
            sortTable(
              sheet,
              table,
              [
                { column: selectedColumn, descending },
                ...(secondary && columns.includes(Number(secondary))
                  ? [
                      {
                        column: Number(secondary),
                        descending: secondaryDescending,
                      },
                    ]
                  : []),
              ],
              evaluate,
            ),
          )
        }
      >
        Sort table
      </button>
      <select
        aria-label="Filter condition"
        value={type}
        onChange={(event) => setType(event.target.value as TableFilter["type"])}
      >
        <option value="contains">Text contains</option>
        <option value="values">Selected values</option>
        <option value="greater">Greater than</option>
        <option value="less">Less than</option>
        <option value="blank">Blank</option>
        <option value="nonblank">Nonblank</option>
      </select>
      {["contains", "greater", "less"].includes(type) && (
        <input
          aria-label="Filter value"
          value={value}
          type={type === "contains" ? "text" : "number"}
          onChange={(event) => setValue(event.target.value)}
        />
      )}
      {type === "values" && (
        <div className="sheets__filter-values">
          {options.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={values.includes(item)}
                onChange={(event) =>
                  setValues(
                    event.target.checked
                      ? [...values, item]
                      : values.filter((value) => value !== item),
                  )
                }
              />
              {item || "(blank)"}
            </label>
          ))}
        </div>
      )}
      <button
        disabled={
          (type === "greater" || type === "less") &&
          (!value.trim() || !Number.isFinite(Number(value)))
        }
        onClick={() =>
          onChange({
            ...sheet,
            table: {
              ...table,
              filters: [
                ...table.filters.filter(
                  (filter) => filter.column !== selectedColumn,
                ),
                { column: selectedColumn, type, value, values },
              ],
            },
          })
        }
      >
        Apply filter
      </button>
      {table.filters.map((filter) => (
        <button
          key={filter.column}
          onClick={() =>
            onChange({
              ...sheet,
              table: {
                ...table,
                filters: table.filters.filter((item) => item !== filter),
              },
            })
          }
        >
          Remove {columnName(filter.column)} filter
        </button>
      ))}
      <button
        disabled={!table.filters.length}
        onClick={() => onChange({ ...sheet, table: { ...table, filters: [] } })}
      >
        Clear filters
      </button>
      <span>
        {visible} of{" "}
        {Math.max(
          0,
          bounds.lastRow - bounds.firstRow + 1 - Number(table.header),
        )}{" "}
        table rows visible
      </span>
      <button onClick={onClose}>Close data panel</button>
    </div>
  );
}
