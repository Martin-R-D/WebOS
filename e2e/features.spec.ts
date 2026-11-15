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

test("recent files reuse saved windows and follow renames", async ({
  page,
}) => {
  await launch(page, "Text Editor");
  await page.locator(".editor__area").fill("Recent draft");
  await page.getByRole("button", { name: "Save As", exact: true }).tap();
  await page.getByLabel("File name").fill("recent.txt");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .tap();
  await launch(page, "File Explorer");
  await page.getByRole("button", { name: "Recent", exact: true }).tap();
  await page
    .locator(".recent-files__open")
    .filter({ hasText: "recent.txt" })
    .tap();
  await expect(page.locator(".editor")).toHaveCount(1);
  await expect(page.locator(".window:not([hidden]) .editor__area")).toHaveValue(
    "Recent draft",
  );
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "File Explorer");
  await page.getByRole("button", { name: "Recent", exact: true }).tap();
  await expect(page.locator(".recent-files__open")).toContainText("recent.txt");
  await page
    .getByRole("button", { name: "Remove recent.txt from recent" })
    .tap();
  await expect(page.getByText(/No recent files yet/)).toBeVisible();
});

test("unit converter swaps quantities and retains preferences", async ({
  page,
}) => {
  await launch(page, "Unit Converter");
  await page.getByLabel("From", { exact: true }).selectOption("cm");
  await page.getByLabel("To", { exact: true }).selectOption("m");
  await page.getByLabel("Amount", { exact: true }).fill("100");
  await expect(page.getByLabel("Conversion result")).toHaveText("1");
  await page.getByRole("button", { name: "Swap", exact: true }).tap();
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Conversion result")).toHaveText("100");
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Unit Converter");
  await expect(page.getByLabel("From", { exact: true })).toHaveValue("m");
});

test("to-do tasks edit, complete, filter and persist", async ({ page }) => {
  await launch(page, "To-Do List");
  await page.getByLabel("New task", { exact: true }).fill("Buy milk");
  await page.getByRole("button", { name: "Add task", exact: true }).tap();
  await page.getByRole("button", { name: "Edit Buy milk", exact: true }).tap();
  await page.getByLabel("Edit task", { exact: true }).fill("Buy bread");
  await page.getByRole("button", { name: "Save", exact: true }).tap();
  await page.getByRole("checkbox", { name: "Complete Buy bread" }).check();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "To-Do List");
  await expect(
    page.getByRole("checkbox", { name: "Complete Buy bread" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Active (0)", exact: true }).tap();
  await expect(page.getByText("No active tasks.")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear completed", exact: true })
    .tap();
  await page.getByRole("button", { name: "Confirm delete", exact: true }).tap();
  await expect(page.getByText(/No tasks yet/)).toBeVisible();
});

test("file sorting reverses order and persists", async ({ page }) => {
  await launch(page, "File Explorer");
  const first = page.locator(".fx__item").first();
  await expect(first).toContainText("Desktop");
  await page
    .getByRole("button", { name: "Sort descending", exact: true })
    .tap();
  await expect(first).toContainText("System Apps");
  await page.getByLabel("Sort by").selectOption("modified");
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "File Explorer");
  await expect(page.getByLabel("Sort by")).toHaveValue("modified");
  await expect(
    page.getByRole("button", { name: "Sort ascending", exact: true }),
  ).toBeVisible();
});

test("browser bookmarks add, rename and persist", async ({ page }) => {
  await launch(page, "Browser");
  await page.getByRole("button", { name: "Bookmarks", exact: true }).tap();
  await page.getByLabel("Bookmark name", { exact: true }).fill("Example");
  await page
    .getByLabel("Website address", { exact: true })
    .fill("https://example.com");
  await page.getByRole("button", { name: "Add bookmark", exact: true }).tap();
  await page.getByRole("button", { name: "Edit Example", exact: true }).tap();
  await page.getByLabel("Bookmark name", { exact: true }).fill("My site");
  await page.getByRole("button", { name: "Save bookmark", exact: true }).tap();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Browser");
  await page.getByRole("button", { name: "Bookmarks", exact: true }).tap();
  await expect(page.locator(".bookmarks__open")).toContainText("My site");
  await page.getByRole("button", { name: "Remove My site", exact: true }).tap();
  await page.getByRole("button", { name: "Confirm remove", exact: true }).tap();
  await expect(page.getByText("No bookmarks yet.")).toBeVisible();
});

test("system theme follows live device changes and permits manual override", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await launch(page, "Settings");
  await page.getByRole("checkbox", { name: "Follow system theme" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Settings");
  await expect(
    page.getByRole("checkbox", { name: "Follow system theme" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Midnight", exact: true }).tap();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
  await expect(
    page.getByRole("checkbox", { name: "Follow system theme" }),
  ).not.toBeChecked();
});
