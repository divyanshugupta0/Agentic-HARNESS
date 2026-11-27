/**
 * Agentic Harness — Chat & Conversation Service
 * Manages conversation history, real execution flow, and authentic diagnostic reporting.
 */

import { api } from './api.js';
import { providerService } from './providerService.js';
import { fileService } from './fileService.js';
import { createDiagnostic, ERROR_CATEGORIES } from '../utils/diagnostics.js';
import { buildToolSystemPrompt, parseToolCalls, stripToolCallBlocks } from '../utils/toolLoop.js';

const API_BASE_URL = (import.meta?.env?.VITE_AUTH_API_URL || 'http://localhost:3002').replace(/\/$/, '');
const CHAT_STORAGE_KEY = 'agentic_harness_conversations';
const ACTIVE_CONV_KEY = 'agentic_harness_active_conv';

class ChatService {
  constructor() {
    this.conversations = this.loadConversations();
    this.activeConversationId = this.loadActiveConversationId();
    this.activeAbortController = null;
    this.activeTarget = providerService.getActiveTarget();
    providerService.subscribe(() => {
      this.activeTarget = providerService.getActiveTarget();
    });
  }

  abortActiveRun() {
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch (_) {}
      this.activeAbortController = null;
    }
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
    } catch (_) {}
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

  async sendMessage(content, { modelId = null, tools = [], images = [], files = [], onUpdate } = {}) {
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
      attachments: [
        ...(images || []).map((img) => ({ kind: 'image', name: img.name, size: img.size, dataUrl: img.dataUrl })),
        ...(files || []).map((f) => ({ kind: 'file', name: f.name, size: f.size }))
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    conv.messages.push(userMessage);
    conv.updatedAt = new Date().toISOString();
    this.saveConversations();
    if (onUpdate) onUpdate(conv);

    const target =
      this.activeTarget && (!modelId || this.activeTarget.model?.id === modelId)
        ? this.activeTarget
        : providerService.getActiveTarget(modelId);

    if (!target || !target.provider || !target.model) {
      const hasProvider = providerService.hasConfiguredProvider();
      const diagnostic = createDiagnostic(
        new Error(
          hasProvider
            ? modelId
              ? `No configured provider owns model "${modelId}".`
              : 'No model or provider configured.'
            : 'No AI provider configured in workspace.'
        ),
        {
          hasProvider,
          category: hasProvider
            ? ERROR_CATEGORIES.MISSING_CONFIGURATION
            : ERROR_CATEGORIES.PROVIDER_NOT_CONFIGURED
        }
      );

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

    const assistantMessage = {
      id: 'msg-assist-' + Date.now(),
      role: 'assistant',
      content: '',
      thinking: '',
      blocks: [],
      executionSteps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isExecuting: true
    };

    conv.messages.push(assistantMessage);
    if (onUpdate) onUpdate(conv);

    this.abortActiveRun();
    const abortController = new AbortController();
    this.activeAbortController = abortController;

    try {
      const activeProject = fileService.getProjectRoot();
      if (activeProject?.path) {
        await api.send('project:set-cwd', { path: activeProject.path }).catch(() => {});
      }

      const baseHistory = conv.messages
        .filter((m) => !m.isExecuting && !m.isError && m.content)
        .slice(-16)
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));

      const loopMessages = [
        { role: 'system', content: buildToolSystemPrompt(tools, activeProject) },
        ...baseHistory
      ];

      const maxToolTurns = 10;
      let pendingTurnImages = [];

      for (let turn = 0; turn < maxToolTurns; turn++) {
        if (abortController.signal.aborted) break;

        const turnImages = turn === 0 ? images : pendingTurnImages;
        pendingTurnImages = [];

        const isFinalSynthesisTurn = turn === maxToolTurns - 1;
        if (isFinalSynthesisTurn) {
          loopMessages.push({
            role: 'user',
            content: 'Provide your final answer to the user now based on the tool results above. Do not emit any more tool_call blocks.'
          });
        }
        const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            provider: {
              type: target.provider.type,
              baseURL: target.provider.baseURL,
              apiKey: target.apiKey
            },
            model: target.model.id,
            messages: loopMessages,
            images: turnImages,
            files: turn === 0 ? files : []
          })
        });

        if (!response.ok) {
          const errPayload = await response.json().catch(() => ({}));
          throw new Error(errPayload.error || `Model request failed with HTTP ${response.status}`);
        }

        let turnRawText = '';
        let turnThinkingText = '';
        let turnThinkingBlock = null;
        let turnTextBlock = null;

        const ensureThinkingBlock = () => {
          if (!turnThinkingBlock) {
            turnThinkingBlock = { type: 'thinking', text: '' };
            assistantMessage.blocks.push(turnThinkingBlock);
          }
          return turnThinkingBlock;
        };

        const ensureTextBlock = () => {
          if (!turnTextBlock) {
            turnTextBlock = { type: 'text', text: '' };
            assistantMessage.blocks.push(turnTextBlock);
          }
          return turnTextBlock;
        };

        if (response.body && typeof response.body.getReader === 'function') {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const syncTurnOutput = (text) => {
            const openIdx = text.indexOf('<think>');
            let visible = text;
            if (openIdx !== -1) {
              const closeIdx = text.indexOf('</think>', openIdx + 7);
              if (closeIdx === -1) {
                const t = stripToolCallBlocks(text.slice(openIdx + 7));
                if (t) ensureThinkingBlock().text = t;
                visible = text.slice(0, openIdx);
              } else {
                const t = stripToolCallBlocks(text.slice(openIdx + 7, closeIdx));
                if (t) ensureThinkingBlock().text = t;
                visible = (text.slice(0, openIdx) + text.slice(closeIdx + 8)).trimStart();
              }
            }
            const cleanVisible = stripToolCallBlocks(visible);
            if (cleanVisible) {
              ensureTextBlock().text = cleanVisible;
            }
            assistantMessage.content = assistantMessage.blocks
              .filter((b) => b.type === 'text')
              .map((b) => b.text)
              .join('\n\n');
            assistantMessage.thinking = assistantMessage.blocks
              .filter((b) => b.type === 'thinking')
              .map((b) => b.text)
              .join('\n\n');
          };

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line.startsWith('data:')) continue;
              const jsonStr = line.slice(5).trim();
              if (!jsonStr) continue;

              const evt = JSON.parse(jsonStr);
              if (evt.error) throw new Error(evt.error);
              if (evt.thinkingDelta) {
                turnThinkingText += evt.thinkingDelta;
                const cleanThink = stripToolCallBlocks(turnThinkingText);
                if (cleanThink) {
                  ensureThinkingBlock().text = cleanThink;
                  assistantMessage.thinking = assistantMessage.blocks
                    .filter((b) => b.type === 'thinking')
                    .map((b) => b.text)
                    .join('\n\n');
                }
                if (onUpdate) onUpdate(conv);
              }
              if (evt.delta) {
                turnRawText += evt.delta;
                syncTurnOutput(turnRawText);
                if (onUpdate) onUpdate(conv);
              }
            }
          }
        } else {
          const result = await response.json().catch(() => ({}));
          if (!result.success) throw new Error(result.error || 'Model request failed');
          turnRawText = result.content || '';
          const clean = stripToolCallBlocks(turnRawText);
          if (clean) {
            ensureTextBlock().text = clean;
            assistantMessage.content = assistantMessage.blocks
              .filter((b) => b.type === 'text')
              .map((b) => b.text)
              .join('\n\n');
          }
        }

        const rawCalls = parseToolCalls(turnRawText);
        const toolCalls = rawCalls.length > 0 ? rawCalls : parseToolCalls(turnThinkingText);
        if (toolCalls.length === 0) {
          if (!assistantMessage.content && !isFinalSynthesisTurn) {
            if (turnImages.length > 0 && !turnRawText && !turnThinkingText) {
              loopMessages.push({
                role: 'user',
                content: 'Note: your model did not return output for the screenshot image. Use ghost.inspectElements() or keyboard shortcuts (pressHotkey, type, keyTap) instead of relying on screenshots, and continue completing the user task.'
              });
              continue;
            }
            if (turnThinkingText) {
              loopMessages.push({
                role: 'user',
                content: 'Output ONLY your ```tool_call JSON block or your concise final answer now.'
              });
              continue;
            }
          }
          break;
        }

        const UI_SEQUENTIAL_TOOLS = new Set(['robot', 'windowsOperator', 'ghost', 'playwright', 'browserUse', 'stagehand']);
        const hasSequentialUi = toolCalls.some((c) => UI_SEQUENTIAL_TOOLS.has(c.tool));
        const toolResultSummaries = [];
        let mutatedFiles = false;

        const runSingleTool = async (toolCall) => {
          if (toolCall.tool === 'projectTool') {
            const suggestedPath = typeof toolCall.params?.[0] === 'string' ? toolCall.params[0] : '';
            const reason = typeof toolCall.params?.[1] === 'string' ? toolCall.params[1] : '';
            assistantMessage.actionRequest = {
              type: 'open-project',
              path: suggestedPath,
              reason
            };
            const stepLabel = `projectTool.askOpenProject${suggestedPath ? `("${suggestedPath}")` : ''} → prompt shown`;
            assistantMessage.blocks.push({ type: 'tool', label: stepLabel, status: 'ok' });
            assistantMessage.executionSteps.push(stepLabel);
            if (onUpdate) onUpdate(conv);
            return '[Tool Result for projectTool.askOpenProject]\nDisplayed an "Open Project" button below your message.';
          }

          const toolBlock = {
            type: 'tool',
            label: `${toolCall.tool}.${toolCall.action}(${JSON.stringify(toolCall.params).slice(1, -1)})`,
            status: 'running'
          };
          assistantMessage.blocks.push(toolBlock);
          assistantMessage.executionSteps.push(toolBlock.label);
          if (onUpdate) onUpdate(conv);

          const toolRes = await api.send('tool:execute', toolCall).catch((e) => ({
            success: false,
            error: e.message
          }));

          const rawResult = toolRes?.result ?? toolRes;
          if (toolRes?.success && rawResult && typeof rawResult === 'object') {
            const b64 = rawResult.base64 || rawResult.imageBase64 || rawResult.screenshot;
            if (typeof b64 === 'string' && b64.length > 100) {
              const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;
              pendingTurnImages.push({
                mimeType: rawResult.mimeType || 'image/png',
                data: cleanB64
              });
            }
          }

          const sanitizedPayload = toolRes?.success
            ? JSON.stringify(rawResult, (key, val) => {
                if (
                  typeof val === 'string' &&
                  val.length > 500 &&
                  (['base64', 'imageBase64', 'screenshot', 'dataUrl', 'audioBase64'].includes(key) ||
                    val.startsWith('data:image/'))
                ) {
                  return `[omitted ${key} (${val.length} chars)]`;
                }
                return val;
              })
            : `Error: ${toolRes?.error || 'Tool execution failed'}`;
          const resultSummary = sanitizedPayload.length > 6000
            ? `${sanitizedPayload.slice(0, 4500)}\n...[truncated]...\n${sanitizedPayload.slice(-1000)}`
            : sanitizedPayload;

          toolBlock.status = toolRes?.success ? 'ok' : 'failed';
          toolBlock.label = `${toolCall.tool}.${toolCall.action} → ${toolRes?.success ? 'ok' : 'failed'}`;
          assistantMessage.executionSteps[assistantMessage.executionSteps.length - 1] = toolBlock.label;
          if (onUpdate) onUpdate(conv);

          if (
            toolRes?.success &&
            toolCall.tool === 'fsTool' &&
            ['writeFile', 'appendFile', 'deleteFile', 'createDirectory'].includes(toolCall.action)
          ) {
            mutatedFiles = true;
          }

          return `[Tool Result for ${toolCall.tool}.${toolCall.action}]\n${resultSummary}`;
        };

        if (hasSequentialUi || toolCalls.length === 1) {
          for (const tc of toolCalls) {
            if (abortController.signal.aborted) break;
            toolResultSummaries.push(await runSingleTool(tc));
          }
        } else {
          const results = await Promise.all(toolCalls.map((tc) => runSingleTool(tc)));
          toolResultSummaries.push(...results);
        }

        if (mutatedFiles && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('workspace:refresh-project'));
        }

        const cleanTurnAssistant = turnRawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() || '(tool_call)';
        loopMessages.push({ role: 'assistant', content: cleanTurnAssistant });
        loopMessages.push({
          role: 'user',
          content: toolResultSummaries.join('\n\n')
        });
      }

      this.activeAbortController = null;
      assistantMessage.isExecuting = false;
      if (!assistantMessage.content) {
        const fallback =
          assistantMessage.executionSteps.length > 0
            ? `Completed:\n${assistantMessage.executionSteps.map((s) => `- ${s}`).join('\n')}`
            : '(No response returned by model)';
        assistantMessage.content = fallback;
        assistantMessage.blocks.push({ type: 'text', text: fallback });
      }
    } catch (err) {
      this.activeAbortController = null;
      assistantMessage.isExecuting = false;
      if (err?.name === 'AbortError') {
        if (!assistantMessage.content) {
          const stoppedMsg = '*Generation stopped by user.*';
          assistantMessage.content = stoppedMsg;
          assistantMessage.blocks.push({ type: 'text', text: stoppedMsg });
        }
      } else {
        assistantMessage.isError = true;
        assistantMessage.diagnostic = createDiagnostic(err, { hasProvider: true });
        assistantMessage.content = `**${assistantMessage.diagnostic.title}**\n\n${assistantMessage.diagnostic.message}\n\n> ${assistantMessage.diagnostic.suggestion}`;
        assistantMessage.blocks.push({ type: 'text', text: assistantMessage.content });
      }
    }

    this.saveConversations();
    if (onUpdate) onUpdate(conv);
    return assistantMessage;
  }
}

export const chatService = new ChatService();
