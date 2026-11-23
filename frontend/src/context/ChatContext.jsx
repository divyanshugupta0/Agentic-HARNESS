import React, { createContext, useContext, useState, useEffect } from 'react';
import { chatService } from '../services/chatService';
import { api } from './../services/api';
import { providerService } from '../services/providerService';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState(() => chatService.getConversations());
  const [activeConversationId, setActiveConversationId] = useState(() => chatService.getActiveConversation()?.id || null);
  const [selectedModel, setSelectedModel] = useState(() => {
    const models = providerService.getAvailableModels();
    return models[0]?.id || null;
  });
  const [activeTools, setActiveTools] = useState(['fsTool', 'shellTool', 'httpTool']);
  const [agentStatus, setAgentStatus] = useState('idle'); // 'idle' | 'running' | 'paused' | 'stopped'
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState('appearance');

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Keep selected model synchronized with configured providers
  useEffect(() => {
    const unsub = providerService.subscribe(() => {
      const models = providerService.getAvailableModels();
      setSelectedModel((current) => {
        if (!models.length) return null;
        if (models.some((m) => m.id === current)) return current;
        return models[0].id;
      });
    });
    return unsub;
  }, []);

  // Listen for real agent events
  useEffect(() => {
    const unsubLog = api.on('agent:log', (msg) => {
      console.log('[Agent Log]', msg);
    });
    const unsubResult = api.on('agent:result', () => {
      setAgentStatus('idle');
    });

    return () => {
      if (typeof unsubLog === 'function') unsubLog();
      if (typeof unsubResult === 'function') unsubResult();
    };
  }, []);

  const selectConversation = (id) => {
    chatService.setActiveConversation(id);
    setActiveConversationId(id);
  };

  const createNewChat = (title = 'New Mission') => {
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
    setActiveTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const openSettings = (category = 'general') => {
    setSettingsCategory(category);
    setSettingsModalOpen(true);
  };

  const closeSettings = () => {
    setSettingsModalOpen(false);
  };

  const sendMessage = async (content) => {
    if (!content.trim() || agentStatus === 'running') return;

    setAgentStatus('running');
    try {
      await chatService.sendMessage(content, {
        modelId: selectedModel,
        tools: activeTools,
        onUpdate: () => {
          setConversations([...chatService.getConversations()]);
        }
      });
    } catch (err) {
      console.error('Error in agent execution:', err);
    } finally {
      setAgentStatus('idle');
      setConversations([...chatService.getConversations()]);
    }
  };

  const stopAgent = async () => {
    setAgentStatus('stopped');
    await api.send('agent:stop');
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
        selectConversation,
        createNewChat,
        deleteConversation,
        renameConversation,
        selectedModel,
        setSelectedModel,
        activeTools,
        toggleTool,
        agentStatus,
        sendMessage,
        stopAgent,
        pauseAgent,
        resumeAgent,
        searchQuery,
        setSearchQuery,
        settingsModalOpen,
        settingsCategory,
        openSettings,
        closeSettings
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
