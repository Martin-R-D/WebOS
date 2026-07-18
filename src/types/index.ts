import type React from "react";

// ---------- File System ----------
export type NodeType = "file" | "folder";

export interface FsNode {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  content?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------- Apps ----------
export type AppId =
  | "file-explorer"
  | "text-editor"
  | "terminal"
  | "calculator"
  | "settings"
  | "browser"
  | "about-me"
  | "paint"
  | "clock"
  | "task-manager";

export interface AppDefinition {
  id: AppId;
  name: string;
  icon: string;
  component: React.ComponentType<AppProps>;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  singleInstance?: boolean;
}

export interface AppProps {
  windowId: string;
  launchProps?: Record<string, unknown>;
}

// ---------- Windows ----------
export interface WindowState {
  id: string;
  appId: AppId;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  prevBounds?: { x: number; y: number; width: number; height: number };
  launchProps?: Record<string, unknown>;
}

// ---------- System / Settings ----------
export type ThemeName = "dark" | "light" | "midnight";

export interface SystemSettings {
  theme: ThemeName;
  wallpaper: string;
  username: string;
  accentColor: string;
  soundEnabled: boolean;
}

// ---------- Context menu ----------
export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}
