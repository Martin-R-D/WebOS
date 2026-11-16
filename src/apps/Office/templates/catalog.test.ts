import { expect, it } from "vitest";
import { officeTemplates } from "./catalog";
import { validateWriterContent } from "../writerContent";
import { validateSlidesContent } from "../slidesModel";
import { validateWorkbook } from "../sheets/model";
import { createEvaluator } from "../sheets/formulas";
import type { Workbook } from "../sheets/model";

it("creates valid independent documents for all nine templates", () => {
  expect(officeTemplates).toHaveLength(9);
  expect(new Set(officeTemplates.map((template) => template.id)).size).toBe(9);
  for (const template of officeTemplates) {
    const first = template.create();
    const second = template.create();
    const validate =
      template.kind === "writer"
        ? validateWriterContent
        : template.kind === "slides"
          ? validateSlidesContent
          : validateWorkbook;
    expect(() => validate(first), template.id).not.toThrow();
    if (template.kind === "slides")
      expect((first.slides as { id: string }[])[0].id).not.toBe(
        (second.slides as { id: string }[])[0].id,
      );
    if (template.kind === "sheets") {
      const workbook = first as unknown as Workbook;
      expect(workbook.sheets[0].id).not.toBe(
        (second as unknown as Workbook).sheets[0].id,
      );
      const evaluate = createEvaluator(workbook);
      for (const [key, cell] of Object.entries(workbook.sheets[0].cells)) {
        if (cell.raw.startsWith("="))
          expect(
            typeof evaluate(workbook.sheets[0].id, key),
            `${template.id} ${key}`,
          ).toBe("number");
      }
    }
    if (template.kind === "writer") {
      (first.body as { type: string }).type = "changed";
      expect((second.body as { type: string }).type).toBe("doc");
    }
  }
});

it("calculates the sample budget, expenses and completion ratio", () => {
  for (const [id, cell, expected] of [
    ["monthly-budget", "C7", 1430],
    ["expense-tracker", "C4", 35],
    ["project-tracker", "B4", 0.5],
  ] as const) {
    const workbook = officeTemplates
      .find((template) => template.id === id)!
      .create() as unknown as Workbook;
    expect(createEvaluator(workbook)(workbook.sheets[0].id, cell)).toBe(
      expected,
    );
  }
});
