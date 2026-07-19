import { useEffect } from "react";
import { launchApp } from "./launch";

/**
 * Global, OS-style keyboard shortcuts, registered once from <App>.
 *
 *   Ctrl/Cmd + `          launch / focus Terminal
 *   Ctrl/Cmd + E          launch / focus File Explorer
 *   Ctrl/Cmd + ,          launch / focus Settings
 *   Escape                close the Start menu / open menus
 *
 * Store actions are read lazily via getState() so the listener never goes
 * stale and we don't re-bind on every render.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function isTypingTarget(): boolean {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }

    function closeMenus() {
      window.dispatchEvent(new CustomEvent("webos:close-menus"));
    }

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;

      // --- Escape (alone): close the Start menu / open menus ---
      // Never preventDefault so app-level Escape handlers keep working.
      if (e.key === "Escape" && !mod && !e.altKey && !e.shiftKey) {
        closeMenus();
        return;
      }

      // --- App launch / focus (modifier-based, safe even while typing) ---
      if (mod && !e.altKey && !e.shiftKey) {
        if (e.key === "`") {
          e.preventDefault();
          launchApp("terminal");
          return;
        }
        if (e.key.toLowerCase() === "e") {
          e.preventDefault();
          launchApp("file-explorer");
          return;
        }
        if (e.key === ",") {
          e.preventDefault();
          launchApp("settings");
          return;
        }
      }

      // Anything past this point could be plain typing — don't touch it when
      // focus is in a text field.
      if (isTypingTarget()) return;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
