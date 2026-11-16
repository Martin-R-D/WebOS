import { useRef, useState } from "react";

export function useDocumentHistory<T>(value: T, setValue: (value: T) => void) {
  const undoStack = useRef<T[]>([]);
  const redoStack = useRef<T[]>([]);
  const [, refresh] = useState(0);
  return {
    update(next: T) {
      undoStack.current = [...undoStack.current.slice(-49), value];
      redoStack.current = [];
      setValue(next);
      refresh((count) => count + 1);
    },
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    undo() {
      const previous = undoStack.current.pop();
      if (previous === undefined) return;
      redoStack.current.push(value);
      setValue(previous);
      refresh((count) => count + 1);
    },
    redo() {
      const next = redoStack.current.pop();
      if (next === undefined) return;
      undoStack.current.push(value);
      setValue(next);
      refresh((count) => count + 1);
    },
  };
}
