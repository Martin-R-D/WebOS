import { beforeEach, describe, expect, it } from "vitest";
import {
  decodeDocument,
  documentName,
  encodeDocument,
  officeKind,
} from "./documents";
import {
  clearOfficeRecovery,
  listRecovery,
  removeRecovery,
  saveRecovery,
} from "./recovery";
import { canCloseWindow, registerCloseGuard } from "../../lib/windowCloseGuard";

beforeEach(() => localStorage.clear());

describe("Office documents", () => {
  it("round trips each format and recognizes extensions case insensitively", () => {
    for (const kind of ["writer", "slides", "sheets"] as const) {
      const raw = encodeDocument(kind, { text: "Hello 世界" });
      expect(decodeDocument(raw, kind).content).toEqual({ text: "Hello 世界" });
      expect(officeKind(documentName("Budget", kind).toUpperCase())).toBe(kind);
    }
  });

  it("rejects damaged, mismatched, future and oversized documents", () => {
    for (const raw of [
      "{",
      "null",
      encodeDocument("slides", {}),
      '{"format":"webos-office","version":2}',
      "x".repeat(4_000_001),
    ]) {
      expect(() => decodeDocument(raw, "writer")).toThrow();
    }
    expect(() => documentName("other.wsheet", "writer")).toThrow();
    expect(() => documentName("a/b", "writer")).toThrow();
  });

  it("keeps recovery separate from saved files, filters app types and clears drafts", () => {
    const draft = {
      key: "a",
      name: "Draft.wdoc",
      fileId: null,
      document: encodeDocument("writer", {}),
      updatedAt: 1,
    };
    saveRecovery(draft);
    localStorage.setItem("webos-office-recovery:broken", "{");
    expect(listRecovery("writer")).toEqual([draft]);
    expect(listRecovery("sheets")).toEqual([]);
    removeRecovery("a");
    expect(listRecovery("writer")).toEqual([]);
    saveRecovery(draft);
    localStorage.setItem("unrelated", "keep");
    clearOfficeRecovery();
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(listRecovery("writer")).toEqual([]);
  });

  it("allows editors to intercept closing and unregister cleanly", () => {
    const unregister = registerCloseGuard("office-test", () => false);
    expect(canCloseWindow("office-test")).toBe(false);
    expect(canCloseWindow("other")).toBe(true);
    unregister();
    expect(canCloseWindow("office-test")).toBe(true);
  });
});
