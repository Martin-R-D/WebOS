import { expect, test } from "@playwright/test";

test("deleted text preview restores without changing content", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.evaluate(async () => {
    const modulePath = "/src/stores/useFileSystemStore.ts";
    const { useFileSystemStore } = await import(modulePath);
    const fs = useFileSystemStore.getState();
    const id = fs.createNode(
      fs.rootId,
      "preview.txt",
      "file",
      "<b>Plain text</b>",
    );
    fs.deleteNode(id);
    fs.createNode(fs.rootId, "preview.txt", "file", "Existing");
  });
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Recycle Bin", exact: true })
    .click();
  await page.getByRole("button", { name: "Preview preview.txt" }).click();
  const dialog = page.getByRole("dialog", { name: "Deleted file preview" });
  await expect(dialog.locator("pre")).toHaveText("<b>Plain text</b>");
  await expect(dialog.getByText(/numbered/)).toBeVisible();
  await dialog.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Recycle Bin is empty")).toBeVisible();
});
