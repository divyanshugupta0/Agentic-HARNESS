# Agentic Harness — Engineering & Development Guide

This guide establishes the engineering standards, naming conventions, and team collaboration protocols for developing on **Agentic Harness**. Every developer contributing to this repository must follow these conventions to maintain codebase cleanliness and prevent duplicate implementations.

---

## 1. Naming Conventions

Consistency across files, variables, and components ensures predictability across the team.

| Layer / Element | Convention | Example |
| :--- | :--- | :--- |
| **React Components** | PascalCase (`.jsx`) | `ChatWorkspace.jsx`, `FileExplorer.jsx` |
| **React Pages** | PascalCase (`.jsx`) | `Workspace.jsx` |
| **React Custom Hooks** | camelCase with `use` prefix (`.js`) | `useChat.js`, `useWorkspace.js`, `useDebounce.js` |
| **Frontend Services** | camelCase (`.js`) | `chatService.js`, `fileService.js`, `api.js` |
| **Utilities & Helpers** | camelCase (`.js` / `.jsx`) | `formatDate.js`, `fileIcons.jsx`, `cn.js` |
| **Context Providers** | PascalCase (`.jsx`) | `ChatContext.jsx`, `AuthContext.jsx` |
| **Constants** | camelCase (`.js`) | `navigation.js`, `models.js`, `tools.js` |
| **CSS Files** | kebab-case (`.css`) | `variables.css`, `components.css`, `layout.css` |
| **CSS Class Names** | BEM kebab-case | `.chat-workspace__messages`, `.btn--primary` |
| **HTML Unique IDs** | kebab-case | `app-root`, `sidebar-container`, `chat-send-button` |
| **Backend Main Files** | camelCase (`.js`) | `main.js`, `preload.js`, `ipcHandlers.js` |
| **Backend Agents & Tools**| camelCase (`.js`) | `baseAgent.js`, `fsTool.js`, `shellTool.js` |
| **Documentation Files** | UPPERCASE (`.md`) | `README.md`, `PROJECT_STRUCTURE.md`, `DEVELOPMENT_GUIDE.md` |

---

## 2. Architectural Boundaries & Code Separation

### Never Mix Frontend and Backend Modules
- **Frontend (`frontend/`)**: Must remain 100% decoupled from Node.js system internals (`fs`, `child_process`, `electron`). All interactions with the host operating system must go through the service layer (`src/services/api.js`) which uses Electron contextBridge (`window.api`).
- **Backend (`agentic-harness/`)**: Handles all privileged operations (local filesystem reads/writes, shell command execution, process lifecycle).

```text
[React UI] 
   └── [Hook (useChat)] 
         └── [Service (api.js)] 
               └── [ContextBridge (window.api)] 
                     └── [Electron IPC (main.js / ipcHandlers.js)] 
                           └── [Engine & Tools (fsTool, shellTool)]
```

---

## 3. Component Creation Guidelines

When building a new React component:
1. **Choose the Right Subdirectory**:
   - `src/components/common/`: Primitives with no domain knowledge (buttons, modals, tooltips).
   - `src/components/layout/`: Global structural elements (headers, sidebars).
   - `src/components/chat/`, `files/`, `marketplace/`, `auth/`: Domain-specific components.
2. **Export as Named Function**:
   ```jsx
   export function MyComponent({ propA, propB }) {
     return <div>...</div>;
   }
   ```
3. **Keep Presentation Separate from Logic**:
   - Do not make direct IPC calls inside components.
   - Use custom hooks (`useChat()`, `useWorkspace()`, `useAuth()`) to interact with state and business logic.
4. **Use Shared Utilities**:
   - Instead of duplicating helper logic (like file icons or date formatting), import them from `src/utils/`.

---

## 4. CSS Organization & BEM Styling

All styles use BEM (Block Element Modifier):

- **Block**: The root entity representing a component.
  ```css
  .chat-workspace { ... }
  ```
- **Element**: A child element belonging to the block, separated by double underscores (`__`).
  ```css
  .chat-workspace__messages { ... }
  .chat-workspace__composer { ... }
  ```
- **Modifier**: A state or variation, separated by double hyphens (`--`).
  ```css
  .sidebar--collapsed { ... }
  .btn--primary { ... }
  .header__tab-btn--active { ... }
  ```

### Design Token Usage
Never hardcode hex colors or arbitrary dimensions. Always utilize CSS variables declared in `src/styles/variables.css`:
```css
/* Preferred */
color: var(--text-primary);
background-color: var(--bg-secondary);
border: 1px solid var(--border-default);

/* Avoid */
color: #f1f5f9;
background-color: #0f1420;
```

---

## 5. Preventing Code Duplication

Before creating a new file or helper:
1. **Check Existing Services**: Review `src/services/` (`api.js`, `authService.js`, `chatService.js`, `fileService.js`, `pluginService.js`).
2. **Check Existing Hooks**: Review `src/hooks/` (`useAuth.js`, `useChat.js`, `useWorkspace.js`, `useDebounce.js`).
3. **Check Existing Utilities**: Review `src/utils/` (`fileIcons.jsx`, `formatDate.js`, `cn.js`).
4. **Consolidate Rather Than Copy**: If multiple components require similar logic, lift that logic into a shared hook or utility function.

---

## 6. Protected Files (Do Not Modify Casually)

The following files control core application security, lifecycle, and packaging:

| Protected File | Why it is Protected |
| :--- | :--- |
| `agentic-harness/src/main/preload.js` | Enforces the security boundary between Electron and the renderer (`contextIsolation`). Modifying without strict reviews risks exposing privileged system APIs. |
| `agentic-harness/src/main/main.js` | Manages Electron window lifecycle and environment sanitization (`ELECTRON_RUN_AS_NODE`). |
| `agentic-harness/src/tools/shellTool.js` | Enforces command allowlisting. Disabling checks exposes the user workstation to arbitrary code execution. |
| `frontend/vite.config.js` | Configures relative asset resolution (`base: './'`) required for Electron loading. |
| `package.json` (Root) | Controls the multi-package development and build pipeline. |

---

## 7. Git Collaboration & Quality Checks

Before committing and pushing code:

```bash
# 1. Verify frontend builds without errors or warnings
cd frontend
npm run build

# 2. Verify backend syntax
cd ../agentic-harness
node -c src/main/main.js
node -c src/main/ipcHandlers.js
node -c src/main/preload.js

# 3. Test running the application
cd ..
npm run dev
```

Use descriptive conventional commit messages:
- `feat: <description>` — For new features
- `fix: <description>` — For bug fixes
- `refactor: <description>` — For code reorganization without feature changes
- `docs: <description>` — For documentation updates

