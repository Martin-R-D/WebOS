import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import {
  audioEntries,
  audioId,
  replaceAudio,
  type AudioEntry,
} from "../../lib/audioStorage";
import { eligible, validateBackup, type Backup } from "./validation";

export function snapshotStorage(): Record<string, string> {
  const stores: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key && eligible(key)) stores[key] = localStorage.getItem(key)!;
  }
  return stores;
}
function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read audio data."));
    reader.readAsDataURL(blob);
  });
}
export async function createBackup(): Promise<Backup> {
  const stores = snapshotStorage();
  const { nodes, rootId, deletedNodes } = useFileSystemStore.getState();
  stores["webos-filesystem"] = JSON.stringify({
    state: { nodes, rootId, deletedNodes },
    version: 16,
  });
  const references = new Set(
    [
      ...Object.values(nodes),
      ...Object.values(deletedNodes).map((entry) => entry.node),
    ]
      .map((node) => audioId(node.content))
      .filter(Boolean),
  );
  const audio = [];
  for (const entry of await audioEntries()) {
    if (references.has(entry.id))
      audio.push({
        id: entry.id,
        type: entry.blob.type,
        data: await base64(entry.blob),
      });
  }
  return validateBackup({
    format: "webos-backup",
    version: 1,
    createdAt: Date.now(),
    stores,
    audio,
  });
}
export function downloadBackup(backup: Backup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `WebOS-backup-${new Date(backup.createdAt).toISOString().slice(0, 10)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function replaceStorage(stores: Record<string, string>) {
  for (const key of Object.keys(snapshotStorage()))
    localStorage.removeItem(key);
  for (const [key, raw] of Object.entries(stores))
    localStorage.setItem(key, raw);
}
function editorsOpen() {
  return useWindowStore
    .getState()
    .windows.some((window) =>
      ["writer", "slides", "sheets", "paint", "text-editor", "music"].includes(
        window.appId,
      ),
    );
}
export async function restoreBackup(input: unknown): Promise<void> {
  const backup = validateBackup(input);
  if (editorsOpen())
    throw new Error(
      "Save and close document editors, Paint, and Music before restoring.",
    );
  const previous = snapshotStorage();
  const previousAudio = await audioEntries();
  const entries: AudioEntry[] = backup.audio.map((entry) => {
    const binary = atob(entry.data);
    const data = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return { id: entry.id, blob: new Blob([data], { type: entry.type }) };
  });
  let audioChanged = false;
  let storageChanged = false;
  try {
    await replaceAudio(entries);
    audioChanged = true;
    storageChanged = true;
    replaceStorage(backup.stores);
  } catch (error) {
    let rollbackFailed = false;
    if (storageChanged) {
      try {
        replaceStorage(previous);
      } catch {
        rollbackFailed = true;
      }
    }
    if (audioChanged) {
      try {
        await replaceAudio(previousAudio);
      } catch {
        rollbackFailed = true;
      }
    }
    if (rollbackFailed)
      throw new Error(
        "Restore failed and rollback could not finish. Keep this tab open and retain your backup file before retrying.",
      );
    throw new Error(
      error instanceof Error
        ? `Restore failed; previous workspace retained. ${error.message}`
        : "Restore failed; previous workspace retained.",
    );
  }
}
