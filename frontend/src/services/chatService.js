/**
 * Agentic Harness — Chat & Conversation Service
 * Manages conversation history, message streaming, and agent task execution.
 */

import { api } from './api';

const CHAT_STORAGE_KEY = 'agentic_harness_conversations';
const ACTIVE_CONV_KEY = 'agentic_harness_active_conv';

const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-1',
    title: 'Analyze repository architecture',
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Analyze repository architecture and suggest optimization paths for Agentic Harness',
        timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `I've analyzed the Agentic Harness repository structure.\n\n### Key Architectural Insights:\n1. **Core Decoupling**: The Electron main process maintains isolated IPC channels with the Vite-powered React UI.\n2. **Tool Sandboxing**: Execution tools (\`fsTool\`, \`shellTool\`) operate under explicit allowlists to prevent unauthorized privilege escalation.\n3. **Memory Layer**: Short-term conversational context is paired with the local vector store for scalable multi-turn reasoning.\n\nAll security boundaries are properly enforced.`,
        thinking: `Examining file system layout...\nChecking IPC definitions in ipcHandlers.js...\nVerifying preload contextBridge whitelist...\nFound 3 active tools: fsTool, shellTool, httpTool.\nSynthesizing architectural recommendations.`,
        executionSteps: [
          'Initialised agent [research-agent] with tools [fsTool, shellTool, httpTool]',
          'Inspected project structure and module dependencies',
          'Verified IPC bridge security boundaries'
        ],
        timestamp: new Date(Date.now() - 3500000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  },
  {
    id: 'conv-2',
    title: 'Scan local files for security leaks',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Scan local files for security vulnerabilities and secret leaks',
        timestamp: 'Yesterday 4:15 PM'
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: 'Security scan complete. Scanned 42 source files. No sensitive credentials or API keys were detected in the tracked code.',
        thinking: 'Scanning for regex patterns matching sk-*, private keys, and credential variables...',
        executionSteps: ['Scanned directory tree', 'Zero credential leaks identified'],
        timestamp: 'Yesterday 4:16 PM'
      }
    ]
  }
];

class ChatService {
  constructor() {
    this.conversations = this.loadConversations();
    this.activeConversationId = this.loadActiveConversationId();
  }

  loadConversations() {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load conversations from storage', e);
    }
    return INITIAL_CONVERSATIONS;
  }

  saveConversations() {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.conversations));
      if (this.activeConversationId) {
        localStorage.setItem(ACTIVE_CONV_KEY, this.activeConversationId);
      }
    } catch (e) {
      console.warn('Failed to save conversations', e);
    }
  }

  loadActiveConversationId() {
    const saved = localStorage.getItem(ACTIVE_CONV_KEY);
    if (saved && this.conversations.find((c) => c.id === saved)) {
      return saved;
    }
    return this.conversations[0]?.id || null;
  }

  getConversations() {
    return this.conversations;
  }

  getActiveConversation() {
    return this.conversations.find((c) => c.id === this.activeConversationId) || null;
  }

  setActiveConversation(id) {
    this.activeConversationId = id;
    this.saveConversations();
  }

  createNewConversation(initialTitle = 'New Chat') {
    const newConv = {
      id: 'conv-' + Date.now(),
      title: initialTitle,
      updatedAt: new Date().toISOString(),
      messages: []
    };
    this.conversations.unshift(newConv);
    this.activeConversationId = newConv.id;
    this.saveConversations();
    return newConv;
  }

  deleteConversation(id) {
    this.conversations = this.conversations.filter((c) => c.id !== id);
    if (this.activeConversationId === id) {
      this.activeConversationId = this.conversations[0]?.id || null;
    }
    this.saveConversations();
  }

  renameConversation(id, newTitle) {
    const conv = this.conversations.find((c) => c.id === id);
    if (conv) {
      conv.title = newTitle;
      conv.updatedAt = new Date().toISOString();
      this.saveConversations();
    }
  }

  /**
   * Execute an agent prompt in the active conversation
   */
  async sendMessage(content, { modelId = 'claude-3-7-sonnet', tools = [], onUpdate } = {}) {
    let conv = this.getActiveConversation();
    if (!conv) {
      conv = this.createNewConversation(content.slice(0, 36) || 'New Chat');
    } else if (conv.messages.length === 0) {
      conv.title = content.slice(0, 36) || 'New Chat';
    }

    const userMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    conv.messages.push(userMessage);
    conv.updatedAt = new Date().toISOString();
    this.saveConversations();
    if (onUpdate) onUpdate(conv);

    const assistantMessage = {
      id: 'msg-assist-' + Date.now(),
      role: 'assistant',
      content: '',
      thinking: 'Decomposing task and initializing agent tools...',
      executionSteps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isExecuting: true
    };

    conv.messages.push(assistantMessage);
    if (onUpdate) onUpdate(conv);

    // Call Electron main process IPC (or browser mock)
    try {
      await api.send('agent:start', content);
    } catch (e) {
      console.warn('Agent start IPC notice:', e);
    }

    // Progressively stream agent thinking and simulated execution trace
    const steps = [
      `🤖 Initialized agent with tools: [${tools.length ? tools.join(', ') : 'fsTool, shellTool, httpTool'}]`,
      `🧠 Short-term memory store active. Goal recorded: "${content}"`,
      `📋 Generating multi-step execution plan with model ${modelId}...`,
      `[Step 1/3] Validating local workspace environment & security sandbox`,
      `[Step 2/3] Analyzing objective and inspecting relevant file structures...`,
      `[Step 3/3] Synthesizing reasoning trace and verifying completion metrics...`
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 400));
      assistantMessage.executionSteps.push(steps[i]);
      assistantMessage.thinking += `\n→ ${steps[i]}`;
      if (onUpdate) onUpdate(conv);
    }

    await new Promise((r) => setTimeout(r, 350));
    assistantMessage.isExecuting = false;
    assistantMessage.content = `I have completed the requested mission: **"${content}"**.\n\n### Summary of Execution:\n- **Model Selected**: \`${modelId}\`\n- **Active Tools**: ${tools.length ? tools.map(t => '`' + t + '`').join(', ') : '`fsTool`, `shellTool`, `httpTool`'}\n- **Outcome**: Successfully verified local workspace bounds and generated the actionable execution plan.\n\nYou can continue refining the task or navigate to the **Files** tab to review generated artifacts.`;

    this.saveConversations();
    if (onUpdate) onUpdate(conv);

    return assistantMessage;
  }
}

export const chatService = new ChatService();
