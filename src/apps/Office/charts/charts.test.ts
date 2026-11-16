import { expect, it } from "vitest";
import { makeWorksheet, validateWorkbook } from "../sheets/model";
import { createEvaluator } from "../sheets/formulas";
import { changeStructure } from "../sheets/references";
import { chartData } from "./data";
import type { SheetChart } from "./model";

function fixture() {
  const sheet = makeWorksheet();
  sheet.cells = {
    A1: { raw: "Month" },
    B1: { raw: "Revenue" },
    A2: { raw: "Jan" },
    B2: { raw: "10" },
    A3: { raw: "Feb" },
    B3: { raw: "=B2*2" },
  };
  const chart: SheetChart = {
    id: "chart-1",
    title: "Revenue",
    type: "bar",
    start: "A1",
    end: "B3",
    header: true,
  };
  sheet.charts = [chart];
  return { sheet, chart };
}

it("extracts labels and live formula series and validates saved charts", () => {
  const { sheet, chart } = fixture();
  expect(chartData(sheet, chart, createEvaluator({ sheets: [sheet] }))).toEqual(
    {
      labels: ["Jan", "Feb"],
      series: [{ name: "Revenue", values: [10, 20] }],
      ignored: 0,
    },
  );
  sheet.cells.B2.raw = "15";
  expect(
    chartData(sheet, chart, createEvaluator({ sheets: [sheet] })).series[0]
      .values,
  ).toEqual([15, 30]);
  expect(() => validateWorkbook({ sheets: [sheet] })).not.toThrow();
});

it("rejects invalid pie values, empty and oversized ranges while marking line gaps", () => {
  const { sheet, chart } = fixture();
  sheet.cells.B2.raw = "-10";
  expect(() =>
    chartData(
      sheet,
      { ...chart, type: "pie" },
      createEvaluator({ sheets: [sheet] }),
    ),
  ).toThrow("nonnegative");
  sheet.cells.B2.raw = "text";
  sheet.cells.B3.raw = "20";
  expect(
    chartData(sheet, chart, createEvaluator({ sheets: [sheet] })).ignored,
  ).toBe(1);
  expect(() =>
    chartData(
      sheet,
      { ...chart, end: "A3" },
      createEvaluator({ sheets: [sheet] }),
    ),
  ).toThrow();
  expect(() =>
    chartData(
      sheet,
      { ...chart, end: "B999" },
      createEvaluator({ sheets: [sheet] }),
    ),
  ).toThrow();
});

it("updates chart ranges and reports deleted sources", () => {
  const { sheet } = fixture();
  const inserted = changeStructure(
    { sheets: [sheet] },
    sheet.id,
    "row",
    2,
    false,
  );
  expect(inserted.sheets[0].charts![0].end).toBe("B4");
  const oneColumn = {
    ...sheet,
    charts: [{ ...sheet.charts![0], start: "B1", end: "B3" }],
  };
  const deleted = changeStructure(
    { sheets: [oneColumn] },
    sheet.id,
    "column",
    1,
    true,
  );
  expect(deleted.sheets[0].charts![0].sourceMissing).toBe(true);
  expect(() =>
    chartData(
      deleted.sheets[0],
      deleted.sheets[0].charts![0],
      createEvaluator(deleted),
    ),
  ).toThrow("deleted");
});
