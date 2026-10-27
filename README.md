# Node.js Electron Agentic Harness

A cross-platform desktop application built with **Node.js** and **Electron** that serves as an agentic AI harness — orchestrating autonomous agents, tool calling, LLM integration, local execution, and desktop automation.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Requirements](#system-requirements)
3. [Software Requirements](#software-requirements)
4. [Technology Stack](#technology-stack)
5. [Architecture](#architecture)
6. [Installation & Setup](#installation--setup)
7. [Configuration](#configuration)
8. [Usage](#usage)
9. [Agentic Harness Features](#agentic-harness-features)
10. [Electron-Specific Requirements](#electron-specific-requirements)
11. [Security Requirements](#security-requirements)
12. [Testing](#testing)
13. [Build & Packaging](#build--packaging)
14. [Project Structure](#project-structure)
15. [Contributing](#contributing)
16. [License](#license)

---

## Project Overview

The **Agentic Harness** is an Electron desktop application that provides a local, controllable environment for running AI agents. It combines Electron's desktop capabilities with Node.js backend services to manage LLM-driven agents, tool execution, file system access, system commands, and multi-agent workflows — all running locally on the user's machine.

### Goals

- Run autonomous or semi-autonomous AI agents locally
- Provide secure, sandboxed tool execution (filesystem, shell, APIs)
- Orchestrate multi-agent workflows with memory and state
- Offer a desktop GUI for monitoring, configuration, and intervention
- Support pluggable LLM providers (OpenAI, Anthropic, local models, etc.)
- Enable extensible tool/skill registration

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10 / macOS 11 / Linux (Ubuntu 20.04+) | Windows 11 / macOS 14 / Linux (Ubuntu 22.04+) |
| **CPU** | 4 cores @ 2.0 GHz | 8+ cores @ 3.0 GHz |
| **RAM** | 8 GB | 16 GB+ |
| **Disk** | 2 GB free | 10 GB+ free (SSD recommended) |
| **Display** | 1280x720 | 1920x1080+ |
| **Network** | Broadband for LLM API access | Broadband + low latency for streaming |

---

## Software Requirements

### Runtime

| Software | Version | Notes |
|----------|---------|-------|
| **Node.js** | v18.x or v20.x LTS | Required for Electron and backend |
| **npm** | v9.x or v10.x | Comes with Node.js |
| **Electron** | v27.x or v28.x | Desktop framework |
| **Python** (optional) | v3.10+ | Only if using Python-based agent tools |
| **Git** | v2.30+ | Version control |

### Development Tools

| Tool | Purpose |
|------|---------|
| **VS Code** | Recommended editor |
| **ESLint** | JavaScript/TypeScript linting |
| **Prettier** | Code formatting |
| **Devtron / Electron DevTools** | Debugging Electron processes |
| **Docker** (optional) | Containerized agent tools |

---

## Technology Stack

### Core
- **Electron** — Cross-platform desktop framework (Chromium + Node.js)
- **Node.js** — Backend runtime and package ecosystem
- **JavaScript/TypeScript** — Primary application languages

### Agentic / AI
- **LLM Providers** — OpenAI, Anthropic, Ollama (local), Azure OpenAI, etc.
- **Agent Framework** — Custom or LangChain.js / AutoGen-style orchestration
- **Vector Database** (optional) — Chroma, Pinecone, or local SQLite-vec for agent memory
- **Embedding Model** — For semantic memory and retrieval

### UI
- **HTML/CSS/JavaScript** — Renderer process UI
- **Tailwind CSS** (optional) — Styling
- **Electron Forge** or **electron-builder** — Packaging and distribution

### IPC & Communication
- **Electron IPC (ipcMain / ipcRenderer)** — Main ↔ Renderer communication
- **Node.js child_process** — Shell/tool execution
- **WebSockets** (optional) — Real-time agent event streaming

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  • Window management                                       │
│  • IPC handlers                                            │
│  • Agent orchestrator                                      │
│  • Tool registry & execution                               │
│  • File system & shell access                              │
│  • Auto-updater                                            │
└─────────────────────────────────────────────────────────┘
                          │ IPC
┌─────────────────────────────────────────────────────────┐
│                  Renderer Process (UI)                   │
│  • React/Vue/Vanilla JS frontend                         │
│  • Agent chat interface                                  │
│  • Tool execution logs                                   │
│  • Settings & configuration                              │
└─────────────────────────────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │   Preload Script      │
              │  (contextBridge)      │
              └───────────▲───────────┘
                          │
              ┌───────────┴───────────┐
              │   Node.js Backend     │
              │  • LLM clients        │
              │  • Agent loops        │
              │  • Memory store       │
              │  • Tool plugins       │
              └───────────────────────┘
```

### Process Model
- **Main Process**: `main.js` — privileged, Node.js APIs, window lifecycle
- **Preload Script**: `preload.js` — exposes safe APIs to renderer via `contextBridge`
- **Renderer Process**: `renderer.js` — UI only, no direct Node.js access (contextIsolation enabled)

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd agentic-harness
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```env
# LLM Provider
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Local Model (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# Application
APP_PORT=3000
LOG_LEVEL=info
AGENT_MAX_ITERATIONS=10
```

### 4. Run in Development

```bash
npm run dev
```

### 5. Run in Production

```bash
npm start
```

---

## Configuration

Configuration is managed through:
- **`.env`** — Environment variables (API keys, endpoints)
- **`config.json`** — Application settings (agent limits, tool permissions)
- **`agents.json`** — Agent definitions, system prompts, and tool assignments

Example `config.json`:

```json
{
  "agent": {
    "maxIterations": 10,
    "timeoutMs": 60000,
    "enableMemory": true
  },
  "tools": {
    "allowFileSystem": true,
    "allowShell": false,
    "allowNetwork": true
  },
  "ui": {
    "theme": "dark",
    "windowWidth": 1200,
    "windowHeight": 800
  }
}
```

---

## Usage

### Starting an Agent

1. Launch the application
2. Select an LLM provider and enter API credentials
3. Choose or create an agent from the dashboard
4. Provide a goal or task
5. Monitor execution in the real-time log panel

### Available CLI Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Electron in development mode with hot reload |
| `npm start` | Start packaged production build |
| `npm run build` | Build production application |
| `npm run package` | Create platform-specific installers |
| `npm test` | Run unit and integration tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

## Agentic Harness Features

### Core Agent Capabilities
- **Goal-driven execution** — Agents accept natural language objectives
- **Tool use** — Agents can call registered tools (filesystem, shell, API, web)
- **Memory** — Short-term conversation memory + long-term vector memory
- **Planning** — Multi-step task decomposition and execution
- **Human-in-the-loop** — Approve/reject tool calls before execution

### Tool Categories
| Category | Example Tools | Risk Level |
|----------|---------------|------------|
| Filesystem | read, write, list, delete | High |
| Shell | run command, check output | Critical |
| Network | HTTP requests, web scrape | Medium |
| LLM | completion, embedding | Low |
| System | clipboard, notification, tray | Medium |

### Multi-Agent Support
- Agent-to-agent messaging
- Shared blackboard memory
- Supervisor/worker patterns
- Swarm orchestration (optional)

---

## Electron-Specific Requirements

### Security Configuration (Non-Negotiable)

The following must be enforced in `main.js` / `preload.js`:

| Setting | Value | Reason |
|---------|-------|--------|
| `contextIsolation` | `true` | Prevents renderer access to Electron/Node internals |
| `nodeIntegration` | `false` | Renderer cannot use Node.js APIs directly |
| `enableRemoteModule` | `false` | Remote module is deprecated/unsafe |
| `webPreferences.sandbox` | `true` (where possible) | Chromium sandbox for renderer |
| `webSecurity` | `true` | Enforces same-origin policy |

### IPC Contract

All communication between renderer and main must go through typed IPC channels:

```javascript
// Preload exposes only safe methods
contextBridge.exposeInMainWorld('electronAPI', {
  invokeAgent: (payload) => ipcRenderer.invoke('agent:run', payload),
  getTools: () => ipcRenderer.invoke('tools:list'),
  onAgentEvent: (callback) => ipcRenderer.on('agent:event', callback)
});
```

### Window Requirements
- Frameless or native title bar option
- Always-on-top toggle
- System tray integration
- Auto-updater (via `electron-updater`)
- Single instance lock

---

## Security Requirements

1. **No arbitrary code execution** — Agents cannot eval user input directly
2. **Tool permission model** — Each tool requires explicit user or policy approval
3. **API key storage** — Encrypted local storage, never hardcoded
4. **Sandboxed renderer** — No Node.js access in renderer process
5. **Input validation** — All agent inputs/outputs validated against schemas
6. **Audit logging** — All tool executions logged with timestamps and user context
7. **Network allowlist** (optional) — Restrict outbound connections to known endpoints

---

## Testing

| Test Type | Tool | Command |
|-----------|------|---------|
| Unit tests | Jest | `npm run test:unit` |
| Integration tests | Jest + Spectron | `npm run test:integration` |
| E2E tests | Playwright | `npm run test:e2e` |
| Linting | ESLint | `npm run lint` |
| Type check | TypeScript | `npm run typecheck` |

---

## Build & Packaging

```bash
# Create distributable for current platform
npm run package

# Create for all platforms (Windows, macOS, Linux)
npm run package:all
```

Output: `dist/` directory containing platform-specific installers (`.msi`, `.dmg`, `.AppImage`, `.deb`, `.rpm`).

Code signing is required for macOS and Windows distribution.

---

## Project Structure

```
agentic-harness/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── package.json
├── README.md
├── config.json
├── agents.json
├── main/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Context bridge
│   ├── ipcHandlers.js   # IPC channel handlers
│   └── updater.js       # Auto-updater logic
├── renderer/
│   ├── index.html       # UI entry point
│   ├── renderer.js      # UI logic
│   ├── style.css        # Styling
│   └── components/      # UI components
├── src/
│   ├── agents/          # Agent definitions
│   ├── llm/             # LLM provider clients
│   ├── tools/           # Tool implementations
│   ├── memory/          # Memory & vector store
│   ├── orchestrator/    # Agent execution loop
│   └── utils/           # Helpers
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── dist/                # Build output
└── resources/           # Icons, native assets
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/name`
3. Commit changes: `git commit -m "feat: description"`
4. Push to branch: `git push origin feature/name`
5. Open a Pull Request

### Code Style
- Follow Prettier formatting
- ESLint must pass with zero errors
- Conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`)

---

## License

MIT License. See `LICENSE` for details.

---

## Disclaimer

This agentic harness executes autonomous agents that may access your filesystem, run shell commands, and make network requests. Review all tool permissions carefully. The authors are not responsible for unintended actions performed by agents. Always run in a controlled environment and maintain backups.
