import { expect, test, type Page } from "@playwright/test";

async function launch(page: Page, name: string) {
  await page.getByRole("button", { name: "Apps", exact: true }).tap();
  await page
    .locator(".startmenu")
    .getByRole("button", { name, exact: true })
    .tap();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*open-meteo.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
});

test("calculator history survives reload and reuses results", async ({
  page,
}) => {
  await launch(page, "Calculator");
  for (const name of ["2", "+", "3", "="]) {
    await page.getByRole("button", { name, exact: true }).tap();
  }
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Calculator");
  await page.getByRole("button", { name: "History", exact: true }).tap();
  await expect(page.locator(".calc__history li")).toHaveText(/2\+3 = 5/);
  await page.getByRole("button", { name: "Use result" }).tap();
  await page.getByRole("button", { name: "+", exact: true }).tap();
  await page.getByRole("button", { name: "2", exact: true }).tap();
  await page.getByRole("button", { name: "=", exact: true }).tap();
  await expect(page.locator(".calc__expr")).toHaveText("7");
});

test("sticky notes search, pin and new-note focus", async ({ page }) => {
  await launch(page, "Sticky Notes");
  await page.getByRole("button", { name: "Add Note" }).tap();
  await page.getByLabel("Note text").fill("Shopping list");
  await page.getByRole("button", { name: "Pin note", exact: true }).tap();
  await page.getByLabel("Search notes").fill("missing");
  await expect(page.getByText("No matching notes.")).toBeVisible();
  await page.getByRole("button", { name: "Add Note" }).tap();
  await expect(page.getByLabel("Search notes")).toHaveValue("");
  await expect(page.getByLabel("Note text").last()).toBeFocused();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Sticky Notes");
  await expect(
    page.getByRole("button", { name: "Unpin note" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("file properties opens from touch actions on protected folders", async ({
  page,
}) => {
  await launch(page, "File Explorer");
  await page.getByRole("button", { name: "Actions for Documents" }).tap();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Properties" })
    .tap();
  const dialog = page.getByRole("dialog", { name: "Properties", exact: true });
  await expect(dialog).toContainText("/Documents");
  await expect(dialog).toContainText("Content size");
  await expect(dialog).toContainText("2 files, 0 folders");
  await dialog.getByRole("button", { name: "Close", exact: true }).tap();
  await expect(dialog).toHaveCount(0);
});
