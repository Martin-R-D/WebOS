import { address, position } from "../sheets/model";
import type { Worksheet } from "../sheets/model";
import type { CellValue } from "../sheets/formulas";
import type { SheetChart } from "./model";

export interface ChartData {
  labels: string[];
  series: { name: string; values: (number | null)[] }[];
  ignored: number;
}

export function chartData(
  sheet: Worksheet,
  chart: SheetChart,
  evaluate: (sheetId: string, key: string) => CellValue,
): ChartData {
  if (chart.sourceMissing)
    throw new Error(
      "The source range was deleted. Edit the chart to choose a new range.",
    );
  const a = position(chart.start);
  const b = position(chart.end);
  if (!a || !b) throw new Error("Choose a valid chart range.");
  const firstRow = Math.min(a.row, b.row);
  const lastRow = Math.max(a.row, b.row);
  const firstColumn = Math.min(a.column, b.column);
  const lastColumn = Math.max(a.column, b.column);
  const firstDataRow = firstRow + Number(chart.header);
  if (lastColumn <= firstColumn || lastRow < firstDataRow)
    throw new Error(
      "Select labels in the first column and numeric data in at least one other column.",
    );
  if (lastRow - firstDataRow + 1 > 200 || lastColumn - firstColumn > 8)
    throw new Error("Choose up to 200 data rows and 8 numeric series.");
  let ignored = 0;
  const labels = Array.from(
    { length: lastRow - firstDataRow + 1 },
    (_, offset) =>
      String(evaluate(sheet.id, address(firstDataRow + offset, firstColumn))) ||
      `Row ${firstDataRow + offset + 1}`,
  );
  const series = Array.from(
    { length: lastColumn - firstColumn },
    (_, offset) => {
      const column = firstColumn + offset + 1;
      const name = chart.header
        ? String(evaluate(sheet.id, address(firstRow, column))) ||
          `Series ${offset + 1}`
        : `Series ${offset + 1}`;
      const values = labels.map((_, index) => {
        const value = evaluate(sheet.id, address(firstDataRow + index, column));
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (value !== "") ignored++;
        return null;
      });
      return { name, values };
    },
  );
  if (!series.some((series) => series.values.some((value) => value !== null)))
    throw new Error("The selected range contains no numeric data.");
  if (
    chart.type === "pie" &&
    (series.length !== 1 ||
      ignored ||
      series[0].values.some((value) => value !== null && value < 0) ||
      !series[0].values.reduce<number>((sum, value) => sum + (value ?? 0), 0))
  )
    throw new Error(
      "Pie charts need one nonnegative numeric series with a total greater than zero.",
    );
  return { labels, series, ignored };
}
