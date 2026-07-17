import { useEffect, useState } from "react";
import { useSystemStore } from "../../stores/useSystemStore";
import { formatClock } from "../../lib/helpers";
import "./BootScreen.css";

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const username = useSystemStore((s) => s.username);
  const wallpaper = useSystemStore((s) => s.wallpaper);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Enter") onUnlock();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onUnlock]);

  const { time, dateStr } = formatClock(now);

  return (
    <div className="lock" onClick={onUnlock}>
      <div className="lock__bg" style={{ background: wallpaper }} />
      <div className="lock__overlay" />
      <div className="lock__content">
        <div className="lock__clock">{time}</div>
        <div className="lock__date">{dateStr}</div>
        <div className="lock__avatar">
          {username.charAt(0).toUpperCase()}
        </div>
        <div className="lock__user">{username}</div>
        <div className="lock__hint">Press Enter or click to unlock</div>
      </div>
    </div>
  );
}
