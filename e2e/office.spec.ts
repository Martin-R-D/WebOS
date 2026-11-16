import { expect, test, type Page } from "@playwright/test";

async function launch(page: Page, name: string) {
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name, exact: true })
    .click();
}

test("Writer formats, saves, reopens and protects unsaved work", async ({
  page,
}) => {
  await page.route("**/*open-meteo.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Writer");
  const editor = page.getByRole("textbox", { name: "Document content" });
  await editor.fill("A working document");
  await editor.selectText();
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(editor.locator("strong")).toHaveText("A working document");
  await page.getByRole("button", { name: "Save As", exact: true }).click();
  await page.getByLabel("File name").fill("Office test.wdoc");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.locator(".office").getByRole("status")).toHaveText("Saved");
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "File Explorer");
  await page
    .getByRole("button", { name: "Actions for Office test.wdoc" })
    .click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(editor.locator("strong")).toHaveText("A working document");
  await editor.fill("Changed after reopening");
  await page
    .locator(".window:not([hidden])")
    .getByRole("button", { name: "Close window", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Unsaved document" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(editor).toHaveText("Changed after reopening");
  await page
    .locator(".window:not([hidden])")
    .getByRole("button", { name: "Close window", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Unsaved document" })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.locator(".office")).toHaveCount(0);
});
