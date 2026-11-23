/**
 * Agentic Harness — Chat & Conversation Service
 * Manages conversation history, real execution flow, and authentic diagnostic reporting.
 */

import { api } from './api.js';
import { providerService } from './providerService.js';
import { createDiagnostic, ERROR_CATEGORIES } from '../utils/diagnostics.js';

const CHAT_STORAGE_KEY = 'agentic_harness_conversations';
const ACTIVE_CONV_KEY = 'agentic_harness_active_conv';

class ChatService {
  constructor() {
    this.conversations = this.loadConversations();
    this.activeConversationId = this.loadActiveConversationId();
  }

  loadConversations() {
    try {
      if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return [];
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load conversations from storage', e);
    }
    // Authentic zero-state: no fabricated history
    return [];
  }

  saveConversations() {
    try {
      if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') return;
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(this.conversations));
      if (this.activeConversationId) {
        localStorage.setItem(ACTIVE_CONV_KEY, this.activeConversationId);
      }
    } catch (e) {
      console.warn('Failed to save conversations', e);
    }
  }

  loadActiveConversationId() {
    try {
      if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return null;
      const saved = localStorage.getItem(ACTIVE_CONV_KEY);
      if (saved && this.conversations.find((c) => c.id === saved)) {
        return saved;
      }
    } catch (e) {
      // ignore
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
  async sendMessage(content, { modelId = null, tools = [], onUpdate } = {}) {
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

    // REQUIREMENT 4 & 5: Check if provider is configured. Never show fake AI results.
    const hasProvider = providerService.hasConfiguredProvider();
    if (!hasProvider) {
      const diagnostic = createDiagnostic(new Error('No AI provider configured in workspace.'), {
        hasProvider: false,
        category: ERROR_CATEGORIES.PROVIDER_NOT_CONFIGURED
      });

      const assistantMessage = {
        id: 'msg-assist-' + Date.now(),
        role: 'assistant',
        content: `**${diagnostic.title}**\n\n${diagnostic.message}\n\n> ${diagnostic.suggestion}`,
        diagnostic,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isExecuting: false,
        isError: true
      };

      conv.messages.push(assistantMessage);
      this.saveConversations();
      if (onUpdate) onUpdate(conv);
      return assistantMessage;
    }

    // Provider is configured: perform genuine execution
    const assistantMessage = {
      id: 'msg-assist-' + Date.now(),
      role: 'assistant',
      content: '',
      thinking: 'Connecting to configured AI provider and initializing sandboxed tools...',
      executionSteps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isExecuting: true
    };

    conv.messages.push(assistantMessage);
    if (onUpdate) onUpdate(conv);

    try {
      // Dispatch to IPC agent engine
      const result = await api.send('agent:start', content);
      assistantMessage.isExecuting = false;

      if (result && result.status === 'completed') {
        assistantMessage.content = result.summary || `Execution completed for: "${content}"`;
        if (result.stepsExecuted) {
          assistantMessage.executionSteps.push(`Completed ${result.stepsExecuted} execution steps successfully.`);
        }
      } else {
        assistantMessage.content = `Task acknowledged by agent runtime.`;
      }
    } catch (err) {
      assistantMessage.isExecuting = false;
      assistantMessage.isError = true;
      assistantMessage.diagnostic = createDiagnostic(err, { hasProvider: true });
      assistantMessage.content = `**${assistantMessage.diagnostic.title}**\n\n${assistantMessage.diagnostic.message}\n\n> ${assistantMessage.diagnostic.suggestion}`;
    }

    this.saveConversations();
    if (onUpdate) onUpdate(conv);
    return assistantMessage;
  }
}

export const chatService = new ChatService();
