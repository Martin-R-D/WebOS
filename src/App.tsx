import type { SearchResult } from "./shell/SystemSearch/searchIndex";
import { activateResult } from "./shell/SystemSearch/activateResult";
import { useNotificationStore } from "./stores/useNotificationStore";
import { SystemSearch } from "./shell/SystemSearch/SystemSearch";
import { useResolvedTheme } from "./lib/useResolvedTheme";
import { useVisualViewport } from "./lib/useVisualViewport";
import { useState, useEffect } from "react";
import { Desktop } from "./shell/Desktop/Desktop";
import { Window } from "./shell/Window/Window";
import { Taskbar } from "./shell/Taskbar/Taskbar";
import { StartMenu } from "./shell/StartMenu/StartMenu";
import { BootScreen } from "./shell/BootScreen/BootScreen";
import { LockScreen } from "./shell/BootScreen/LockScreen";
import { useWindowStore } from "./stores/useWindowStore";
import { useSystemStore } from "./stores/useSystemStore";
import { useKeyboardShortcuts } from "./lib/useKeyboardShortcuts";
import { ToastManager } from "./shell/Toast/ToastManager";

function App() {
  const windows = useWindowStore((s) => s.windows);
  const theme = useResolvedTheme();
  const accentColor = useSystemStore((s) => s.accentColor);
  const booted = useSystemStore((s) => s.booted);
  const locked = useSystemStore((s) => s.locked);
  const setBooted = useSystemStore((s) => s.setBooted);
  const setLocked = useSystemStore((s) => s.setLocked);
  const [pendingSearchResult, setPendingSearchResult] =
    useState<SearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    if (searchOpen || !pendingSearchResult) return;
    const frame = requestAnimationFrame(() => {
      try {
        activateResult(pendingSearchResult);
      } catch (cause) {
        useNotificationStore.getState().push({
          title: "Search",
          message:
            cause instanceof Error
              ? cause.message
              : "Unable to open this result.",
          icon: "Search",
        });
      }
      setPendingSearchResult(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [searchOpen, pendingSearchResult]);

  useKeyboardShortcuts();
  useVisualViewport();

  useEffect(() => {
    const close = () => setStartOpen(false);
    window.addEventListener("webos:close-menus", close);
    return () => window.removeEventListener("webos:close-menus", close);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", accentColor);
  }, [accentColor]);

  if (!booted) return <BootScreen onDone={() => setBooted(true)} />;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  return (
    <Desktop>
      {windows.map((w) => (
        <Window key={w.id} win={w} />
      ))}
      <StartMenu open={startOpen} onClose={() => setStartOpen(false)} />
      {searchOpen && (
        <SystemSearch
          onClose={() => setSearchOpen(false)}
          onSelect={(result) => {
            setPendingSearchResult(result);
            setSearchOpen(false);
          }}
        />
      )}
      <Taskbar
        onOpenSearch={() => {
          setStartOpen(false);
          setPendingSearchResult(null);
          setSearchOpen(true);
        }}
        onToggleStart={() => setStartOpen((v) => !v)}
        startOpen={startOpen}
      />
      <ToastManager />
    </Desktop>
  );
}

export default App;
