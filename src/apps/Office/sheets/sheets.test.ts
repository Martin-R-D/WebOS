import { expect, it } from "vitest";
import { address, makeWorksheet, position, validateWorkbook } from "./model";
import { createEvaluator, formatCell } from "./formulas";
import {
  copyFormula,
  changeStructure,
  renameSheet,
  deleteWorksheet,
} from "./references";
import { encodeDelimited, parseDelimited } from "./csv";

function fixture() {
  const sheet = makeWorksheet();
  sheet.cells = { A1: { raw: "10" }, A2: { raw: "20" }, A3: { raw: "text" } };
  return { sheets: [sheet, makeWorksheet("Other sheet")] };
}

it("calculates arithmetic, functions, comparisons and cross-sheet references", () => {
  const workbook = fixture();
  const sheet = workbook.sheets[0];
  const formulas = {
    B1: ["=A1+A2*2", 50],
    B2: ["=SUM(A1:A4)", 30],
    B3: ["=AVERAGE(A1:A4)", 15],
    B4: ["=COUNT(A1:A4)", 2],
    B5: ["=MIN(A1:A2)+MAX(A1:A2)", 30],
    B6: ['=IF(A1>5,"yes","no")', "yes"],
    B7: ["='Other sheet'!A1+1", 8],
    B8: ["=$A$1/2", 5],
  };
  workbook.sheets[1].cells.A1 = { raw: "7" };
  for (const [key, [raw]] of Object.entries(formulas))
    sheet.cells[key] = { raw: String(raw) };
  const evaluate = createEvaluator(workbook);
  for (const [key, [, value]] of Object.entries(formulas))
    expect(evaluate(sheet.id, key), key).toBe(value);
});

it("recalculates edits and reports cycles, invalid formulas, references and division by zero", () => {
  const workbook = fixture();
  const sheet = workbook.sheets[0];
  sheet.cells.B1 = { raw: "=A1*2" };
  expect(createEvaluator(workbook)(sheet.id, "B1")).toBe(20);
  sheet.cells.A1 = { raw: "12" };
  expect(createEvaluator(workbook)(sheet.id, "B1")).toBe(24);
  sheet.cells.C1 = { raw: "=C2" };
  sheet.cells.C2 = { raw: "=C1" };
  sheet.cells.D1 = { raw: "=1/0" };
  sheet.cells.D2 = { raw: "=Missing!A1" };
  sheet.cells.D3 = { raw: "=SUM(" };
  sheet.cells.D4 = { raw: "=WEBSERVICE(1)" };
  const evaluate = createEvaluator(workbook);
  expect(evaluate(sheet.id, "C1")).toBe("#CYCLE!");
  expect(evaluate(sheet.id, "D1")).toBe("#DIV/0!");
  expect(evaluate(sheet.id, "D2")).toBe("#REF!");
  expect(evaluate(sheet.id, "D3")).toBe("#ERROR!");
  expect(evaluate(sheet.id, "D4")).toBe("#NAME?");
});

it("copies relative and absolute references without changing quoted strings", () => {
  expect(copyFormula('=SUM(A1:$B$3)+C$2+$D4+"A1"', 2, 1)).toBe(
    '=SUM(B3:$B$3)+D$2+$D6+"A1"',
  );
  expect(copyFormula("=A1", -1, 0)).toBe("=#REF!");
});

it("updates references across sheets when inserting, deleting, renaming and removing sheets", () => {
  const workbook = fixture();
  const id = workbook.sheets[0].id;
  workbook.sheets[1].cells.B1 = { raw: "=Sheet1!$A$2" };
  workbook.sheets[1].cells.B2 = { raw: "=SUM(Sheet1!A1:A2)" };
  const inserted = changeStructure(workbook, id, "row", 1, false);
  expect(inserted.sheets[0].cells.A3.raw).toBe("20");
  expect(inserted.sheets[1].cells.B2.raw).toBe("=SUM('Sheet1'!A1:A3)");
  expect(createEvaluator(inserted)(inserted.sheets[1].id, "B2")).toBe(30);
  expect(inserted.sheets[1].cells.B1.raw).toBe("='Sheet1'!$A$3");
  const renamed = renameSheet(inserted, id, "Budget");
  expect(renamed.sheets[1].cells.B1.raw).toBe("='Budget'!$A$3");
  expect(createEvaluator(renamed)(renamed.sheets[1].id, "B1")).toBe(20);
  const deleted = changeStructure(renamed, id, "row", 2, true);
  expect(deleted.sheets[1].cells.B1.raw).toBe("=#REF!");
  expect(deleteWorksheet(renamed, id).sheets[0].cells.B1.raw).toBe("=#REF!");
});

it("round trips quoted CSV including commas, quotes and embedded newlines", () => {
  const rows = [
    ["a,b", 'say "hello"', "line\nbreak"],
    ["", "20", "tail"],
  ];
  expect(parseDelimited(encodeDelimited(rows))).toEqual(rows);
  expect(parseDelimited("\uFEFFa,b\r\n1,2\r\n")).toEqual([
    ["a", "b"],
    ["1", "2"],
  ]);
  expect(() => parseDelimited('"unfinished')).toThrow();
});

it("validates sparse workbooks, bounds and formatting", () => {
  const workbook = fixture();
  expect(() => validateWorkbook({ ...workbook })).not.toThrow();
  expect(address(999, 51)).toBe("AZ1000");
  expect(position("$AZ$1000")).toEqual({ row: 999, column: 51 });
  expect(position("BA1")).toBeNull();
  expect(formatCell(0.125, { format: "percent", decimals: 1 })).toBe("12.5%");
  workbook.sheets[0].cells.A1.style = { fill: "invalid" };
  expect(() => validateWorkbook({ ...workbook })).toThrow();
});

it("handles a representative 500-row calculation workbook", () => {
  const sheet = makeWorksheet();
  for (let row = 1; row <= 500; row++) {
    sheet.cells[`A${row}`] = { raw: String(row) };
    sheet.cells[`B${row}`] = { raw: `=SUM(A1:A${row})` };
  }
  const evaluate = createEvaluator({ sheets: [sheet] });
  for (let row = 1; row <= 500; row++)
    expect(evaluate(sheet.id, `B${row}`)).toBe((row * (row + 1)) / 2);
});

it("ignores errors in unused IF branches and treats empty references as zero", () => {
  const sheet = makeWorksheet();
  sheet.cells.A1 = { raw: "=IF(TRUE,1,1/0)" };
  sheet.cells.A2 = { raw: "=IF(FALSE,Missing!A1,2)" };
  sheet.cells.A3 = { raw: "=B1" };
  const evaluate = createEvaluator({ sheets: [sheet] });
  expect(evaluate(sheet.id, "A1")).toBe(1);
  expect(evaluate(sheet.id, "A2")).toBe(2);
  expect(evaluate(sheet.id, "A3")).toBe(0);
});
