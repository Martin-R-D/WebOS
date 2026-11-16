import { expect, test } from "@playwright/test";

test("Slides keeps notes private and synchronizes a separate audience window", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Slides", exact: true })
    .click();
  await page.getByLabel("Slide speaker notes").fill("PRIVATE first slide note");
  await page
    .getByRole("button", { name: "Add content slide", exact: true })
    .click();
  await page
    .getByLabel("Slide speaker notes")
    .fill("PRIVATE second slide note");
  await page.getByRole("button", { name: "Save As", exact: true }).click();
  await page.getByLabel("File name").fill("Notes.wslides");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "File Explorer", exact: true })
    .click();
  await page.getByRole("button", { name: "Actions for Notes.wslides" }).click();
  await page
    .locator(".ctx-menu")
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(page.getByLabel("Slide speaker notes")).toHaveValue(
    "PRIVATE first slide note",
  );
  await page.getByRole("button", { name: "Present from start" }).click();
  const presenter = page.getByRole("dialog", {
    name: "Presentation",
    exact: true,
  });
  await expect(
    presenter.getByRole("region", { name: "Speaker notes" }),
  ).toContainText("PRIVATE first slide note");
  const opening = page.waitForEvent("popup");
  await presenter
    .getByRole("button", { name: "Open audience window", exact: true })
    .click();
  const audience = await opening;
  await expect(
    audience.getByText("Slide 1 of 2", { exact: true }),
  ).toBeVisible();
  await expect(audience.locator("body")).not.toContainText("PRIVATE");
  await presenter.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    audience.getByText("Slide 2 of 2", { exact: true }),
  ).toBeVisible();
  await expect(
    presenter.getByRole("region", { name: "Speaker notes" }),
  ).toContainText("PRIVATE second slide note");
  await audience.close();
  await expect(presenter.getByRole("status")).toHaveText(
    "Audience window closed.",
  );
  const reopening = page.waitForEvent("popup");
  await presenter
    .getByRole("button", { name: "Open audience window", exact: true })
    .click();
  const secondAudience = await reopening;
  await expect(
    secondAudience.getByText("Slide 2 of 2", { exact: true }),
  ).toBeVisible();
  await presenter.getByRole("button", { name: "Exit presentation" }).click();
  await expect.poll(() => secondAudience.isClosed()).toBe(true);
  await expect(presenter).toHaveCount(0);
});
