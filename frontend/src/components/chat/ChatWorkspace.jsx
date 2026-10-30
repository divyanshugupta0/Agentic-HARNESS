import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { ChatWelcome } from './ChatWelcome';
import { ChatMessage } from './ChatMessage';
import { PromptInput } from './PromptInput';

export function ChatWorkspace() {
  const { activeConversation, sendMessage, agentStatus } = useChat();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const messages = activeConversation?.messages || [];
  const isEmpty = messages.length === 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentStatus]);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue('');
    sendMessage(text);
  };

  const handleSelectSuggestion = (prompt) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-workspace" id="chat-workspace-container">
      <div className="chat-workspace__messages" id="chat-message-list">
        {isEmpty ? (
          <ChatWelcome onSelectSuggestion={handleSelectSuggestion} />
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      <PromptInput
        inputRef={inputRef}
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
