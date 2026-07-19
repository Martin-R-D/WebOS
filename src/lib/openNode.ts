import type { AppId, FsNode } from "../types";
import { appRegistry } from "../apps/registry";
import { useWindowStore } from "../stores/useWindowStore";
import { launchApp } from "./launch";
import { playSound } from "./sound";

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];

export function isImageFile(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_EXTS.some((ext) => lower.endsWith(ext));
}

/**
 * Open a filesystem node in the right app:
 *  - folder      -> File Explorer
 *  - *.app file  -> launch the referenced app
 *  - image file  -> Paint
 *  - other file  -> Text Editor
 * Reuses an already-open window for the same target when possible.
 */
export function openFsNode(node: FsNode) {
  const { windows, openWindow, focusWindow } = useWindowStore.getState();

  if (node.type === "folder") {
    const existing = windows.find(
      (w) => w.appId === "file-explorer" && w.launchProps?.folderId === node.id,
    );
    if (existing) { focusWindow(existing.id); return; }
    openWindow({
      appId: "file-explorer",
      title: node.name,
      icon: "Folder",
      width: 720,
      height: 480,
      launchProps: { folderId: node.id },
    });
    playSound("open");
    return;
  }

  if (node.name.endsWith(".app") && node.content && node.content in appRegistry) {
    launchApp(node.content as AppId);
    return;
  }

  const appId: AppId = isImageFile(node.name) ? "paint" : "text-editor";
  const existing = windows.find(
    (w) => w.appId === appId && w.launchProps?.fileId === node.id,
  );
  if (existing) { focusWindow(existing.id); return; }

  const def = appRegistry[appId];
  openWindow({
    appId,
    title: node.name,
    icon: appId === "paint" ? "Image" : "FileText",
    width: def.defaultWidth,
    height: def.defaultHeight,
    launchProps: { fileId: node.id },
  });
  playSound("open");
}
