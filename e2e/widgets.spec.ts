import { test, expect } from "@playwright/test";

test("desktop widgets show live tasks and persist without deleting source data", async ({
  page,
}) => {
  await page.route("**/*open-meteo.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.evaluate(async () => {
    const path = "/src/stores/useTodoStore.ts";
    const { useTodoStore } = await import(path);
    useTodoStore.getState().add("Widget task");
  });
  await page.getByRole("button", { name: "Add widget", exact: true }).click();
  await page
    .locator(".widgets__menu")
    .getByRole("button", { name: "Tasks", exact: true })
    .click();
  const tasks = page.getByRole("region", { name: "Tasks widget" });
  await expect(tasks.getByText("Widget task", { exact: true })).toBeVisible();
  await tasks.getByRole("checkbox", { name: "Widget task" }).click();
  await expect(tasks.getByText("No incomplete tasks.")).toBeVisible();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await expect(tasks).toBeVisible();
  await page.getByRole("button", { name: "Remove Tasks widget" }).click();
  await expect(tasks).toHaveCount(0);
  await page.evaluate(async () => {
    const path = "/src/stores/useTodoStore.ts";
    const { useTodoStore } = await import(path);
    if (
      useTodoStore.getState().tasks[0].title !== "Widget task" ||
      !useTodoStore.getState().tasks[0].completed
    )
      throw new Error("Source task was lost");
  });
});

test("desktop drag moves widgets and preserves placement", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Add widget", exact: true }).click();
  await page
    .locator(".widgets__menu")
    .getByRole("button", { name: "Clock", exact: true })
    .click();
  const card = page.getByRole("region", { name: "Clock widget" });
  const handle = page.getByRole("button", {
    name: "Move Clock widget",
    exact: true,
  });
  const before = await card.boundingBox();
  const grip = await handle.boundingBox();
  await page.mouse.move(grip!.x + 20, grip!.y + 15);
  await page.mouse.down();
  await page.mouse.move(grip!.x - 80, grip!.y + 65, { steps: 6 });
  await page.mouse.up();
  const after = await card.boundingBox();
  expect(after!.x).toBeLessThan(before!.x - 80);
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await expect.poll(async () => (await card.boundingBox())?.x).toBe(after!.x);
});
