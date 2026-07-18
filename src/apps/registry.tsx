import type { AppDefinition, AppId } from "../types";
import { Calculator } from "./Calculator/Calculator";
import { TextEditor } from "./TextEditor/TextEditor";
import { FileExplorer } from "./FileExplorer/FileExplorer";
import { Terminal } from "./Terminal/Terminal";
import { Settings } from "./Settings/Settings";
import { MiniBrowser } from "./MiniBrowser/MiniBrowser";
import { AboutMe } from "./AboutMe/AboutMe";
import { Paint } from "./Paint/Paint";
import { Clock } from "./Clock/Clock";
import { TaskManager } from "./TaskManager/TaskManager";

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
    defaultWidth: 320,
    defaultHeight: 500,
    minWidth: 280,
    minHeight: 440,
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
    component: MiniBrowser,
    defaultWidth: 900,
    defaultHeight: 600,
    minWidth: 520,
    minHeight: 360,
  },
  "about-me": {
    id: "about-me",
    name: "About Me",
    icon: "User",
    component: AboutMe,
    defaultWidth: 560,
    defaultHeight: 520,
    minWidth: 380,
    minHeight: 320,
    singleInstance: true,
  },
  "paint": {
    id: "paint",
    name: "Paint",
    icon: "Paintbrush",
    component: Paint,
    defaultWidth: 860,
    defaultHeight: 580,
    minWidth: 520,
    minHeight: 400,
  },
  "clock": {
    id: "clock",
    name: "Clock",
    icon: "Clock",
    component: Clock,
    defaultWidth: 380,
    defaultHeight: 540,
    minWidth: 320,
    minHeight: 420,
    singleInstance: true,
  },
  "task-manager": {
    id: "task-manager",
    name: "Task Manager",
    icon: "Activity",
    component: TaskManager,
    defaultWidth: 560,
    defaultHeight: 440,
    minWidth: 440,
    minHeight: 320,
    singleInstance: true,
  },
};

export const getApp = (id: AppId): AppDefinition => appRegistry[id];
