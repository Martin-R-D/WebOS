import { useEffect } from "react";
import { Desktop } from "./shell/Desktop/Desktop";
import { Window } from "./shell/Window/Window";
import { useWindowStore } from "./stores/useWindowStore";

function App() {
  const windows = useWindowStore((s) => s.windows);
  const openWindow = useWindowStore((s) => s.openWindow);

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
    </Desktop>
  );
}

export default App;
