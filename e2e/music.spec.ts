import { test, expect } from "@playwright/test";
function wave() {
  const buffer = Buffer.alloc(44 + 160000);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24);
  buffer.writeUInt32LE(16000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(160000, 40);
  return buffer;
}
test("Music imports audio, plays it and persists playlists", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".boot")).toHaveCount(0);
  async function launch() {
    await page.getByRole("button", { name: "Apps", exact: true }).click();
    await page
      .locator(".startmenu")
      .getByRole("button", { name: "Music", exact: true })
      .click();
  }
  await launch();
  await page.getByLabel("Import audio", { exact: true }).setInputFiles({
    name: "sample.wav",
    mimeType: "audio/wav",
    buffer: wave(),
  });
  await expect(page.getByRole("status")).toHaveText("Imported 1 track(s).");
  await page.getByRole("button", { name: "sample.wav", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  expect(
    await page
      .locator(".music audio")
      .evaluate((element: HTMLAudioElement) => element.paused),
  ).toBe(false);
  await launch();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByLabel("Playlist name", { exact: true }).fill("Favorites");
  await page
    .getByRole("button", { name: "Create playlist", exact: true })
    .click();
  await page
    .getByLabel("Add sample.wav to playlist", { exact: true })
    .selectOption({ label: "Favorites" });
  await page.reload();
  await expect(page.locator(".boot")).toHaveCount(0);
  await launch();
  await page
    .getByLabel("Music playlist", { exact: true })
    .selectOption({ label: "Favorites" });
  await expect(
    page.getByRole("button", { name: "sample.wav", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "sample.wav", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  const player = await page.locator(".music audio").elementHandle();
  await page.evaluate(async () => {
    const path = "/src/stores/useWindowStore.ts";
    const { useWindowStore } = await import(path);
    const window = useWindowStore
      .getState()
      .windows.find((item: { appId: string }) => item.appId === "music");
    useWindowStore.getState().closeWindow(window.id);
  });
  await expect(page.locator(".music")).toHaveCount(0);
  expect(
    await player!.evaluate((element: HTMLAudioElement) => element.paused),
  ).toBe(true);
  const media = await page.evaluate(async () => {
    const path = "/src/stores/useFileSystemStore.ts";
    const { useFileSystemStore } = await import(path);
    const fs = useFileSystemStore.getState();
    const file = (
      Object.values(fs.nodes) as { id: string; name: string; content: string }[]
    ).find((node) => node.name === "sample.wav")!;
    fs.deleteNode(file.id);
    fs.permanentlyDelete(file.id);
    return file.content.slice(12);
  });
  await expect
    .poll(async () =>
      page.evaluate(async (id) => {
        const path = "/src/lib/audioStorage.ts";
        const { getAudio } = await import(path);
        return !!(await getAudio(id));
      }, media),
    )
    .toBe(false);
});
