import { useEffect } from "react";
import { useFocusStore } from "../../stores/useFocusStore";
import { notify } from "../../lib/notify";
import { playSound } from "../../lib/sound";

export function FocusRuntime() {
  useEffect(() => {
    function check() {
      const phase = useFocusStore.getState().tick();
      if (!phase) return;
      notify(
        "Focus Timer",
        phase === "focus"
          ? "Focus session complete. Time for a break."
          : "Break complete. Ready to focus?",
        "Timer",
      );
      if (useFocusStore.getState().sound) playSound("chime");
    }
    check();
    const timer = window.setInterval(check, 1000);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, []);
  return null;
}
