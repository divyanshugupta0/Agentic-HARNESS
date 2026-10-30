import { useChat as useChatContext } from '../context/ChatContext';

/**
 * Custom hook to access chat conversation state, active model, tools, and execution controls
 * @returns {{
 *   conversations: Array,
 *   activeConversation: Object,
 *   activeConversationId: string,
 *   selectedModel: string,
 *   setSelectedModel: Function,
 *   activeTools: Array,
 *   toggleTool: Function,
 *   agentStatus: string,
 *   sendMessage: Function,
 *   stopAgent: Function,
 *   pauseAgent: Function,
 *   resumeAgent: Function,
 *   createNewChat: Function,
 *   selectConversation: Function,
 *   deleteConversation: Function,
 *   renameConversation: Function,
 *   searchQuery: string,
 *   setSearchQuery: Function
 * }}
 */
export function useChat() {
  return useChatContext();
}
