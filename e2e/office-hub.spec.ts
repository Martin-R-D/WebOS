import { expect, test } from "@playwright/test";

async function launch(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name, exact: true })
    .click();
}

test("Office hub creates templates, finds saved files and reuses an open editor", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Office");
  await page
    .getByRole("button", { name: "Writer templates", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create document", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Document content" }),
  ).toContainText("Dear recipient");
  await page.getByRole("button", { name: "Save As", exact: true }).click();
  await page.getByLabel("File name").fill("Hub letter.wdoc");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await launch(page, "Office");
  await page.getByLabel("Search Office filenames").fill("hub letter");
  await expect(page.locator(".office-hub__files li")).toHaveCount(1);
  await page.locator(".office-hub__open").click();
  await expect(page.locator(".writer__surface")).toHaveCount(1);
  await launch(page, "Office");
  await page
    .getByRole("button", { name: "All Office files", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open location for Hub letter.wdoc" })
    .click();
  await expect(page.locator(".window:not([hidden])")).toContainText(
    "Hub letter.wdoc",
  );
});
