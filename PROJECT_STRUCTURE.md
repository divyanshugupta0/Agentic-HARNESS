# Agentic Harness — Complete Project Structure & Codebase Map

This document explains the organization of the **Agentic Harness** repository, establishing a clear separation of concerns between the desktop runtime (Electron & Node.js) and the presentation layer (React & Vite).

---

## 1. High-Level Workspace Architecture

The repository is organized into distinct directories to prevent frontend and backend coupling:

```text
Agentic-HARNESS/
│
├── frontend/                  # React + Vite Single-Page Application (Presentation Layer)
├── agentic-harness/           # Electron + Node.js Desktop Runtime (Backend Layer)
├── docs/                      # Architectural specifications and project synopsis
│
├── package.json               # Root workspace orchestrator scripts
├── README.md                  # Project overview, installation, and run instructions
├── PROJECT_STRUCTURE.md       # Directory layout and file responsibilities (This file)
└── DEVELOPMENT_GUIDE.md       # Coding conventions, naming standards, and team guidelines
```

---

## 2. Directory Breakdown

### A. Root Workspace
| File / Directory | Responsibility | When to Modify |
| :--- | :--- | :--- |
| `package.json` | Top-level npm script orchestrator (`npm run dev`, `npm run build`) | Only when adding workspace-wide workflow commands |
| `README.md` | Primary onboarding guide and quickstart documentation | When updating high-level features or setup steps |
| `PROJECT_STRUCTURE.md`| Complete codebase layout documentation | When files or directories are restructured |
| `DEVELOPMENT_GUIDE.md`| Code style, naming conventions, and team protocols | When team engineering standards evolve |
| `docs/SYNOPSIS.md` | Original architectural specification and problem statement | Reference document — read-only |

---

### B. Frontend (`frontend/`)
The frontend is an isolated, modern single-page application built with React 18, Vite, and Lucide React. It can be developed and previewed independently in a web browser or hosted inside the Electron desktop window.

```text
frontend/
├── public/
│   ├── assets/                # Static fonts and imagery
│   └── logo.svg               # SVG application logo
│
├── src/
│   ├── assets/                # Bundled assets imported directly in JSX
│   │   └── logo.svg
│   │
│   ├── components/            # Reusable UI component modules
│   │   ├── common/            # Atomic, application-agnostic primitives
│   │   │   ├── Button.jsx     # Multi-variant button (primary, secondary, ghost, danger)
│   │   │   ├── IconButton.jsx # Minimalist icon button with active/hover states
│   │   │   ├── Modal.jsx      # Accessible modal dialog with backdrop & Escape key listener
│   │   │   └── Tooltip.jsx    # Floating hover tooltip
│   │   │
│   │   ├── layout/            # Layout shell & global navigation
│   │   │   ├── AppLayout.jsx  # Primary grid/flex shell containing Sidebar & MainWorkspace
│   │   │   ├── Header.jsx     # Top navigation bar, model selector, tabs & agent indicator
│   │   │   ├── Sidebar.jsx    # Collapsible sidebar with search, history & user profile
│   │   │   └── MainWorkspace.jsx # Tab switcher rendering Chat, Files, or Marketplace
│   │   │
│   │   ├── chat/              # Conversational agent interface
│   │   │   ├── ChatWorkspace.jsx # Main chat layout: message list + prompt composer
│   │   │   ├── ChatWelcome.jsx # Empty-state onboarding with clickable starter prompts
│   │   │   ├── ChatMessage.jsx # Message renderer with collapsible reasoning & execution traces
│   │   │   └── PromptInput.jsx # Multi-line prompt composer with tools popover & controls
│   │   │
│   │   ├── files/             # Built-in workspace file manager
│   │   │   ├── FilesWorkspace.jsx # Split container coordinating explorer, tabs, and editor
│   │   │   ├── FileExplorer.jsx  # File tree hierarchy, file creation & recent files
│   │   │   ├── FileTabs.jsx   # Multi-file open tabs bar
│   │   │   └── FileEditor.jsx # Syntax editor with dynamic line numbers and Ctrl+S saving
│   │   │
│   │   ├── marketplace/       # Agent and tools extension registry
│   │   │   ├── Marketplace.jsx # Category filter pills, search input & plugin card grid
│   │   │   ├── PluginCard.jsx # Card displaying metadata, enable/disable toggle & install CTA
│   │   │   └── PluginDetails.jsx # Settings modal for editing plugin parameters
│   │   │
│   │   └── auth/              # Authentication screens
│   │       ├── SignIn.jsx     # Sign-in form with email, password & remember-me
│   │       ├── SignUp.jsx     # Registration form with full name, email & password
│   │       └── AuthLayout.jsx # Modal wrapper switching between SignIn and SignUp
│   │
│   ├── pages/
│   │   └── Workspace.jsx      # Root page container mounting AppLayout
│   │
│   ├── services/              # Pure business logic and communication layers
│   │   ├── api.js             # Electron contextBridge IPC caller with web mock fallback
│   │   ├── authService.js     # User session management and local profile persistence
│   │   ├── chatService.js     # Conversation history management and execution simulation
│   │   ├── fileService.js     # Virtual & local filesystem operations and tab management
│   │   └── pluginService.js   # Extensible tool and plugin registry
│   │
│   ├── hooks/                 # Reusable custom React hooks
│   │   ├── useAuth.js         # Access authentication state and actions
│   │   ├── useChat.js         # Access conversations, model selection & agent commands
│   │   ├── useWorkspace.js    # Access active tab, sidebar toggle & file editor state
│   │   └── useDebounce.js     # Debounce search inputs to optimize performance
│   │
│   ├── context/               # Global React state providers
│   │   ├── AuthContext.jsx    # User session, login/logout, and auth modal state
│   │   ├── ChatContext.jsx    # Active conversation, message stream, tools & agent status
│   │   └── WorkspaceContext.jsx # Layout tab, sidebar collapse state & open files
│   │
│   ├── constants/             # Immutable configurations
│   │   ├── navigation.js      # Tab constants (chat, files, marketplace) & date groupings
│   │   ├── models.js          # Supported models (Claude 3.7, DeepSeek R1, GPT-4o, Ollama)
│   │   └── tools.js           # Built-in agent tools (fsTool, shellTool, httpTool, webSearch)
│   │
│   ├── styles/                # Modular BEM CSS architecture
│   │   ├── variables.css      # Design tokens (colors, typography, radii, transitions)
│   │   ├── global.css         # Resets, typography, scrollbars, and body styling
│   │   ├── layout.css         # AppLayout, Sidebar, Header, and MainWorkspace styles
│   │   ├── components.css     # Buttons, chat messages, file tree, editor, cards, modals
│   │   └── responsive.css     # Breakpoint adaptations for tablet and compact views
│   │
│   ├── utils/                 # Pure helper functions
│   │   ├── cn.js              # Class name joining helper
│   │   ├── fileIcons.jsx      # Mapping of file types to Lucide icons and colors
│   │   └── formatDate.js      # Date grouping and friendly clock time formatters
│   │
│   ├── App.jsx                # Top-level provider setup (Auth + Workspace + Chat)
│   ├── main.jsx               # React 18 createRoot DOM mount point
│   ├── index.html             # HTML5 template with Inter and JetBrains Mono fonts
│   ├── vite.config.js         # Vite configuration (relative base, path aliases)
│   ├── package.json           # Frontend dependencies (React, Vite, Lucide React)
│   └── FRONTEND_GUIDE.md      # Detailed developer documentation for frontend team
```

---

### C. Desktop Backend (`agentic-harness/`)
The backend is responsible for native desktop capabilities, IPC communication, agent orchestration, and system tool execution under strict safety controls.

```text
agentic-harness/
├── src/
│   ├── main/                  # Electron Main Process & Native Integration
│   │   ├── main.js            # Electron entry point, window creation & frontend loader
│   │   ├── preload.js         # Secure contextBridge exposing window.api to renderer
│   │   └── ipcHandlers.js     # IPC channel handlers (agent:start/stop/pause, file:read/write)
│   │
│   ├── agents/                # Agent Orchestration Engine
│   │   ├── baseAgent.js       # BaseAgent class definition (state machine, run loop)
│   │   └── agents.json        # Template agent definitions and prompt profiles
│   │
│   ├── tools/                 # Allowlisted Desktop System Tools
│   │   ├── fsTool.js          # Sandboxed filesystem reader & writer
│   │   ├── shellTool.js       # Allowlisted CLI command execution
│   │   └── httpTool.js        # HTTP request client
│   │
│   ├── memory/                # Memory Management
│   │   └── memoryStore.js     # Short-term context memory store and vector cache interface
│   │
│   ├── config/                # Environment & Desktop Settings
│   │   ├── config.json        # Default window dimensions, storage paths, default models
│   │   └── .env.example       # API key and runtime configuration template
│   │
│   └── renderer/              # Fallback Renderer Container
│       └── index.html         # Informative fallback page if dist is uncompiled
│
├── scripts/                   # Desktop Build & Development Automation
│   ├── dev.js                 # Dev script: compiles frontend, sanitizes env & launches Electron
│   └── build.js               # Prod script: builds frontend and packages via electron-builder
│
├── electron-builder.json      # Desktop packager configuration (Windows NSIS, Mac DMG, Linux)
└── package.json               # Backend dependencies (Electron, electron-builder)
```

---

## 3. Where to Add New Features

| Feature Type | Directory | Instructions |
| :--- | :--- | :--- |
| **New UI Component** | `frontend/src/components/<category>/` | Use PascalCase (`MyComponent.jsx`). Keep business logic in services or hooks. |
| **New Navigation Tab** | `frontend/src/constants/navigation.js` | Add constant to `TABS`, add trigger in `Header.jsx`, render in `MainWorkspace.jsx`. |
| **New Custom Hook** | `frontend/src/hooks/` | Use camelCase with `use` prefix (`useCustomHook.js`). |
| **New Utility Function**| `frontend/src/utils/` | Add to existing file or create `newUtil.js`. Ensure functions are pure. |
| **New Marketplace Tool**| `frontend/src/services/pluginService.js` | Add item to `INITIAL_PLUGINS` registry array. |
| **New Backend System Tool**| `agentic-harness/src/tools/` | Implement allowlisted tool in `myTool.js`, export async functions, register in `ipcHandlers.js`. |
| **New IPC Channel** | `agentic-harness/src/main/ipcHandlers.js` | Add `ipcMain.handle('channel:name', ...)` and expose via `src/services/api.js`. |
| **New Agent Template** | `agentic-harness/src/agents/agents.json` | Add template entry with system prompt, required tools, and capabilities. |

