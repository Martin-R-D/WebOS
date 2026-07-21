<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

<h1 align="center">WebOS</h1>

<p align="center">
  A fully functional desktop operating system running entirely in the browser.<br/>
  Built with React, TypeScript, and Zustand - no backend, no database, just pure front-end magic.
</p>

<p align="center">
  <a href="https://web-6lvgfh8w8-martin-r-ds-projects.vercel.app/"><strong>Live Demo</strong></a>
</p>

---

## Overview

WebOS is a fully functional desktop operating system that runs entirely in the browser. It features a complete window manager, a virtual file system persisted in localStorage, drag-and-drop file management, 10 built-in applications, theming, keyboard shortcuts, and more - all without a single server-side dependency.

---

## Features

### Desktop Environment

| Feature | Description |
|---------|-------------|
| **Window Management** | Drag, resize (8-directional), minimize, maximize, and close windows. Z-index stacking with focus tracking. |
| **Movable Desktop Icons** | Freely drag icons anywhere on the desktop. Positions are saved and persist across sessions. |
| **Drag & Drop File Management** | Move files between the desktop and File Explorer by dragging. Drop onto folders to move files inside them. |
| **Taskbar** | Shows pinned apps and running windows. Click to focus/minimize. Right-click for Close/Unpin options. |
| **Start Menu** | Grid of all installed apps. Right-click any app to pin/unpin from the taskbar. |
| **Context Menus** | Right-click on the desktop, files, folders, taskbar items, and Start Menu apps for contextual actions. |
| **Three Themes** | Dark, Light, and Midnight. Fully token-based with CSS custom properties. |
| **Boot Animation** | Animated boot sequence with progress bar on first load. |
| **Lock Screen** | Blurred wallpaper with live clock. Press Enter or click to unlock. |
| **Sound Effects** | Synthesized UI sounds (Web Audio API, no audio files) for open, close, click, error, and chime events. Togglable in Settings. |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + `` ` (backtick) | Launch or focus the Terminal |
| `Ctrl + E` | Launch or focus File Explorer |
| `Ctrl + ,` | Launch or focus Settings |
| `Escape` | Close the Start Menu |

These shortcuts work globally and are safe  - they never interfere with typing in the Text Editor or Terminal.

### Virtual File System

- Flat-map architecture (`Record<string, FsNode>`) with parent-child relationships
- Persisted in localStorage with version-based migrations (currently v3)
- Duplicate name prevention  - creating, renaming, or moving a file/folder with a conflicting name is blocked
- Protected system nodes (root folders, System Apps, `.app` shortcuts) cannot be renamed, moved, or deleted
- The **System Apps** folder is fully locked: nothing can be dragged in or out
- Corruption recovery: if the persisted state fails to load, it auto-resets and reloads

### Built-in Applications

#### File Explorer
- Sidebar with quick-access folders (Root, Desktop, Documents, Pictures, System Apps)
- Toolbar with back/forward/up navigation, new folder, and new file buttons
- Double-click folders to navigate, files to open in the appropriate app
- Drag and drop files between folders, onto sidebar items, or out to the desktop
- Right-click context menu with Open, Rename, Move to, Move to Desktop, and Delete
- `.app` files show the app's icon and offer "Add to Taskbar" on right-click

#### Text Editor
- Full text editing with word/character count
- **Save** (overwrites current file) and **Save As** (pick folder + name via dialog)
- Overwrite confirmation popup on name collision
- Folder collision detection (can't overwrite a folder with a file)
- Dirty indicator (`•`) in the window title
- Opens automatically when you double-click a `.txt` file

#### Paint
- Canvas-based drawing with pointer capture for smooth strokes
- 10 colors, 4 brush sizes, eraser tool
- 25-step undo stack and clear canvas
- **Save / Save As** into the virtual file system (stored as PNG data URL)
- **Download** as a real PNG file to your computer
- Reopen saved `.png` files for further editing  - full round-trip persistence
- Opens automatically when you double-click an image file (`.png`, `.jpg`, `.gif`, `.webp`, `.bmp`)

#### Terminal
- Bash-like shell with command history (Arrow Up/Down) and tab completion
- Commands: `help`, `whoami`, `date`, `echo`, `clear`, `pwd`, `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `open`, `neofetch`
- `open <app>` launches any system app by name (e.g., `open calculator`, `open paint`)
- `neofetch` displays system info with ASCII art logo
- Error sound on invalid commands

#### Calculator
- Full expression engine (not simple A op B)  - type complex expressions like `2^(3+4)*5`
- Supports: `+`, `-`, `*`, `/`, `^` (power), `%` (percent), parentheses `()`
- Implicit multiplication: `2(3+4)` = 14
- Unary minus: `-(5+3)` = -8
- Live result preview as you type
- Float noise correction (`0.1 + 0.2` = `0.3`, not `0.30000000000000004`)
- Full keyboard support: digits, operators, Enter (=), Backspace, Escape (clear)

#### Browser
- Native start page with live clock, search bar, and speed-dial tiles
- Searches go to Wikipedia (which allows embedding)  - type a URL for direct navigation
- Loading progress bar animation
- Home button to return to the start page
- "Open in new tab" button for sites that block iframes
- No iframe loaded until you navigate  - lightweight by default

#### Clock
- **World Clock** tab: live time in 5 time zones (New York, London, Sofia, Tokyo, Sydney)
- **Stopwatch** tab: start/stop/reset with lap recording (drift-free via `performance.now()`)
- **Timer** tab: set minutes/seconds, countdown with chime sound and flash animation on completion

#### Task Manager
- Lists all open windows with their app icons
- Focus or close any window directly
- System stats: uptime, window count, current theme, memory usage
- "End all tasks" button (spares its own window)

#### Settings
- Theme selector (Dark / Light / Midnight)
- Wallpaper (gradient presets or custom CSS)
- Username (shown in Terminal prompt and lock screen)
- Accent color picker
- Sound toggle
- Factory reset (clears all persisted data and reloads)

#### About Me
- Portfolio information page (editable in the file system as `About Me.txt`)

### Persistence & Safety

- **Zustand + persist middleware** for file system and system settings
- **Window state is never persisted**  - fresh session every reload (intentional)
- **Version migrations** ensure new features (like added apps) appear for existing users without losing their files
- **Factory reset** available in Settings or via Terminal (`open settings`)
- **Corruption recovery** in `main.tsx`: if React fails to render due to corrupt state, all `webos-*` keys are cleared and the page reloads (guarded to prevent infinite loops)

### Design Details

- Fully responsive token system with CSS custom properties
- `prefers-reduced-motion` support  - all animations disabled for users who prefer it
- Backdrop blur on taskbar, start menu, and context menus
- Accent glow on focused windows
- Desktop icons lift on hover
- Drag-and-drop visual feedback (dashed outlines, highlighted targets)
- Grab cursor on draggable items

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite |
| State Management | Zustand (with persist middleware) |
| Icons | Lucide React |
| Styling | Vanilla CSS with custom properties (no CSS framework) |
| Audio | Web Audio API (synthesized, no audio files) |
| Storage | localStorage (no backend) |
| Deployment | Vercel |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Martin-R-D/WebOS.git
cd WebOS

# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

---

## Project Structure

```
src/
├── apps/                  # All built-in applications
│   ├── Calculator/        # Expression-based calculator
│   ├── Clock/             # World clock, stopwatch, timer
│   ├── FileExplorer/      # File browser with drag & drop
│   ├── MiniBrowser/       # Embedded web browser
│   ├── Paint/             # Canvas drawing app with save/load
│   ├── Settings/          # System preferences
│   ├── TaskManager/       # Running processes & stats
│   ├── Terminal/           # Command-line interface
│   ├── TextEditor/        # Text editor with Save As dialog
│   └── registry.tsx       # App definitions & metadata
├── lib/                   # Shared utilities
│   ├── dragDrop.ts        # Drag & drop logic
│   ├── fsGuards.ts        # Protected node checks
│   ├── helpers.ts         # General utilities
│   ├── launch.ts          # App launcher
│   ├── openNode.ts        # File-type routing
│   ├── sound.ts           # Web Audio synthesizer
│   └── useKeyboardShortcuts.ts  # Global hotkeys
├── shell/                 # OS chrome (desktop, taskbar, menus, windows)
│   ├── BootScreen/        # Boot animation & lock screen
│   ├── ContextMenu/       # Right-click menus (portaled)
│   ├── Desktop/           # Desktop with movable icons
│   ├── FileDialogs/       # Rename, delete, move dialogs
│   ├── SaveDialog/        # Save As with overwrite detection
│   ├── StartMenu/         # App launcher grid
│   ├── Taskbar/           # Bottom taskbar
│   └── Window/            # Window chrome (drag, resize, controls)
├── stores/                # Zustand state stores
│   ├── useFileSystemStore.ts  # Virtual file system (persisted)
│   ├── useSystemStore.ts      # Settings & icon positions (persisted)
│   └── useWindowStore.ts      # Window state (session only)
├── styles/                # Global CSS & design tokens
├── types/                 # TypeScript type definitions
├── App.tsx                # Root component
└── main.tsx               # Entry point with corruption recovery
```

---

## License

This project is licensed under the [MIT License](LICENSE).
