import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import "./BootScreen.css";

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2000);
    const doneTimer = setTimeout(onDone, 2300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`boot ${fading ? "boot__fadeout" : ""}`}>
      <Monitor size={52} className="boot__icon" />
      <div className="boot__logo">
        Web<span>OS</span>
      </div>
      <div className="boot__bar">
        <div className="boot__fill" />
      </div>
    </div>
  );
}
