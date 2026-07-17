import type { AppDefinition, AppId, AppProps } from "../types";
import { Calculator } from "./Calculator/Calculator";
import { TextEditor } from "./TextEditor/TextEditor";
import { FileExplorer } from "./FileExplorer/FileExplorer";
import { Terminal } from "./Terminal/Terminal";
import { Settings } from "./Settings/Settings";

const Placeholder = ({}: AppProps) => (
  <div style={{ padding: 20, color: "var(--color-text-dim)" }}>
    Coming soon…
  </div>
);

export const appRegistry: Record<AppId, AppDefinition> = {
  "file-explorer": {
    id: "file-explorer",
    name: "File Explorer",
    icon: "Folder",
    component: FileExplorer,
    defaultWidth: 720,
    defaultHeight: 480,
    minWidth: 480,
    minHeight: 320,
  },
  "text-editor": {
    id: "text-editor",
    name: "Text Editor",
    icon: "FileText",
    component: TextEditor,
    defaultWidth: 640,
    defaultHeight: 460,
    minWidth: 380,
    minHeight: 260,
  },
  "terminal": {
    id: "terminal",
    name: "Terminal",
    icon: "TerminalSquare",
    component: Terminal,
    defaultWidth: 640,
    defaultHeight: 400,
    minWidth: 380,
    minHeight: 240,
  },
  "calculator": {
    id: "calculator",
    name: "Calculator",
    icon: "Calculator",
    component: Calculator,
    defaultWidth: 300,
    defaultHeight: 440,
    minWidth: 260,
    minHeight: 380,
    singleInstance: true,
  },
  "settings": {
    id: "settings",
    name: "Settings",
    icon: "Settings",
    component: Settings,
    defaultWidth: 640,
    defaultHeight: 480,
    minWidth: 480,
    minHeight: 360,
    singleInstance: true,
  },
  "browser": {
    id: "browser",
    name: "Browser",
    icon: "Globe",
    component: Placeholder,
    defaultWidth: 900,
    defaultHeight: 600,
    minWidth: 520,
    minHeight: 360,
  },
  "about-me": {
    id: "about-me",
    name: "About Me",
    icon: "User",
    component: Placeholder,
    defaultWidth: 560,
    defaultHeight: 520,
    minWidth: 380,
    minHeight: 320,
    singleInstance: true,
  },
};

export const getApp = (id: AppId): AppDefinition => appRegistry[id];
