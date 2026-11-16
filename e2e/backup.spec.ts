import { test, expect } from "@playwright/test";

test("workspace restore previews replacement and recovers files and binary audio", async ({
  page,
}) => {
  await page.route("**/*open-meteo.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  const backup = await page.evaluate(async () => {
    const fsPath = "/src/stores/useFileSystemStore.ts";
    const audioPath = "/src/lib/audioStorage.ts";
    const backupPath = "/src/apps/BackupRestore/backup.ts";
    const { useFileSystemStore } = await import(fsPath);
    const { putAudio } = await import(audioPath);
    const { createBackup } = await import(backupPath);
    const fs = useFileSystemStore.getState();
    fs.createNode(fs.rootId, "saved.txt", "file", "Original backup text");
    await putAudio(
      "backup-audio",
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/wav" }),
    );
    fs.createNode(fs.rootId, "saved.wav", "file", "webos-audio:backup-audio");
    const result = await createBackup();
    const actual = (
      Object.values(useFileSystemStore.getState().nodes) as {
        id: string;
        name: string;
      }[]
    ).find((node) => node.name === "saved.txt")!;
    fs.updateContent(actual.id, "Changed after backup");
    await putAudio(
      "backup-audio",
      new Blob(["changed"], { type: "audio/wav" }),
    );
    return result;
  });
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator(".startmenu")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Backup & Restore", exact: true })
    .click();
  await page.getByLabel("Choose backup", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("heading", { name: "Restore preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Replace workspace and reload" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Restore preview" }),
  ).toHaveCount(0);
  await page.getByLabel("Choose backup", { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("heading", { name: "Restore preview" }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "I understand this replaces my current workspace.",
    })
    .check();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Replace workspace and reload" }).click(),
  ]);
  await expect(page.locator(".boot")).toHaveCount(0);
  const restored = await page.evaluate(async () => {
    const fsPath = "/src/stores/useFileSystemStore.ts";
    const audioPath = "/src/lib/audioStorage.ts";
    const { useFileSystemStore } = await import(fsPath);
    const { getAudio } = await import(audioPath);
    const node = (
      Object.values(useFileSystemStore.getState().nodes) as {
        content: string;
        name: string;
      }[]
    ).find((item) => item.name === "saved.txt")!;
    return {
      text: node.content,
      audio: Array.from(
        new Uint8Array(await (await getAudio("backup-audio")).arrayBuffer()),
      ),
    };
  });
  expect(restored).toEqual({
    text: "Original backup text",
    audio: [1, 2, 3, 4],
  });
});
