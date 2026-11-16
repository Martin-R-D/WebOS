import { appRegistry } from "../registry";
import { useWindowStore } from "../../stores/useWindowStore";
import type { OfficeKind } from "./documents";

export function launchOffice(
  kind: OfficeKind,
  templateContent?: Record<string, unknown>,
) {
  const app = appRegistry[kind];
  return useWindowStore.getState().openWindow({
    appId: kind,
    title: app.name,
    icon: app.icon,
    width: app.defaultWidth,
    height: app.defaultHeight,
    launchProps: templateContent ? { templateContent } : undefined,
  });
}
