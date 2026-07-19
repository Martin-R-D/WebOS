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

function App() {
  const windows = useWindowStore((s) => s.windows);
  const theme = useSystemStore((s) => s.theme);
  const accentColor = useSystemStore((s) => s.accentColor);
  const booted = useSystemStore((s) => s.booted);
  const locked = useSystemStore((s) => s.locked);
  const setBooted = useSystemStore((s) => s.setBooted);
  const setLocked = useSystemStore((s) => s.setLocked);
  const [startOpen, setStartOpen] = useState(false);

  useKeyboardShortcuts();

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
      <Taskbar onToggleStart={() => setStartOpen((v) => !v)} startOpen={startOpen} />
    </Desktop>
  );
}

export default App;
