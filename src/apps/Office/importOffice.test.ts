import { beforeEach, expect, it } from "vitest";
import { importOfficeFile } from "./importOffice";
import { encodeDocument } from "./documents";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { useWindowStore } from "../../stores/useWindowStore";

beforeEach(() => {
  useFileSystemStore.getState().resetFileSystem();
  useWindowStore.setState({ windows: [], focusedId: null });
});

function uploaded(name: string, raw: string): File {
  return {
    name,
    size: new TextEncoder().encode(raw).length,
    text: async () => raw,
  } as File;
}

it("validates complete content before changing the filesystem", async () => {
  const count = Object.keys(useFileSystemStore.getState().nodes).length;
  await expect(
    importOfficeFile(
      uploaded(
        "Broken.wdoc",
        encodeDocument("writer", { body: { type: "script" } }),
      ),
    ),
  ).rejects.toThrow();
  expect(Object.keys(useFileSystemStore.getState().nodes)).toHaveLength(count);
  expect(useWindowStore.getState().windows).toHaveLength(0);
});

it("opens a validated native import and rejects duplicate names without overwriting", async () => {
  const raw = encodeDocument("writer", {
    body: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Imported" }] },
      ],
    },
  });
  const id = await importOfficeFile(uploaded("Imported.wdoc", raw));
  expect(useFileSystemStore.getState().nodes[id].content).toBe(raw);
  expect(useWindowStore.getState().windows[0].launchProps?.fileId).toBe(id);
  await expect(
    importOfficeFile(uploaded("Imported.wdoc", raw)),
  ).rejects.toThrow("already exists");
  expect(useFileSystemStore.getState().nodes[id].content).toBe(raw);
});
