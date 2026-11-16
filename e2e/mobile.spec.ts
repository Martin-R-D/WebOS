import { test, expect, type Page } from "@playwright/test";

async function launch(page: Page, name: string) {
  await page.getByRole("button", { name: "Apps", exact: true }).tap();
  await page
    .locator(".startmenu")
    .getByRole("button", { name, exact: true })
    .tap();
}
test.beforeEach(async ({ page }) => {
  // These tests exercise local desktop behavior, independently of weather providers.
  await page.route("**/*open-meteo.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
});
test("phone edits survive app switching, Home, rotation and saving", async ({
  page,
}) => {
  await launch(page, "Text Editor");
  const editor = page.locator(".window:not([hidden]) textarea");
  await editor.fill("Mobile draft survives switching");
  await launch(page, "Calculator");
  await page.getByRole("button", { name: /Running \(/ }).click();
  await page
    .locator(".mobile-running__row")
    .first()
    .getByRole("button", { name: /^Close / })
    .click();
  await page.getByRole("button", { name: "Dismiss running apps" }).click();
  await expect(editor).toHaveValue("Mobile draft survives switching");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".window:not([hidden])")).toHaveCount(0);
  await page.getByRole("button", { name: /Running \(/ }).click();
  await page.locator(".mobile-running__row > button").first().click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".window:not([hidden])")).toHaveClass(
    /window--compact/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(editor).toHaveValue("Mobile draft survives switching");
  await page.getByRole("button", { name: "Save As", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Save As", exact: true });
  await dialog.getByLabel("File name").fill("mobile.txt");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "File Explorer");
  await page.locator(".fx__item").filter({ hasText: "mobile.txt" }).click();
  await expect(page.locator(".window:not([hidden]) textarea")).toHaveValue(
    "Mobile draft survives switching",
  );
});
test("all apps and dialogs fit a narrow phone", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 640 });
  for (const name of [
    "About Me",
    "File Explorer",
    "Terminal",
    "Calculator",
    "Settings",
    "Browser",
    "Paint",
    "Clock",
    "Task Manager",
    "Sticky Notes",
    "Weather",
    "Calendar",
    "Recycle Bin",
    "Text Editor",
    "Unit Converter",
    "To-Do List",
    "Writer",
  ]) {
    await launch(page, name);
    const win = page.locator(".window:not([hidden])");
    await expect(win).toHaveCount(1);
    for (const width of [320, 375, 430, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 640 });
      const bounds = await win.boundingBox();
      expect(bounds!.x, name).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width, name).toBeLessThanOrEqual(width + 1);
      expect(
        await win.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        name,
      ).toBe(true);
      const body = win.locator(".window__body");
      expect(
        await body.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        `${name} body`,
      ).toBe(true);
    }
    await win
      .getByRole("button", { name: "Close window", exact: true })
      .click();
  }
});
test("touch file actions rename, move and delete without drag or right click", async ({
  page,
}) => {
  await launch(page, "File Explorer");
  await page.getByRole("button", { name: "New file", exact: true }).click();
  await page.getByRole("button", { name: "Actions for untitled.txt" }).click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Rename", exact: true })
    .click();
  await page.getByLabel("New name").fill("renamed.txt");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page.getByRole("button", { name: "Actions for renamed.txt" }).click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Move to…", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Documents", exact: true })
    .click();
  await page.getByRole("button", { name: "Move Here" }).click();
  await page
    .locator(".fx__item")
    .filter({ hasText: /^Documents$/ })
    .click();
  await page.getByRole("button", { name: "Actions for renamed.txt" }).click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Move to Recycle Bin" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Actions for renamed.txt" }),
  ).toHaveCount(0);
});
test("desktop drag, resize and minimize preserve app state", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Text Editor", exact: true })
    .click();
  const win = page.locator(".window");
  await win.locator("textarea").fill("Desktop draft");
  const before = (await win.boundingBox())!;
  await page.mouse.move(before.x + 100, before.y + 15);
  await page.mouse.down();
  await page.mouse.move(before.x + 150, before.y + 60);
  await page.mouse.up();
  const moved = (await win.boundingBox())!;
  expect(moved.x).toBe(before.x + 50);
  const resize = (await win.locator(".window__resize--se").boundingBox())!;
  await page.mouse.move(resize.x + 6, resize.y + 6);
  await page.mouse.down();
  await page.mouse.move(resize.x + 46, resize.y + 36);
  await page.mouse.up();
  expect((await win.boundingBox())!.width).toBe(moved.width + 40);
  const desktopBounds = (await win.boundingBox())!;
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(win).toHaveClass(/window--compact/);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(win).not.toHaveClass(/window--compact/);
  expect(await win.boundingBox()).toEqual(desktopBounds);
  await win.getByRole("button", { name: "Minimize window" }).click();
  await page.locator(".taskbar__app").click();
  await expect(win.locator("textarea")).toHaveValue("Desktop draft");
});

test("dialogs contain focus, cancel with Escape and fit a reduced visual viewport", async ({
  page,
}) => {
  await launch(page, "Text Editor");
  await page.getByRole("button", { name: "Save As", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Save As", exact: true });
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", {
      configurable: true,
      value: 360,
    });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.height).toBeLessThanOrEqual(360);
  const save = dialog.getByRole("button", { name: "Save", exact: true });
  await save.scrollIntoViewIfNeeded();
  const saveBounds = (await save.boundingBox())!;
  expect(saveBounds.y + saveBounds.height).toBeLessThanOrEqual(360);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save As", exact: true }),
  ).toBeFocused();
});

test("running list reaches every window and Paint survives switching and rotation", async ({
  page,
}) => {
  await launch(page, "Paint");
  const canvas = page.locator(".paint__canvas");
  const blank = await canvas.evaluate((el: HTMLCanvasElement) =>
    el.toDataURL(),
  );
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 70, bounds.y + 50);
  await page.mouse.up();
  const drawing = await canvas.evaluate((el: HTMLCanvasElement) =>
    el.toDataURL(),
  );
  expect(drawing).not.toBe(blank);
  for (let i = 0; i < 10; i++) await launch(page, "Text Editor");
  await page.getByRole("button", { name: /Running \(/ }).click();
  await expect(page.locator(".mobile-running__row")).toHaveCount(11);
  await page
    .locator(".mobile-running__row")
    .getByRole("button", { name: /^Paint:/ })
    .click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())).toBe(
    drawing,
  );
});
