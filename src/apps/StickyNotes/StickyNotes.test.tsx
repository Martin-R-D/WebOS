import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StickyNotes } from "./StickyNotes";
import { useNotesStore } from "../../stores/useNotesStore";

beforeEach(() => useNotesStore.setState({ notes: [] }));

describe("search and pin notes", () => {
  it("pins first, searches case-insensitively and retains the focused editor until blur", () => {
    const a = useNotesStore.getState().addNote("Apple", "yellow");
    const b = useNotesStore.getState().addNote("Banana", "yellow");
    useNotesStore.getState().togglePin(b);
    render(<StickyNotes windowId="notes" />);
    expect(screen.getAllByLabelText("Note text")[0]).toHaveValue("Banana");
    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "APPLE" },
    });
    const input = screen.getByLabelText("Note text");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Pear" } });
    expect(input).toBeInTheDocument();
    fireEvent.blur(input);
    expect(screen.getByText("No matching notes.")).toBeInTheDocument();
    expect(
      useNotesStore.getState().notes.find((note) => note.id === a)?.text,
    ).toBe("Pear");
  });

  it("migrates existing notes without losing content and persists pin state", async () => {
    localStorage.setItem(
      "webos-notes",
      JSON.stringify({
        version: 1,
        state: {
          notes: [{ id: "old", text: "Keep", color: "pink", createdAt: 1 }],
        },
      }),
    );
    await useNotesStore.persist.rehydrate();
    expect(useNotesStore.getState().notes[0]).toMatchObject({
      id: "old",
      text: "Keep",
      pinned: false,
    });
    useNotesStore.getState().togglePin("old");
    const saved = localStorage.getItem("webos-notes")!;
    useNotesStore.setState({ notes: [] });
    localStorage.setItem("webos-notes", saved);
    await useNotesStore.persist.rehydrate();
    expect(useNotesStore.getState().notes[0].pinned).toBe(true);
  });
});
