import type { LucideIcon } from "lucide-react";
import "./AppDesign.css";

export function AppHeading({
  icon: Icon,
  title,
  subtitle,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  detail?: string;
}) {
  return (
    <header className="app-heading">
      <span className="app-heading__icon" aria-hidden="true">
        <Icon size={28} strokeWidth={1.7} />
      </span>
      <div>
        <p className="app-heading__eyebrow">{subtitle}</p>
        <h1>{title}</h1>
      </div>
      {detail && <span className="app-heading__detail">{detail}</span>}
    </header>
  );
}
