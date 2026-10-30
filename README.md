# Agentic Harness

> **Local-First Autonomous AI Agent Desktop Platform**  
> Inspired by ChatGPT, Claude, and DeepSeek — built with React 18, Vite, Node.js, and Electron.

---

## Overview

**Agentic Harness** is a local-first desktop application platform designed to orchestrate, execute, and monitor autonomous AI agents directly on a user's workstation. It integrates language model planning with secure, allowlisted local system tools (file system, terminal shell, and HTTP clients) while maintaining strict Electron sandboxing and context isolation.

---

## Key Features

- **Conversational Agent Workspace**: Modern multi-turn chat interface with auto-scrolling, starter missions, and model selector (Claude 3.7 Sonnet, DeepSeek R1, GPT-4o, Ollama Local).
- **DeepSeek & Claude-Style Reasoning**: Collapsible thought process and real-time step-by-step action execution traces (`agent:start`, `agent:log`, `agent:result`).
- **Built-in Files Workspace**: Dual-pane file manager with tree explorer, multi-tab editor, line numbering, dirty/unsaved state tracking, and local file saving (`Ctrl+S` / `Cmd+S`).
- **Agent Marketplace & Tools**: Expandable registry with category filtering (AI Agents, Developer Tools, Automation, Integrations) and parameter configuration.
- **Local User Authentication**: Sign In and Sign Up modal interfaces with remember-me state persistence and secure separation from UI components.
- **Dual Runtime Support**: Operates both as a native Electron desktop app (with IPC context bridge) and as a standalone Vite web application for frontend development.

---

## Clean Repository Structure

```text
Agentic-HARNESS/
│
├── frontend/                  # React 18 + Vite Single-Page Application
│   ├── src/
│   │   ├── components/        # UI components (common, layout, chat, files, marketplace, auth)
│   │   ├── hooks/             # Custom hooks (useChat, useWorkspace, useAuth, useDebounce)
│   │   ├── utils/             # Consolidated helpers (fileIcons, formatDate, cn)
│   │   ├── context/           # React context providers (AuthContext, ChatContext, WorkspaceContext)
│   │   ├── services/          # Decoupled business logic (api, auth, chat, file, plugin)
│   │   ├── constants/         # Application constants (navigation, models, tools)
│   │   └── styles/            # Modular BEM CSS (variables, global, layout, components, responsive)
│   ├── FRONTEND_GUIDE.md      # Detailed frontend component & styling guide
│   ├── vite.config.js
│   └── package.json
│
├── agentic-harness/           # Electron Desktop Main Process & Agent Runtime
│   ├── src/
│   │   ├── main/              # main.js, preload.js (contextBridge), ipcHandlers.js
│   │   ├── agents/            # baseAgent.js, agents.json
│   │   ├── tools/             # fsTool.js, shellTool.js, httpTool.js
│   │   ├── memory/            # memoryStore.js
│   │   ├── config/            # config.json, .env.example
│   │   └── renderer/          # Fallback renderer container (index.html)
│   ├── scripts/               # dev.js, build.js
│   ├── electron-builder.json  # Desktop packager configuration
│   └── package.json
│
├── docs/                      # Project documentation and specifications
│   └── SYNOPSIS.md            # Original architecture and requirements synopsis
│
├── package.json               # Root workspace scripts orchestrator
├── README.md                  # Project overview and setup instructions (This file)
├── PROJECT_STRUCTURE.md       # Complete directory layout and file responsibility map
└── DEVELOPMENT_GUIDE.md       # Engineering conventions, naming standards, and team guidelines
```

---

## Quick Start

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install desktop runtime dependencies
cd ../agentic-harness
npm install
```

### 2. Configure Environment

```bash
cd agentic-harness
cp src/config/.env.example src/config/.env
```

### 3. Run Development Server

**Option A: Launch Electron Desktop Application (Recommended)**
```bash
npm run dev
```

**Option B: Standalone Web Browser Preview**
```bash
npm run frontend:dev
# Available at http://localhost:5173
```

### 4. Build for Production

```bash
npm run build
```

---

## Documentation Links

- **Codebase Layout & Responsibilities**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Team Standards & Guidelines**: [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
- **Frontend Architecture & Components**: [frontend/FRONTEND_GUIDE.md](frontend/FRONTEND_GUIDE.md)
- **System Architecture Synopsis**: [docs/SYNOPSIS.md](docs/SYNOPSIS.md)
