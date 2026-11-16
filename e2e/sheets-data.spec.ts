import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Sheets sorts rows and persists filters without changing formulas", async ({
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
    name: "data.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Name,Amount\nBeta,20\nAlpha,10\nGamma,30"),
  });
  await page.getByLabel("Selected range").fill("A1:B4");
  await page
    .getByRole("button", { name: "Sort and filter", exact: true })
    .click();
  await page.getByRole("button", { name: "Sort table", exact: true }).click();
  await expect(
    page.getByRole("gridcell", { name: "A2", exact: true }),
  ).toHaveText("Alpha");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("gridcell", { name: "A2", exact: true }),
  ).toHaveText("Beta");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(
    page.getByRole("gridcell", { name: "A2", exact: true }),
  ).toHaveText("Alpha");
  await page.getByLabel("Filter value", { exact: true }).fill("missing");
  await page.getByRole("button", { name: "Apply filter", exact: true }).click();
  await expect(page.getByText("0 of 3 table rows visible")).toBeVisible();
  await page.getByLabel("Filter value", { exact: true }).fill("beta");
  await page.getByRole("button", { name: "Apply filter", exact: true }).click();
  await expect(
    page.getByRole("gridcell", { name: "A2", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("gridcell", { name: "A3", exact: true }),
  ).toHaveText("Beta");
  await expect(page.getByText("1 of 3 table rows visible")).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Only visible rows");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Export", exact: true })
    .click();
  const csv = await readFile((await (await downloading).path())!, "utf8");
  expect(csv).toContain("Beta,20");
  expect(csv).not.toContain("Alpha");
  await page.getByRole("button", { name: "Save As", exact: true }).click();
  await page.getByLabel("File name").fill("Filtered.wsheet");
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
  await page
    .getByRole("button", { name: "Actions for Filtered.wsheet" })
    .click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Workbook sheets" })
    .getByRole("button", { name: "Import1", exact: true })
    .click();
  await expect(page.getByText("Filters active", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("gridcell", { name: "A2", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show all rows", exact: true })
    .click();
  await expect(
    page.getByRole("gridcell", { name: "A2", exact: true }),
  ).toHaveText("Alpha");
});
