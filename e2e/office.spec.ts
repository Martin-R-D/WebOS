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

test("Writer embeds and sizes images and inserts tables", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Writer");
  await page
    .locator('input[accept="image/png,image/jpeg,image/webp"]')
    .setInputFiles({
      name: "pixel.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  const image = page
    .getByRole("textbox", { name: "Document content" })
    .getByRole("img", { name: "pixel.png" });
  await expect(image).toHaveAttribute("src", /^data:image\/png;base64,/);
  await image.click();
  await page.getByLabel("Image width").selectOption("160");
  await expect(image).toHaveAttribute("width", "160");
  await page.getByRole("button", { name: "Table", exact: true }).click();
  await expect(page.locator(".tiptap table")).toHaveCount(1);
  await expect(page.locator(".tiptap tr")).toHaveCount(3);
});

test("Slides edits a deck, saves it and presents after reopening", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "Slides");
  await page.getByLabel("Select element").selectOption({ index: 1 });
  await page
    .getByLabel("Element text", { exact: true })
    .fill("My presentation");
  await page
    .getByRole("button", { name: "Add blank slide", exact: true })
    .click();
  await page.getByRole("button", { name: "Text box", exact: true }).click();
  await page.getByLabel("Element text", { exact: true }).fill("Second slide");
  await page.getByLabel("Element x", { exact: true }).fill("250");
  await page.getByRole("button", { name: "Save As", exact: true }).click();
  await page.getByLabel("File name").fill("Deck.wslides");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch(page, "File Explorer");
  await page.getByRole("button", { name: "Actions for Deck.wslides" }).click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await page.getByRole("button", { name: "Present from start" }).click();
  const presentation = page.getByRole("dialog", {
    name: "Presentation",
    exact: true,
  });
  await expect(presentation).toContainText("My presentation");
  await presentation.getByRole("button", { name: "Next", exact: true }).click();
  await expect(presentation).toContainText("Second slide");
  await expect(presentation).toContainText("Slide 2 of 2");
  await presentation.getByRole("button", { name: "Exit presentation" }).click();
  await expect(presentation).toHaveCount(0);
});

test("Slides desktop drag moves and resizes an element", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Slides", exact: true })
    .click();
  await page.getByRole("button", { name: "Text box", exact: true }).click();
  const canvas = page.locator(".slides__editor > svg");
  const bounds = (await canvas.boundingBox())!;
  const scale = bounds.width / 1280;
  const x = Number(
    await page.getByLabel("Element x", { exact: true }).inputValue(),
  );
  await page.mouse.move(bounds.x + 130 * scale, bounds.y + 130 * scale);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 230 * scale, bounds.y + 180 * scale);
  await page.mouse.up();
  expect(
    Number(await page.getByLabel("Element x", { exact: true }).inputValue()),
  ).toBeCloseTo(x + 100, 0);
  const handle = (await canvas.getByLabel("Resize element").boundingBox())!;
  const width = Number(
    await page.getByLabel("Element width", { exact: true }).inputValue(),
  );
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2 + 50 * scale,
    handle.y + handle.height / 2 + 30 * scale,
  );
  await page.mouse.up();
  expect(
    Number(
      await page.getByLabel("Element width", { exact: true }).inputValue(),
    ),
  ).toBeCloseTo(width + 50, 0);
});
