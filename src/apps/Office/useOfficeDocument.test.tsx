import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useOfficeDocument } from "./useOfficeDocument";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";
import { encodeDocument } from "./documents";
import { canCloseWindow } from "../../lib/windowCloseGuard";
import { listRecovery } from "./recovery";

beforeEach(() => {
  useFileSystemStore.getState().resetFileSystem();
  useWindowStore.setState({ windows: [], focusedId: null });
});

it("saves, binds, reopens and follows renamed files", () => {
  const { result } = renderHook(() =>
    useOfficeDocument("writer", { windowId: "test" }, { body: "initial" }),
  );
  act(() => result.current.setContent({ body: "edited" }));
  expect(result.current.dirty).toBe(true);
  const fs = useFileSystemStore.getState();
  act(() => result.current.save(fs.rootId, "Report"));
  expect(result.current.dirty).toBe(false);
  const file = Object.values(useFileSystemStore.getState().nodes).find(
    (node) => node.name === "Report.wdoc",
  )!;
  expect(JSON.parse(file.content!).content.body).toBe("edited");
  act(() => fs.renameNode(file.id, "Renamed.wdoc"));
  expect(result.current.title).toBe("Renamed.wdoc");
  const reopened = renderHook(() =>
    useOfficeDocument(
      "writer",
      { windowId: "reopen", launchProps: { fileId: file.id } },
      {},
    ),
  );
  expect(reopened.result.current.content).toEqual({ body: "edited" });
});

it("guards all window closes and preserves separate recovery", async () => {
  const { result, unmount } = renderHook(() =>
    useOfficeDocument("writer", { windowId: "guard" }, {}),
  );
  act(() => result.current.setContent({ body: "unfinished" }));
  act(() => expect(canCloseWindow("guard")).toBe(false));
  expect(result.current.closing).toBe(true);
  await waitFor(() => expect(listRecovery("writer")).toHaveLength(1), {
    timeout: 2000,
  });
  unmount();
  expect(canCloseWindow("guard")).toBe(true);
  const recovery = renderHook(() =>
    useOfficeDocument("writer", { windowId: "recovered" }, {}),
  );
  act(() =>
    recovery.result.current.recover(recovery.result.current.drafts[0].key),
  );
  expect(recovery.result.current.content).toEqual({ body: "unfinished" });
  expect(recovery.result.current.dirty).toBe(true);
});

it("retains dirty content and saved filesystem when persistence fails", () => {
  const fs = useFileSystemStore.getState();
  const id = fs.createNode(
    fs.rootId,
    "Safe.wdoc",
    "file",
    encodeDocument("writer", { body: "saved" }),
  );
  const { result } = renderHook(() =>
    useOfficeDocument(
      "writer",
      { windowId: "quota", launchProps: { fileId: id } },
      {},
    ),
  );
  act(() => result.current.setContent({ body: "edited" }));
  const mock = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Quota exceeded");
  });
  act(() => result.current.save());
  mock.mockRestore();
  expect(result.current.dirty).toBe(true);
  expect(result.current.content).toEqual({ body: "edited" });
  expect(
    JSON.parse(useFileSystemStore.getState().nodes[id].content!).content.body,
  ).toBe("saved");
  expect(result.current.error).toContain("Quota");
});

it("does not overwrite malformed files", () => {
  const fs = useFileSystemStore.getState();
  const id = fs.createNode(fs.rootId, "Broken.wdoc", "file", "broken");
  const { result } = renderHook(() =>
    useOfficeDocument(
      "writer",
      { windowId: "broken", launchProps: { fileId: id } },
      {},
    ),
  );
  act(() => result.current.setContent({ body: "replacement" }));
  act(() => result.current.save());
  expect(useFileSystemStore.getState().nodes[id].content).toBe("broken");
});

it("does not offer another open window's recovery draft", async () => {
  const first = renderHook(() =>
    useOfficeDocument("writer", { windowId: "first-editor" }, {}),
  );
  act(() => first.result.current.setContent({ body: "active work" }));
  await waitFor(() => expect(listRecovery("writer")).toHaveLength(1), {
    timeout: 2000,
  });
  const second = renderHook(() =>
    useOfficeDocument("writer", { windowId: "second-editor" }, {}),
  );
  expect(second.result.current.drafts).toHaveLength(0);
  first.unmount();
  const reopened = renderHook(() =>
    useOfficeDocument("writer", { windowId: "third-editor" }, {}),
  );
  expect(reopened.result.current.drafts).toHaveLength(1);
});
