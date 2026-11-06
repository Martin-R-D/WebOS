import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EditorSettings {
  fontSize: 12 | 14 | 16 | 18;
  fontFamily: "monospace" | "sans-serif";
  lineWrap: boolean;
  setFontSize: (size: 12 | 14 | 16 | 18) => void;
  setFontFamily: (f: "monospace" | "sans-serif") => void;
  setLineWrap: (v: boolean) => void;
}

export const useEditorSettingsStore = create<EditorSettings>()(
  persist(
    (set) => ({
      fontSize: 14,
      fontFamily: "monospace",
      lineWrap: false,
      setFontSize: (size) => set({ fontSize: size }),
      setFontFamily: (f) => set({ fontFamily: f }),
      setLineWrap: (v) => set({ lineWrap: v }),
    }),
    { name: "webos-editor-settings" },
  ),
);
