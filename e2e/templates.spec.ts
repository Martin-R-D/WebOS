import { expect, test } from "@playwright/test";

test("Office templates preserve an open document and save as independent files", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Writer", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Document content" })
    .fill("Keep my original");
  await page.getByRole("button", { name: "Templates", exact: true }).click();
  const gallery = page.getByRole("dialog", { name: "Office templates" });
  await gallery.getByRole("button", { name: "Résumé", exact: true }).click();
  await expect(gallery.getByRole("article")).toContainText("Experience");
  await gallery.getByRole("button", { name: "Create document" }).click();
  const active = page.locator(".window:not([hidden])");
  await expect(
    active.getByRole("textbox", { name: "Document content" }),
  ).toContainText("Professional summary");
  await expect(
    active.locator(".office__toolbar").getByRole("status"),
  ).toHaveText("Unsaved changes");
  await expect(page.locator(".writer__surface").first()).toHaveText(
    "Keep my original",
  );
  await active.getByRole("button", { name: "Save As", exact: true }).click();
  await page.getByLabel("File name").fill("Resume.wdoc");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(
    active.locator(".office__toolbar").getByRole("status"),
  ).toHaveText("Saved");
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "File Explorer", exact: true })
    .click();
  await page.getByRole("button", { name: "Actions for Resume.wdoc" }).click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Document content" }),
  ).toContainText("Professional summary");
});
