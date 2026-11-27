import React, { createContext, useContext, useState, useEffect } from 'react';
import { chatService } from '../services/chatService';
import { api } from '../services/api';
import { providerService } from '../services/providerService';

const ACTIVE_TOOLS_STORAGE_KEY = 'agentic_harness_active_tools';
const DEFAULT_ACTIVE_TOOLS = ['projectTool', 'fsTool', 'shellTool', 'httpTool', 'robot', 'windowsOperator'];

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState(() => chatService.getConversations());
  const [activeConversationId, setActiveConversationId] = useState(() => chatService.getActiveConversation()?.id || null);
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = providerService.getActiveTarget();
    if (saved?.model?.id) return saved.model.id;
    const models = providerService.getAvailableModels();
    return models[0]?.id || null;
  });
  const [activeTools, setActiveTools] = useState(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_TOOLS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return DEFAULT_ACTIVE_TOOLS;
  });
  const [agentStatus, setAgentStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'stopped'
  const [searchQuery, setSearchQuery] = useState('');

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Keep selected model synchronized with configured providers
  useEffect(() => {
    return providerService.subscribe(() => {
      const models = providerService.getAvailableModels();
      const saved = providerService.getActiveTarget();
      setSelectedModel((current) => {
        if (!models.length) return null;
        if (saved?.model?.id && models.some((m) => m.id === saved.model.id)) {
          return saved.model.id;
        }
        if (models.some((m) => m.id === current)) return current;
        return models[0].id;
      });
    });
  }, []);

  // Listen for agent events
  useEffect(() => {
    const unsubLog = api.on('agent:log', (msg) => {
      console.log('[Agent Log]', msg);
    });
    const unsubResult = api.on('agent:result', () => {
      setAgentStatus('idle');
    });
    const unsubPipStop = api.on('pip:stop-agent', () => {
      chatService.abortActiveRun();
      setAgentStatus('stopped');
      api.send('agent:stop').catch(() => {});
    });

    return () => {
      if (typeof unsubLog === 'function') unsubLog();
      if (typeof unsubResult === 'function') unsubResult();
      if (typeof unsubPipStop === 'function') unsubPipStop();
    };
  }, []);

  // Sync live running chat state to Electron PiP window
  const lastAssistantMsg = [...(activeConversation?.messages || [])]
    .reverse()
    .find((m) => m.role === 'assistant');
  const lastBlock = lastAssistantMsg?.blocks?.[lastAssistantMsg.blocks.length - 1];

  useEffect(() => {
    const running = agentStatus === 'running';
    let statusText = running ? 'Running...' : 'Completed';
    if (running && lastBlock?.type === 'thinking') statusText = 'Thinking...';
    else if (running && lastBlock?.type === 'tool') statusText = lastBlock.label;
    else if (running && lastBlock?.type === 'text') statusText = 'Streaming response...';

    const previewText =
      (lastAssistantMsg?.content || '').slice(-400) ||
      (lastAssistantMsg?.thinking || '').slice(-300) ||
      (running ? 'Starting agent loop...' : '');

    api.send('pip:update', {
      running,
      model: selectedModel || 'Agentic Harness',
      statusText,
      previewText
    }).catch(() => {});
  }, [agentStatus, selectedModel, lastAssistantMsg?.content, lastAssistantMsg?.thinking, lastBlock?.label]);

  const selectConversation = (id) => {
    chatService.setActiveConversation(id);
    setActiveConversationId(id);
  };

  const createNewChat = (title = 'New Chat') => {
    const newConv = chatService.createNewConversation(title);
    setConversations([...chatService.getConversations()]);
    setActiveConversationId(newConv.id);
    return newConv;
  };

  const deleteConversation = (id) => {
    chatService.deleteConversation(id);
    setConversations([...chatService.getConversations()]);
    setActiveConversationId(chatService.getActiveConversation()?.id || null);
  };

  const renameConversation = (id, newTitle) => {
    chatService.renameConversation(id, newTitle);
    setConversations([...chatService.getConversations()]);
  };

  const toggleTool = (toolId) => {
    setActiveTools((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      try {
        localStorage.setItem(ACTIVE_TOOLS_STORAGE_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const sendMessage = async (content, attachments = {}) => {
    const hasImages = Array.isArray(attachments?.images) && attachments.images.length > 0;
    const hasFiles = Array.isArray(attachments?.files) && attachments.files.length > 0;
    if ((!content.trim() && !hasImages && !hasFiles) || agentStatus === 'running') return;

    setAgentStatus('running');
    try {
      await chatService.sendMessage(content, {
        modelId: selectedModel,
        tools: activeTools,
        images: attachments?.images || [],
        files: attachments?.files || [],
        onUpdate: () => {
          setConversations([...chatService.getConversations()]);
          setActiveConversationId(chatService.getActiveConversation()?.id || null);
        }
      });
    } catch (err) {
      console.error('Error in agent execution:', err);
    } finally {
      setAgentStatus('idle');
      setConversations([...chatService.getConversations()]);
      setActiveConversationId(chatService.getActiveConversation()?.id || null);
    }
  };

  const stopAgent = async () => {
    chatService.abortActiveRun();
    setAgentStatus('stopped');
    await api.send('agent:stop').catch(() => {});
  };

  const pauseAgent = async () => {
    setAgentStatus('paused');
    await api.send('agent:pause');
  };

  const resumeAgent = async () => {
    setAgentStatus('running');
    await api.send('agent:resume');
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        selectedModel,
        setSelectedModel,
        activeTools,
        toggleTool,
        agentStatus,
        sendMessage,
        stopAgent,
        pauseAgent,
        resumeAgent,
        createNewChat,
        selectConversation,
        deleteConversation,
        renameConversation,
        searchQuery,
        setSearchQuery
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

