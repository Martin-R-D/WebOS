import { useState } from "react";
import { Desktop } from "./shell/Desktop/Desktop";
import { Window } from "./shell/Window/Window";
import { Taskbar } from "./shell/Taskbar/Taskbar";
import { StartMenu } from "./shell/StartMenu/StartMenu";
import { useWindowStore } from "./stores/useWindowStore";

function App() {
  const windows = useWindowStore((s) => s.windows);
  const [startOpen, setStartOpen] = useState(false);

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
