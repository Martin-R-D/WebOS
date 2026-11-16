export interface AudioEntry {
  id: string;
  blob: Blob;
}
const database = "webos-media";
async function run<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest | undefined,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("audio", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Close other WebOS tabs to access audio storage."));
  });
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction("audio", mode);
    const request = operation(transaction.objectStore("audio"));
    transaction.oncomplete = () => {
      db.close();
      resolve(request?.result as T);
    };
    transaction.onerror = transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error("Audio storage failed."));
    };
  });
}
interface StoredAudio {
  id: string;
  type: string;
  data: ArrayBuffer;
}
export async function putAudio(id: string, blob: Blob) {
  const data = await blob.arrayBuffer();
  await run("readwrite", (store) => store.put({ id, type: blob.type, data }));
}
export async function getAudio(id: string): Promise<Blob | undefined> {
  const entry = await run<StoredAudio | undefined>("readonly", (store) =>
    store.get(id),
  );
  return entry ? new Blob([entry.data], { type: entry.type }) : undefined;
}
export async function audioEntries(): Promise<AudioEntry[]> {
  const entries = await run<StoredAudio[]>("readonly", (store) =>
    store.getAll(),
  );
  return entries.map((entry) => ({
    id: entry.id,
    blob: new Blob([entry.data], { type: entry.type }),
  }));
}
export async function deleteAudio(ids: string[]) {
  if (typeof indexedDB === "undefined" || !ids.length) return;
  await run("readwrite", (store) => {
    for (const id of ids) store.delete(id);
    return undefined;
  });
}
export async function replaceAudio(entries: AudioEntry[]) {
  if (typeof indexedDB === "undefined") return;
  const stored = await Promise.all(
    entries.map(async (entry) => ({
      id: entry.id,
      type: entry.blob.type,
      data: await entry.blob.arrayBuffer(),
    })),
  );
  await run("readwrite", (store) => {
    store.clear();
    for (const entry of stored) store.put(entry);
    return undefined;
  });
}
export function audioId(content?: string): string | null {
  return content?.startsWith("webos-audio:") ? content.slice(12) : null;
}
