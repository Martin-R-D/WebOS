import { test, expect } from "@playwright/test";

test("Photos opens images, zooms and returns to the gallery", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.evaluate(async () => {
    const path = "/src/stores/useFileSystemStore.ts";
    const { useFileSystemStore } = await import(path);
    const fs = useFileSystemStore.getState();
    fs.createNode(
      fs.rootId,
      "photo.png",
      "file",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    );
  });
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Photos", exact: true })
    .click();
  await page.getByRole("button", { name: "photo.png", exact: true }).click();
  await expect(page.locator(".photos__viewer img")).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".photos__caption")).toContainText("125%");
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "photo.png", exact: true }),
  ).toBeVisible();
});
