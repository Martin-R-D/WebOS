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
