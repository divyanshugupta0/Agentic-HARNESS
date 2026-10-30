# Agentic Harness — Frontend Architecture & Developer Guide

Welcome to the **Agentic Harness** frontend guide. This document serves as the single source of truth for all engineers contributing to the user interface of Agentic Harness. It details the component architecture, styling conventions, state management, and team collaboration protocols.

---

## 1. Project Directory Structure

```text
frontend/
├── public/
│   ├── assets/                 # Static imagery, fonts, and icons
│   └── logo.svg                # Brand vector logo
│
├── src/
│   ├── assets/                 # Bundled graphics and branding
│   │
│   ├── components/             # Reusable UI building blocks
│   │   ├── common/             # Generic atomic components
│   │   │   ├── Button.jsx      # Multi-variant button (primary, secondary, ghost, danger)
│   │   │   ├── IconButton.jsx  # Compact icon-only button with active/hover states
│   │   │   ├── Modal.jsx       # Accessible modal dialog with backdrop & escape key binding
│   │   │   └── Tooltip.jsx     # Floating hover tooltip
│   │   │
│   │   ├── layout/             # Application structural layout
│   │   │   ├── AppLayout.jsx   # Top-level shell arranging Sidebar and MainWorkspace
│   │   │   ├── Header.jsx      # Top navigation, model selector, tab triggers, agent status
│   │   │   ├── Sidebar.jsx     # Collapsible navigation, search, conversation history, user profile
│   │   │   └── MainWorkspace.jsx # Modular container switching active tab view
│   │   │
│   │   ├── chat/               # Conversational agent interface
│   │   │   ├── ChatWorkspace.jsx # Chat container orchestrating message list and composer
│   │   │   ├── ChatWelcome.jsx # Zero-state onboarding screen with starter missions
│   │   │   ├── ChatMessage.jsx # Message renderer with collapsible thinking & action traces
│   │   │   ├── PromptInput.jsx # Multi-line composer with tools popover & execution controls
│   │   │   └── AgentStatus.jsx # Real-time state indicator for agent engine
│   │   │
│   │   ├── files/              # Built-in workspace file manager
│   │   │   ├── FilesWorkspace.jsx # Two-pane container combining explorer and editor
│   │   │   ├── FileExplorer.jsx  # File tree hierarchy, file creation, recent files
│   │   │   ├── FileTabs.jsx    # Multi-tab opened files bar
│   │   │   └── FileEditor.jsx  # Functional editor with dynamic line numbers and save action
│   │   │
│   │   ├── marketplace/        # Agent and tools extension registry
│   │   │   ├── Marketplace.jsx # Category filter pills, search input, plugin grid
│   │   │   ├── PluginCard.jsx  # Card displaying plugin details, enable toggle, install CTA
│   │   │   └── PluginDetails.jsx # Configuration and permission inspection modal
│   │   │
│   │   └── auth/               # User authentication screens
│   │       ├── SignIn.jsx      # Email/password authentication form
│   │       ├── SignUp.jsx      # Profile registration form
│   │       └── AuthLayout.jsx  # Modal switcher between sign-in and sign-up
│   │
│   ├── pages/
│   │   └── Workspace.jsx       # Main single-page application entry view
│   │
│   ├── services/               # Decoupled business logic & external integration
│   │   ├── api.js              # IPC bridge to Electron main process with browser fallback
│   │   ├── authService.js      # Session management and mock user persistence
│   │   ├── chatService.js      # Conversation storage, message handling, and task execution
│   │   ├── fileService.js      # Virtual & local filesystem operations and tab management
│   │   └── pluginService.js    # Extensible tool and plugin registry
│   │
│   ├── context/                # Global React state providers
│   │   ├── AuthContext.jsx     # Current authenticated user and auth modal state
│   │   ├── ChatContext.jsx     # Active conversation, message flow, model, tools, and agent status
│   │   └── WorkspaceContext.jsx # Active tab, sidebar collapse state, and open files
│   │
│   ├── constants/              # Immutable configurations
│   │   ├── navigation.js       # Tab constants and history date groupings
│   │   ├── models.js           # Supported AI models (Claude 3.7, DeepSeek R1, GPT-4o, Ollama)
│   │   └── tools.js            # Built-in system tools (fsTool, shellTool, httpTool, webSearch)
│   │
│   ├── styles/                 # Modular CSS architecture
│   │   ├── variables.css       # Design tokens (colors, fonts, radii, transitions)
│   │   ├── global.css          # Universal resets, typography, and custom scrollbars
│   │   ├── layout.css          # AppLayout, Sidebar, Header, and MainWorkspace styles
│   │   ├── components.css      # Component-level styling for chat, files, marketplace, auth
│   │   └── responsive.css      # Breakpoints and mobile/tablet adaptations
│   │
│   ├── App.jsx                 # Provider hierarchy initialization
│   └── main.jsx                # React 18 DOM mount point
│
├── index.html                  # HTML5 template with Inter & JetBrains Mono web fonts
├── vite.config.js              # Vite configuration with relative base and path aliases
├── package.json                # Frontend dependencies and run scripts
└── FRONTEND_GUIDE.md           # This developer reference manual
```

---

## 2. Component Reference Documentation

| Component | File Path | Primary Responsibility | Key Props | State Variables | Dependencies | Interacts With |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `AppLayout` | `src/components/layout/AppLayout.jsx` | Mounts the root desktop split-pane layout | None | None | `Sidebar`, `MainWorkspace` | React Root |
| `Sidebar` | `src/components/layout/Sidebar.jsx` | Collapsible sidebar for missions, history & user profile | None | `isSearchModalOpen`, `isSettingsModalOpen` | `useWorkspace`, `useChat`, `useAuth` | `ChatWorkspace`, `AuthLayout` |
| `Header` | `src/components/layout/Header.jsx` | Top workspace navigation, model badge, and agent status | None | `isModelModalOpen` | `useWorkspace`, `useChat` | `MainWorkspace`, `ChatContext` |
| `MainWorkspace` | `src/components/layout/MainWorkspace.jsx` | Tab-switched view container | None | None | `useWorkspace` | `ChatWorkspace`, `FilesWorkspace`, `Marketplace` |
| `ChatWorkspace` | `src/components/chat/ChatWorkspace.jsx` | Primary agent conversation and mission runner | None | `inputValue` | `useChat`, `ChatMessage`, `PromptInput` | `chatService`, `api` |
| `ChatWelcome` | `src/components/chat/ChatWelcome.jsx` | Zero-state onboarding with clickable starter prompts | `onSelectSuggestion` | None | `STARTER_SUGGESTIONS` | `PromptInput` |
| `ChatMessage` | `src/components/chat/ChatMessage.jsx` | Formats user and assistant bubbles with thinking trace | `message` | `isThinkingOpen`, `isCopied` | Lucide icons | `ChatWorkspace` |
| `PromptInput` | `src/components/chat/PromptInput.jsx` | Multiline composer with tools selector and execution controls | `value`, `onChange`, `onSubmit`, `inputRef` | `isToolsPopoverOpen`, `attachmentName` | `useChat`, `BUILTIN_TOOLS` | `ChatWorkspace` |
| `FilesWorkspace` | `src/components/files/FilesWorkspace.jsx` | Coordinates file explorer sidebar, tabs, and editor | None | None | `FileExplorer`, `FileTabs`, `FileEditor` | `WorkspaceContext` |
| `FileExplorer` | `src/components/files/FileExplorer.jsx` | File tree, creation modal, and recently modified items | None | `isNewFileModalOpen`, `newFileName` | `useWorkspace`, `fileService` | `FileEditor`, `FileTabs` |
| `FileTabs` | `src/components/files/FileTabs.jsx` | Top horizontal bar for switching open file tabs | None | None | `useWorkspace` | `FileEditor` |
| `FileEditor` | `src/components/files/FileEditor.jsx` | In-browser code/text editor with line numbers and save | None | None | `useWorkspace`, `Save` | `fileService`, `api` |
| `Marketplace` | `src/components/marketplace/Marketplace.jsx` | Category-filtered plugin and agent tools catalog | None | `selectedCategory`, `searchQuery`, `activePluginForDetails` | `pluginService` | `PluginCard`, `PluginDetails` |
| `PluginCard` | `src/components/marketplace/PluginCard.jsx` | Presentation card for an individual tool/plugin | `plugin`, `onToggleInstall`, `onToggleEnabled`, `onOpenDetails` | None | Lucide icons | `Marketplace` |
| `PluginDetails`| `src/components/marketplace/PluginDetails.jsx` | Modal dialog for editing plugin parameters | `plugin`, `isOpen`, `onClose`, `onSaveConfig` | `config` | `Modal`, `Button` | `Marketplace` |
| `SignIn` | `src/components/auth/SignIn.jsx` | Authentication form with email, password & remember me | `onSwitchMode` | `email`, `password`, `showPassword`, `rememberMe`, `error`, `loading` | `useAuth` | `AuthLayout` |
| `SignUp` | `src/components/auth/SignUp.jsx` | Account creation form with name, email & password | `onSwitchMode` | `name`, `email`, `password`, `confirmPassword`, `showPassword`, `error`, `loading` | `useAuth` | `AuthLayout` |
| `AuthLayout` | `src/components/auth/AuthLayout.jsx` | Modal dialog wrapping SignIn or SignUp | None | None | `useAuth`, `Modal` | `MainWorkspace` |

---

## 3. CSS Class Naming Conventions (BEM)

All stylesheets adhere strictly to the **Block Element Modifier (BEM)** convention.

### Syntax Rules
- **Block**: `.block-name` — Represents a standalone entity (e.g., `.chat-workspace`, `.sidebar`, `.plugin-card`).
- **Element**: `.block-name__element-name` — Represents a sub-part belonging to a block (e.g., `.chat-workspace__messages`, `.sidebar__brand-text`).
- **Modifier**: `.block-name--modifier` or `.block-name__element--modifier` — Represents a variation or state (e.g., `.sidebar--collapsed`, `.btn--primary`, `.header__tab-btn--active`).

### Standardized Classes Table

```css
/* Sidebar */
.sidebar {}
.sidebar--collapsed {}
.sidebar__header {}
.sidebar__brand {}
.sidebar__brand-text {}
.sidebar__actions {}
.sidebar__new-chat-btn {}
.sidebar__search-btn {}
.sidebar__history {}
.sidebar__group {}
.sidebar__group-title {}
.sidebar__item {}
.sidebar__item--active {}
.sidebar__footer {}
.sidebar__profile {}

/* Header */
.header {}
.header__left {}
.header__tabs {}
.header__tab-btn {}
.header__tab-btn--active {}
.header__model-badge {}
.header__right {}

/* Chat Workspace */
.chat-workspace {}
.chat-workspace__messages {}
.chat-welcome {}
.chat-welcome__grid {}
.chat-welcome__card {}
.chat-message {}
.chat-message--user {}
.chat-message--assistant {}
.chat-message__thinking {}
.chat-message__execution {}
.prompt-composer {}
.prompt-composer__box {}
.prompt-composer__textarea {}
.prompt-composer__send-btn {}

/* Files Workspace */
.files-workspace {}
.files-workspace__sidebar {}
.files-workspace__tree {}
.files-workspace__tree-item {}
.files-workspace__tabs {}
.files-workspace__tab {}
.files-workspace__tab--active {}
.files-workspace__editor {}
.files-workspace__line-numbers {}
.files-workspace__textarea {}

/* Marketplace */
.marketplace {}
.marketplace__header {}
.marketplace__categories {}
.marketplace__category-btn {}
.marketplace__category-btn--active {}
.marketplace__grid {}
.plugin-card {}
.plugin-card__badge {}
```

---

## 4. HTML ID Reference Table

IDs are reserved for high-level landmark containers, accessible forms, and automated testing hooks. Avoid arbitrary inline IDs.

| HTML ID | Element Type | Purpose | File Location |
| :--- | :--- | :--- | :--- |
| `app-root` | `<div>` | React DOM injection target | `index.html` |
| `app-layout` | `<div>` | Top-level flex container for layout | `AppLayout.jsx` |
| `sidebar-container` | `<aside>` | Main sidebar navigation | `Sidebar.jsx` |
| `sidebar-new-chat-button`| `<button>` | Initiates a new agent conversation | `Sidebar.jsx` |
| `sidebar-search-button` | `<button>` | Opens conversation search modal | `Sidebar.jsx` |
| `sidebar-history-list` | `<div>` | Scrollable conversation history container | `Sidebar.jsx` |
| `sidebar-user-profile` | `<div>` | Bottom user profile section | `Sidebar.jsx` |
| `app-header` | `<header>` | Workspace top navigation header | `Header.jsx` |
| `sidebar-toggle-btn` | `<button>` | Toggles sidebar collapse/expand | `Header.jsx` |
| `header-model-selector`| `<button>` | Opens modal to switch active model | `Header.jsx` |
| `header-navigation-tabs`| `<nav>` | Tab triggers container (Chat, Files, Market) | `Header.jsx` |
| `tab-chat` | `<button>` | Switches active view to Chat | `Header.jsx` |
| `tab-files` | `<button>` | Switches active view to Files | `Header.jsx` |
| `tab-marketplace` | `<button>` | Switches active view to Marketplace | `Header.jsx` |
| `agent-status-indicator`| `<div>` | Visual pill displaying agent state | `Header.jsx` |
| `main-workspace` | `<main>` | Container for active tab content | `MainWorkspace.jsx` |
| `chat-workspace-container`| `<div>` | Container for chat history & prompt input | `ChatWorkspace.jsx` |
| `chat-welcome-screen` | `<div>` | Zero-state onboarding screen | `ChatWelcome.jsx` |
| `chat-message-list` | `<div>` | Scrollable message container | `ChatWorkspace.jsx` |
| `chat-prompt-composer`| `<div>` | Bottom prompt composer container | `PromptInput.jsx` |
| `chat-prompt-input` | `<textarea>` | Multiline prompt input field | `PromptInput.jsx` |
| `chat-send-button` | `<button>` | Submits the agent mission | `PromptInput.jsx` |
| `prompt-tools-selector-btn`| `<button>`| Toggles tools popover menu | `PromptInput.jsx` |
| `files-workspace-container`| `<div>` | Split-pane file manager container | `FilesWorkspace.jsx` |
| `files-explorer` | `<div>` | Left file hierarchy pane | `FileExplorer.jsx` |
| `files-create-button` | `<button>` | Opens new file creation modal | `FileExplorer.jsx` |
| `files-editor-tabs` | `<div>` | Open tabs horizontal bar | `FileTabs.jsx` |
| `files-editor` | `<div>` | Code editor with line numbers | `FileEditor.jsx` |
| `files-save-button` | `<button>` | Saves active file to disk / storage | `FileEditor.jsx` |
| `marketplace-container`| `<div>` | Marketplace catalog view container | `Marketplace.jsx` |
| `signin-form` | `<form>` | Authentication submission form | `SignIn.jsx` |
| `signup-form` | `<form>` | Account creation form | `SignUp.jsx` |
| `auth-modal` | `<div>` | Modal wrapping authentication screens | `AuthLayout.jsx` |

---

## 5. Team Development Guidelines

### Creating a New Component
1. Place the component in the appropriate subdirectory (`common/`, `layout/`, `chat/`, `files/`, `marketplace/`, or `auth/`).
2. Keep component files clean: isolate presentation from business logic by relying on services and context hooks.
3. Export named components: `export function MyComponent() {}`.
4. Document the props, state, and dependencies at the top of the file.

### Adding a New CSS Class
1. Follow BEM naming: `.block-name__element--modifier`.
2. Place global design tokens in `variables.css`.
3. Place structural layout rules in `layout.css`.
4. Place component styling in `components.css`.
5. Never use inline `!important`.

### Adding a New Tab
1. Open `src/constants/navigation.js` and add the new tab constant:
   ```javascript
   export const TABS = {
     CHAT: 'chat',
     FILES: 'files',
     MARKETPLACE: 'marketplace',
     MONITOR: 'monitor' // <-- New Tab
   };
   ```
2. Add the corresponding navigation button in `src/components/layout/Header.jsx`.
3. Render the tab view inside `src/components/layout/MainWorkspace.jsx`.

### Adding a New Tool or Plugin
1. Open `src/services/pluginService.js`.
2. Append a new plugin descriptor to `INITIAL_PLUGINS`:
   ```javascript
   {
     id: 'plugin-docker',
     name: 'Docker Container Agent',
     category: 'Developer Tools',
     description: 'Inspects and spins up local Docker containers.',
     icon: 'Terminal',
     version: '1.0.0',
     installed: false,
     enabled: false,
     author: 'DevOps Guild',
     config: { autoPrune: false }
   }
   ```
3. The Marketplace will automatically render the new card and support parameter customization.

### Connecting a Component to Electron IPC
Always use `src/services/api.js` rather than invoking `window.api` directly:
```javascript
import { api } from '../../services/api';

// To send a command:
await api.send('agent:custom-action', { payload });

// To listen to events:
const unsubscribe = api.on('agent:custom-event', (data) => {
  console.log(data);
});
```
This ensures seamless operation both inside the Electron desktop app and during standalone web development.

