import { test, expect } from "@playwright/test";

test("Focus Timer survives closing and reload without double counting", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  async function launch() {
    await page.getByRole("button", { name: "Apps", exact: true }).click();
    await page
      .locator(".startmenu")
      .getByRole("button", { name: "Focus Timer", exact: true })
      .click();
  }
  await launch();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.evaluate(async () => {
    const path = "/src/stores/useFocusStore.ts";
    const { useFocusStore } = await import(path);
    useFocusStore.setState({ endsAt: Date.now() - 1000 });
  });
  await expect(
    page.getByRole("heading", { name: "Short break" }),
  ).toBeVisible();
  await expect(
    page.getByText("Today: 1 completed sessions · 25 focus minutes"),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch();
  await expect(
    page.getByText("Today: 1 completed sessions · 25 focus minutes"),
  ).toBeVisible();
});
