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

## Email/Password and Social Sign-In

The web frontend and Electron desktop app use the Express authentication service in `backend/`. Email/password credentials are handled by this service; social sign-in uses Google, GitHub, or Microsoft OAuth.

1. Install the backend dependencies with `npm --prefix backend install`.
2. Copy `backend/.env.example` to `backend/.env`. Set a random `SESSION_SECRET` of at least 32 characters. The service uses SQLite by default; set `AUTH_DATABASE_PATH` only if you want to choose a different database file. Email/password signup works without OAuth provider credentials. To enable a social provider, set both its client ID and secret; a provider with missing credentials is disabled with an explicit error. Set `MICROSOFT_TENANT` to `common` for personal and organizational Microsoft accounts, or to your Entra tenant ID to restrict sign-in to that tenant.
3. Register these callback URLs with the OAuth providers:
   - Microsoft: `http://localhost:3001/auth/microsoft/callback`
   - Google: `http://localhost:3001/auth/google/callback`
   - GitHub: `http://localhost:3001/auth/github/callback`
4. Set Google's authorized JavaScript origin to `http://localhost:5173`, and register the Microsoft callback as a Web redirect URI in the Microsoft Entra app registration. Grant Microsoft Graph delegated `User.Read` permission. Set the frontend API URL in `frontend/.env` using `frontend/.env.example` as a template.
5. Start the frontend with `npm run frontend:dev` and the auth service in a separate terminal with `npm run auth:dev`. In Electron, social sign-in opens the provider flow in your system browser and hands the authenticated account back to the desktop app after authentication.

The service stores password accounts, provider identities, sign-in sessions, and short-lived desktop handoff tickets in SQLite. Passwords are never stored in plaintext: the backend hashes them with per-account random salts and `scrypt`, and verifies them with a timing-safe comparison. Login and signup attempts are rate limited, OAuth state is validated, and credentialed CORS is restricted to `FRONTEND_URL`. Existing accounts are not automatically linked across providers by email. In Electron, agent and file IPC operations verify the backend session before proceeding; failed or unavailable session verification denies the operation. In production, serve both apps over HTTPS; set `NODE_ENV=production` and set `TRUST_PROXY=true` when TLS terminates at a trusted reverse proxy. The frontend and backend must use the same site for the default `lax` cookie setting; deployments on separate sites need HTTPS and `SESSION_COOKIE_SAME_SITE=none`.

Email/password signup and login create and verify SQLite accounts. Desktop login sessions are maintained by Electron's session cookie store; OAuth sign-in uses a short-lived, single-use handoff ticket from the system browser to the app. OAuth client secrets and the session secret belong only in the ignored `backend/.env` file. No Firebase migration is required.

---

## Documentation Links

- **Codebase Layout & Responsibilities**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Team Standards & Guidelines**: [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
- **Frontend Architecture & Components**: [frontend/FRONTEND_GUIDE.md](frontend/FRONTEND_GUIDE.md)
- **System Architecture Synopsis**: [docs/SYNOPSIS.md](docs/SYNOPSIS.md)
