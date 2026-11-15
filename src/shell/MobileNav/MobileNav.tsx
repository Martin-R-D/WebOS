import { useState } from "react";
import { Home, LayoutGrid, Layers, Bell, X } from "lucide-react";
import { useWindowStore } from "../../stores/useWindowStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { NotificationPanel } from "../Taskbar/NotificationPanel";

export function MobileNav({ onToggleStart }: { onToggleStart: () => void }) {
  const windows = useWindowStore((s) => s.windows);
  const focusedId = useWindowStore((s) => s.focusedId);
  const showDesktop = useWindowStore((s) => s.showDesktop);
  const focusWindow = useWindowStore((s) => s.focusWindow);
  const closeWindow = useWindowStore((s) => s.closeWindow);
  const unread = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
  const [panel, setPanel] = useState<"apps" | "notifications" | null>(null);
  return <nav className="mobile-nav" aria-label="Desktop navigation">
    <button onClick={() => { showDesktop(); setPanel(null); window.dispatchEvent(new CustomEvent("webos:close-menus")); }}><Home size={20} />Home</button>
    <button onClick={() => { setPanel(null); onToggleStart(); }}><LayoutGrid size={20} />Apps</button>
    <button aria-expanded={panel === "apps"} onClick={() => setPanel(panel === "apps" ? null : "apps")}><Layers size={20} />Running ({windows.length})</button>
    <button aria-label={`Notifications (${unread} unread)`} aria-expanded={panel === "notifications"} onClick={() => setPanel(panel === "notifications" ? null : "notifications")}><Bell size={20} />Alerts{unread > 0 ? ` (${unread})` : ""}</button>
    {panel === "notifications" && <NotificationPanel onClose={() => setPanel(null)} />}
    {panel === "apps" && <section className="mobile-running" aria-label="Running apps">
      <header><strong>Running apps</strong><button aria-label="Dismiss running apps" onClick={() => setPanel(null)}><X size={20} /></button></header>
      {windows.length === 0 && <p>No apps open</p>}
      {[...windows].sort((a, b) => b.zIndex - a.zIndex).map((win) => <div className="mobile-running__row" key={win.id}>
        <button aria-current={win.id === focusedId ? "true" : undefined} onClick={() => { focusWindow(win.id); setPanel(null); }}>{win.title}</button>
        <button aria-label={`Close ${win.title}`} onClick={() => closeWindow(win.id)}><X size={20} /></button>
      </div>)}
    </section>}
  </nav>;
}
