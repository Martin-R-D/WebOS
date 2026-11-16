import { decodeDocument } from "./documents";
import type { OfficeKind } from "./documents";

const prefix = "webos-office-recovery:";

export interface RecoveryDraft {
  key: string;
  name: string;
  fileId: string | null;
  document: string;
  updatedAt: number;
}

export function saveRecovery(draft: RecoveryDraft): void {
  localStorage.setItem(prefix + draft.key, JSON.stringify(draft));
}

export function removeRecovery(key: string): void {
  localStorage.removeItem(prefix + key);
}

export function listRecovery(kind: OfficeKind): RecoveryDraft[] {
  const drafts: RecoveryDraft[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    try {
      const draft = JSON.parse(localStorage.getItem(key) ?? "null");
      if (
        !draft ||
        typeof draft.key !== "string" ||
        typeof draft.name !== "string" ||
        !(draft.fileId === null || typeof draft.fileId === "string") ||
        typeof draft.document !== "string" ||
        typeof draft.updatedAt !== "number"
      )
        continue;
      decodeDocument(draft.document, kind);
      drafts.push(draft);
    } catch {
      // Invalid or other-app drafts must not prevent opening a healthy document.
    }
  }
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function clearOfficeRecovery(): void {
  const keys = Array.from({ length: localStorage.length }, (_, index) =>
    localStorage.key(index),
  );
  for (const key of keys) {
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }
}
