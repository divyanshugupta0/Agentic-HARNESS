# Agentic Harness

> **Local-First Autonomous AI Agent Desktop Platform**  
> Inspired by ChatGPT, Claude, and DeepSeek — built with React, Vite, Node.js, and Electron.

---

## Overview

**Agentic Harness** is a local-first desktop application platform designed to run, orchestrate, and supervise autonomous AI agents locally on your workstation. It integrates language model planning with secure, allowlisted local system tools (file system, terminal shell, and HTTP clients) while maintaining strict sandboxing and context isolation.

---

## Key Features

- **Modern Conversational Agent Workspace**: ChatGPT & Claude-inspired multi-turn chat interface with auto-scrolling, starter suggestions, and model switcher.
- **DeepSeek & Claude-Style Reasoning**: Collapsible thought process and real-time step-by-step action execution traces (`agent:start`, `agent:log`, `agent:result`).
- **Built-in Files Workspace**: Dual-pane file manager with tree explorer, multi-tab editor, line numbering, dirty/unsaved state tracking, and local file saving (`Ctrl+S` / `Cmd+S`).
- **Agent Marketplace & Tools**: Expandable registry with category filtering (AI Agents, Developer Tools, Automation, Integrations) and parameter configuration.
- **Local User Authentication**: Sign In and Sign Up modal interfaces with remember-me state persistence and secure separation from UI components.
- **Dual Runtime Support**: Operates both as a native Electron desktop app (with IPC context bridge) and as a standalone Vite web application for frontend development.

---

## Repository Structure

```text
Agentic-HARNESS/
├── frontend/                  # Modern React + Vite Single-Page Application
│   ├── src/
│   │   ├── components/        # Common, layout, chat, files, marketplace, auth
│   │   ├── context/           # AuthContext, ChatContext, WorkspaceContext
│   │   ├── services/          # api.js, authService.js, chatService.js, fileService.js, pluginService.js
│   │   └── styles/            # variables.css, global.css, layout.css, components.css, responsive.css
│   ├── FRONTEND_GUIDE.md      # Comprehensive team development guide & BEM/ID reference
│   ├── vite.config.js
│   └── package.json
│
├── agentic-harness/           # Electron Desktop Main Process & Agent Runtime
│   ├── src/
│   │   ├── main/              # main.js, preload.js (contextBridge), ipcHandlers.js
│   │   ├── agents/            # baseAgent.js, agents.json
│   │   ├── tools/             # fsTool.js, shellTool.js, httpTool.js
│   │   ├── memory/            # memoryStore.js
│   │   └── config/            # config.json, .env.example
│   ├── scripts/               # dev.js, build.js, build-renderer.js
│   └── package.json
│
├── package.json               # Root workspace scripts
└── README.md
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

## Documentation

For component APIs, BEM naming conventions, HTML IDs, and guidelines for adding new tabs or tools, consult [frontend/FRONTEND_GUIDE.md](frontend/FRONTEND_GUIDE.md).
