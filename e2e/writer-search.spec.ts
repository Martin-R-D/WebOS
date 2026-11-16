import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Writer finds formatted text, replaces all in one undo and keeps highlights out of documents", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Writer", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Document content" });
  await editor.fill("Cat cat cats");
  await editor.selectText();
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByRole("button", { name: "Find", exact: true }).click();
  await page.getByLabel("Find text").fill("cat");
  await expect(editor.locator(".writer__match")).toHaveCount(3);
  await page.getByLabel("Whole word", { exact: true }).check();
  await expect(editor.locator(".writer__match")).toHaveCount(2);
  await page.getByLabel("Match case", { exact: true }).check();
  await expect(editor.locator(".writer__match")).toHaveCount(1);
  await page.getByLabel("Match case", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Next match" }).click();
  await expect(page.getByText("2 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous match" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export HTML", exact: true }).click();
  const download = await downloading;
  expect(await readFile((await download.path())!, "utf8")).not.toContain(
    "writer__match",
  );
  await page.getByLabel("Replacement text").fill("dog");
  await page.getByRole("button", { name: "Replace All", exact: true }).click();
  await expect(editor).toHaveText("dog dog cats");
  await expect(editor.locator("strong")).toHaveText("dog dog cats");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(editor).toHaveText("Cat cat cats");
  await page.getByRole("button", { name: "Close search", exact: true }).click();
  await expect(editor.locator(".writer__match")).toHaveCount(0);
});
