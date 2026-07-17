import { useRef, useLayoutEffect, useState } from "react";
import * as Icons from "lucide-react";
import type { ContextMenuItem } from "../../types";
import { cx } from "../../lib/helpers";
import "./ContextMenu.css";

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 4;
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 4;
    setPos({ left, top });
  }, [x, y]);

  return (
    <div
      className="ctx-overlay"
      onClick={onClose}
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      <ul
        ref={menuRef}
        className="ctx-menu"
        style={{ left: pos.left, top: pos.top }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, i) => {
          const ItemIcon = item.icon
            ? (Icons as Record<string, Icons.LucideIcon>)[item.icon] ?? null
            : null;
          return (
            <li key={i}>
              {item.separatorBefore && <div className="ctx-sep" />}
              <div
                className={cx("ctx-item", item.danger && "ctx-item--danger")}
                onClick={() => { item.onClick(); onClose(); }}
              >
                {ItemIcon && <ItemIcon size={15} />}
                {item.label}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
