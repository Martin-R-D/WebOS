import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAllStores } from "../../test/resetStores";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useNotesStore } from "../../stores/useNotesStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { createBackup, restoreBackup, snapshotStorage } from "./backup";
import { validateBackup } from "./validation";
const media = vi.hoisted(() => ({
  entries: [] as { id: string; blob: Blob }[],
}));
vi.mock("../../lib/audioStorage", () => ({
  audioEntries: vi.fn(async () => media.entries),
  replaceAudio: vi.fn(async (entries) => {
    media.entries = entries;
  }),
  deleteAudio: vi.fn(async () => {}),
  audioId: (content?: string) =>
    content?.startsWith("webos-audio:") ? content.slice(12) : null,
}));
beforeEach(() => {
  localStorage.clear();
  resetAllStores();
  media.entries = [];
});
describe("workspace backups", () => {
  it("round trips files, notes and preferences while leaving unrelated storage alone", async () => {
    const fs = useFileSystemStore.getState();
    const id = fs.createNode(fs.rootId, "saved.txt", "file", "original");
    useNotesStore.getState().addNote("Important note", "#fff");
    const backup = await createBackup();
    fs.updateContent(id, "changed");
    localStorage.setItem("unrelated", "keep");
    await restoreBackup(backup);
    const restored = JSON.parse(
      localStorage.getItem("webos-filesystem")!,
    ).state;
    expect(restored.nodes[id].content).toBe("original");
    expect(
      JSON.parse(localStorage.getItem("webos-notes")!).state.notes[0].text,
    ).toBe("Important note");
    expect(localStorage.getItem("unrelated")).toBe("keep");
  });
  it("rejects cycles, missing parents, unsupported versions and unexpected store methods", async () => {
    const backup = await createBackup();
    expect(() => validateBackup({ ...backup, version: 2 })).toThrow();
    const fs = JSON.parse(backup.stores["webos-filesystem"]);
    const folder = Object.values(fs.state.nodes).find(
      (node) => (node as { parentId: string }).parentId === fs.state.rootId,
    ) as { id: string; parentId: string };
    folder.parentId = folder.id;
    expect(() =>
      validateBackup({
        ...backup,
        stores: { ...backup.stores, "webos-filesystem": JSON.stringify(fs) },
      }),
    ).toThrow();
    folder.parentId = "missing-folder";
    expect(() =>
      validateBackup({
        ...backup,
        stores: { ...backup.stores, "webos-filesystem": JSON.stringify(fs) },
      }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...backup,
        stores: {
          ...backup.stores,
          "webos-todos": JSON.stringify({
            state: { tasks: [], add: "broken" },
            version: 1,
          }),
        },
      }),
    ).toThrow();
  });
  it("rolls storage back when a write fails", async () => {
    const backup = await createBackup();
    useNotesStore.getState().addNote("Keep current", "#fff");
    const before = snapshotStorage();
    const original = Storage.prototype.setItem;
    let failed = false;
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(function (this: Storage, key, value) {
        if (!failed && key === "webos-notes") {
          failed = true;
          throw new Error("Quota exceeded");
        }
        original.call(this, key, value);
      });
    await expect(restoreBackup(backup)).rejects.toThrow(
      "previous workspace retained",
    );
    spy.mockRestore();
    expect(snapshotStorage()).toEqual(before);
  });
  it("requires editors to close before replacement", async () => {
    const backup = await createBackup();
    useWindowStore.getState().openWindow({
      appId: "text-editor",
      title: "Draft",
      icon: "FileText",
      width: 600,
      height: 400,
    });
    const before = snapshotStorage();
    await expect(restoreBackup(backup)).rejects.toThrow("Save and close");
    expect(snapshotStorage()).toEqual(before);
  });
  it("rejects a backup with missing binary audio", async () => {
    const fs = useFileSystemStore.getState();
    fs.createNode(fs.rootId, "missing.wav", "file", "webos-audio:missing");
    await expect(createBackup()).rejects.toThrow("Missing audio");
  });
});
