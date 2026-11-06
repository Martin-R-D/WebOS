import { useEffect, useRef } from "react";
import * as Icons from "lucide-react";
import { Bell, X } from "lucide-react";
import { useNotificationStore, type Notification } from "../../stores/useNotificationStore";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const dismiss = useNotificationStore((s) => s.dismiss);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="notif-panel" ref={panelRef}>
      <div className="notif-panel__header">
        <span className="notif-panel__title">Notifications</span>
        <div className="notif-panel__header-actions">
          <button className="notif-panel__action-btn" onClick={markAllRead}>
            Mark all read
          </button>
          <button className="notif-panel__action-btn" onClick={clearAll}>
            Clear all
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="notif-panel__empty">
          <Bell size={28} />
          <span>No notifications</span>
        </div>
      ) : (
        <ul className="notif-panel__list">
          {notifications.map((n: Notification) => {
            const IconComp = n.icon
              ? ((Icons as unknown as Record<string, Icons.LucideIcon>)[n.icon] ?? Icons.Bell)
              : Icons.Bell;
            return (
              <li key={n.id} className={`notif-panel__item${n.read ? "" : " notif-panel__item--unread"}`}>
                <span className="notif-panel__item-icon">
                  <IconComp size={16} color={n.color ?? "var(--color-accent)"} />
                </span>
                <span className="notif-panel__item-body">
                  <span className="notif-panel__item-title">{n.title}</span>
                  <span className="notif-panel__item-message">{n.message}</span>
                </span>
                <span className="notif-panel__item-time">{timeAgo(n.timestamp)}</span>
                <button
                  className="notif-panel__item-dismiss"
                  onClick={() => dismiss(n.id)}
                  aria-label="Dismiss"
                >
                  <X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
