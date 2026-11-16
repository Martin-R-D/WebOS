import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Sheets previews charts, updates formulas, exports SVG and reopens saved definitions", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Sheets", exact: true })
    .click();
  await page.locator('input[accept=".csv,text/csv"]').setInputFiles({
    name: "chart.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Month,Revenue\nJan,10\nFeb,20"),
  });
  await page.getByLabel("Selected range").fill("A1:B3");
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  await page.getByLabel("Chart title").fill("Revenue chart");
  await page.getByRole("button", { name: "Save chart", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Revenue chart", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Chart type").selectOption("line");
  await page.getByRole("button", { name: "Save chart", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Chart type")).toHaveValue("bar");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Chart type")).toHaveValue("line");
  await page.getByLabel("Chart type").selectOption("pie");
  await page.getByRole("button", { name: "Save chart", exact: true }).click();
  await expect(
    page
      .getByRole("img", { name: "Revenue chart", exact: true })
      .locator("path"),
  ).toHaveCount(2);
  await page.getByText("View chart data", { exact: true }).click();
  await expect(page.locator(".sheets__charts table")).toContainText("20");
  await page.getByLabel("Selected range").fill("B3");
  await page.getByLabel("Formula or value").fill("=B2*3");
  await page.getByRole("button", { name: "Apply value", exact: true }).click();
  await expect(page.locator(".sheets__charts table")).toContainText("30");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG", exact: true }).click();
  const svg = await readFile((await (await downloading).path())!, "utf8");
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain("Revenue chart");
  await page.getByRole("button", { name: "Save As", exact: true }).click();
  await page.getByLabel("File name").fill("Charts.wsheet");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "File Explorer", exact: true })
    .click();
  await page.getByRole("button", { name: "Actions for Charts.wsheet" }).click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Workbook sheets" })
    .getByRole("button", { name: "Import1", exact: true })
    .click();
  await page.getByRole("button", { name: "Charts", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Revenue chart", exact: true }),
  ).toBeVisible();
});
