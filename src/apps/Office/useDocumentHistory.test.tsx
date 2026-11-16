import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useDocumentHistory } from "./useDocumentHistory";

it("restores edits and clears redo after a new change", () => {
  const { result } = renderHook(() => {
    const [value, setValue] = useState({ text: "original" });
    return { value, ...useDocumentHistory(value, setValue) };
  });
  act(() => result.current.update({ text: "edited" }));
  act(() => result.current.undo());
  expect(result.current.value.text).toBe("original");
  act(() => result.current.redo());
  expect(result.current.value.text).toBe("edited");
  act(() => result.current.undo());
  act(() => result.current.update({ text: "new direction" }));
  expect(result.current.canRedo).toBe(false);
});
