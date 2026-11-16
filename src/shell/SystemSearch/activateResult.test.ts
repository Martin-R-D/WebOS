import { beforeEach, expect, it } from "vitest";
import { activateResult } from "./activateResult";
import { useWindowStore } from "../../stores/useWindowStore";
import { useNotesStore } from "../../stores/useNotesStore";
import type { SearchResult } from "./searchIndex";

beforeEach(() => {
  useWindowStore.setState({ windows: [], focusedId: null });
  useNotesStore.setState({ notes: [] });
});

it("uses stable note identifiers and refreshes navigation when reusing a window", () => {
  const id = useNotesStore.getState().addNote("Find me", "#ffffff");
  const result: SearchResult = {
    id,
    category: "notes",
    targetId: id,
    title: "Find me",
    detail: "",
    score: 0,
  };
  activateResult(result);
  const first = useWindowStore.getState().windows[0];
  expect(first.launchProps?.noteId).toBe(id);
  activateResult(result);
  const windows = useWindowStore.getState().windows;
  expect(windows).toHaveLength(1);
  expect(windows[0].launchProps?.navigationToken).not.toBe(
    first.launchProps?.navigationToken,
  );
  useNotesStore.getState().deleteNote(id);
  expect(() => activateResult(result)).toThrow("deleted");
});
