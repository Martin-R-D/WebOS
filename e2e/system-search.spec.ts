import { expect, test } from "@playwright/test";

async function launch(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name, exact: true })
    .click();
}

test("System search opens apps and reveals notes and completed tasks in existing windows", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Sticky Notes");
  await page.getByRole("button", { name: "Add Note", exact: true }).click();
  await page.getByLabel("Note text").fill("Searchable grocery note");
  await page.getByLabel("Search notes").fill("hidden");
  await page.getByRole("button", { name: "Search WebOS", exact: true }).click();
  await page.getByLabel("Search WebOS content").fill("grocery");
  await page
    .getByRole("region", { name: "Notes results" })
    .getByRole("button")
    .click();
  await expect(page.getByLabel("Note text")).toBeFocused();
  await expect(page.getByLabel("Search notes")).toHaveValue("");
  await expect(page.locator(".sticky-notes")).toHaveCount(1);
  await launch(page, "To-Do List");
  await page
    .getByLabel("New task", { exact: true })
    .fill("Searchable finished task");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Complete Searchable finished task").check();
  await page.getByRole("button", { name: /Active \(/ }).click();
  await page.getByRole("button", { name: "Search WebOS", exact: true }).click();
  await page.getByLabel("Search WebOS content").fill("finished");
  await page
    .getByRole("region", { name: "Tasks results" })
    .getByRole("button")
    .click();
  const task = page.locator('.todos__row[data-search-target="true"]');
  await expect(task).toBeFocused();
  await expect(task).toContainText("Searchable finished task");
  await expect(page.locator(".todos")).toHaveCount(1);
  await page.getByRole("button", { name: "Search WebOS", exact: true }).click();
  await page.getByLabel("Search WebOS content").fill("calculator");
  await page
    .getByRole("region", { name: "Apps results" })
    .getByRole("button")
    .click();
  await expect(page.locator(".calc")).toBeVisible();
});

test("desktop search opens file and folder results with category filtering", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Search WebOS", exact: true }).click();
  await page.getByLabel("Search WebOS content").fill("readme");
  await page.getByLabel("Search category").selectOption("apps");
  await expect(
    page.getByText("No matching results.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search category").selectOption("files");
  await page
    .getByRole("region", { name: "Files results" })
    .getByRole("button")
    .click();
  await expect(page.locator(".editor__area")).toHaveValue(
    /virtual file system/,
  );
  await page.getByRole("button", { name: "Search WebOS", exact: true }).click();
  await page.getByLabel("Search WebOS content").fill("Documents");
  await page
    .getByRole("region", { name: "Files results" })
    .getByRole("button")
    .click();
  await expect(
    page.locator(".fx__item").filter({ hasText: "readme.txt" }),
  ).toBeVisible();
});
