import { useEffect, useRef, useState } from "react";
import { Monitor } from "lucide-react";
import "./BootScreen.css";

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function skip() {
    timersRef.current.forEach(clearTimeout);
    setFading(true);
    timersRef.current = [setTimeout(onDone, 300)];
  }

  useEffect(() => {
    timersRef.current = [
      setTimeout(() => setFading(true), 2000),
      setTimeout(onDone, 2300),
    ];
    const handleKey = () => skip();
    window.addEventListener("keydown", handleKey);
    return () => {
      timersRef.current.forEach(clearTimeout);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div className={`boot ${fading ? "boot__fadeout" : ""}`} onClick={skip}>
      <Monitor size={52} className="boot__icon" />
      <div className="boot__logo">
        Web<span>OS</span>
      </div>
      <div className="boot__bar">
        <div className="boot__fill" />
      </div>
      <div className="boot__version">v1.0</div>
    </div>
  );
}
