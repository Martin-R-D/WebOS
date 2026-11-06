import { useNotificationStore } from "../../stores/useNotificationStore";
import { Toast } from "./Toast";

export function ToastManager() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);

  const unread = notifications.filter((n) => !n.read).slice(0, 3);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 56,
        right: 16,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 8,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      {unread.map((n) => (
        <div
          key={n.id}
          style={{ pointerEvents: "auto" }}
          onClick={() => markRead(n.id)}
        >
          <Toast notification={n} />
        </div>
      ))}
    </div>
  );
}
