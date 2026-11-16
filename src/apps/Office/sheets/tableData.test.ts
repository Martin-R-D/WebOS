import { expect, it } from "vitest";
import { makeWorksheet, validateWorkbook } from "./model";
import { createEvaluator } from "./formulas";
import { sortTable, visibleRows } from "./tableData";
import type { TableSettings } from "./tableData";
import { changeStructure } from "./references";

function fixture() {
  const sheet = makeWorksheet();
  sheet.cells = {
    A1: { raw: "Name" },
    B1: { raw: "Amount" },
    C1: { raw: "Double" },
    A2: { raw: "Beta", style: { bold: true } },
    B2: { raw: "20" },
    C2: { raw: "=B2*2+$B$2" },
    A3: { raw: "Alpha" },
    B3: { raw: "10" },
    C3: { raw: "=B3*2+$B$2" },
    A4: { raw: "Alpha" },
    B4: { raw: "5" },
    C4: { raw: "=B4*2+$B$2" },
    D2: { raw: "outside" },
  };
  const table: TableSettings = {
    start: "A1",
    end: "C4",
    header: true,
    filters: [],
  };
  return { sheet, table };
}

it("sorts complete rows, adjusts relative formulas and leaves headers and outside cells intact", () => {
  const { sheet, table } = fixture();
  const result = sortTable(
    sheet,
    table,
    [
      { column: 0, descending: false },
      { column: 1, descending: false },
    ],
    createEvaluator({ sheets: [sheet] }),
  );
  expect(result.cells.B2.raw).toBe("5");
  expect(result.cells.C2.raw).toBe("=B2*2+$B$2");
  expect(result.cells.A4.style?.bold).toBe(true);
  expect(result.cells.A1.raw).toBe("Name");
  expect(result.cells.D2.raw).toBe("outside");
  expect(sheet.cells.A2.raw).toBe("Beta");
  expect(createEvaluator({ sheets: [result] })(result.id, "C2")).toBe(15);
});

it("keeps ties stable and blanks last in both directions", () => {
  const { sheet, table } = fixture();
  sheet.cells.B4.raw = "10";
  delete sheet.cells.B2;
  for (const descending of [false, true]) {
    const result = sortTable(
      sheet,
      table,
      [{ column: 1, descending }],
      createEvaluator({ sheets: [sheet] }),
    );
    expect(result.cells.C2.raw).toBe("=B2*2+$B$2");
    expect(result.cells.A4.raw).toBe("Beta");
  }
});

it("combines filters, preserves source addresses and calculates against hidden data", () => {
  const { sheet, table } = fixture();
  sheet.table = {
    ...table,
    filters: [
      { column: 0, type: "contains", value: "alpha", values: [] },
      { column: 1, type: "greater", value: "6", values: [] },
    ],
  };
  sheet.cells.D1 = { raw: "=SUM(B2:B4)" };
  const evaluate = createEvaluator({ sheets: [sheet] });
  const rows = visibleRows(sheet, evaluate);
  expect(rows).toContain(0);
  expect(rows).toContain(2);
  expect(rows).not.toContain(1);
  expect(rows).not.toContain(3);
  expect(evaluate(sheet.id, "D1")).toBe(35);
  expect(() => validateWorkbook({ sheets: [sheet] })).not.toThrow();
});

it("moves filter ranges and columns with structural changes and rejects corrupt settings", () => {
  const { sheet, table } = fixture();
  sheet.table = {
    ...table,
    filters: [{ column: 1, type: "nonblank", value: "", values: [] }],
  };
  const inserted = changeStructure(
    { sheets: [sheet] },
    sheet.id,
    "column",
    1,
    false,
  );
  expect(inserted.sheets[0].table?.end).toBe("D4");
  expect(inserted.sheets[0].table?.filters[0].column).toBe(2);
  const deleted = changeStructure(inserted, sheet.id, "column", 2, true);
  expect(deleted.sheets[0].table?.filters).toEqual([]);
  sheet.table.filters[0].column = 51;
  expect(() => validateWorkbook({ sheets: [sheet] })).toThrow();
});

it("handles zero visible rows and value/blank filters", () => {
  const { sheet } = fixture();
  sheet.table = {
    start: "A1",
    end: "AZ1000",
    header: false,
    filters: [{ column: 0, type: "values", value: "", values: [] }],
  };
  expect(visibleRows(sheet, createEvaluator({ sheets: [sheet] }))).toEqual([]);
  sheet.table.filters = [
    { column: 0, type: "values", value: "", values: ["Alpha"] },
  ];
  expect(visibleRows(sheet, createEvaluator({ sheets: [sheet] }))).toEqual([
    2, 3,
  ]);
  sheet.table.filters = [{ column: 0, type: "blank", value: "", values: [] }];
  expect(visibleRows(sheet, createEvaluator({ sheets: [sheet] }))[0]).toBe(4);
});
