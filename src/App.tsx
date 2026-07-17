import { useEffect, useState } from "react";
import { Desktop } from "./shell/Desktop/Desktop";
import { Window } from "./shell/Window/Window";
import { Taskbar } from "./shell/Taskbar/Taskbar";
import { StartMenu } from "./shell/StartMenu/StartMenu";
import { useWindowStore } from "./stores/useWindowStore";

function App() {
  const windows = useWindowStore((s) => s.windows);
  const openWindow = useWindowStore((s) => s.openWindow);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    if (windows.length === 0) {
      openWindow({
        appId: "text-editor",
        title: "Hello Window",
        icon: "FileText",
        width: 480,
        height: 320,
      });
    }
  }, []);

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
