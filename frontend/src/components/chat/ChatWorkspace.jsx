import React, { useState, useRef, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { ChatWelcome } from './ChatWelcome';
import { ChatMessage } from './ChatMessage';
import { PromptInput } from './PromptInput';

export function ChatWorkspace() {
  const { activeConversation, sendMessage, agentStatus } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const scrollContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const messages = activeConversation?.messages || [];
  const isEmpty = messages.length === 0;
  const lastMsg = messages[messages.length - 1];
  const lastContent = lastMsg?.content || '';
  const lastThinking = lastMsg?.thinking || '';
  const lastStepsCount = lastMsg?.executionSteps?.length || 0;

  const scrollToBottom = (behavior = 'auto') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (behavior === 'smooth') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    isAtBottomRef.current = true;
    setShowScrollToBottom(false);
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom <= 80;
    isAtBottomRef.current = atBottom;
    setShowScrollToBottom(!atBottom && messages.length > 0);
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom('auto');
    }
  }, [messages.length, lastContent, lastThinking, lastStepsCount, agentStatus]);

  // Reset to bottom when switching conversations
  useEffect(() => {
    isAtBottomRef.current = true;
    setShowScrollToBottom(false);
    scrollToBottom('auto');
  }, [activeConversation?.id]);

  const handleSubmit = (overrideText, attachments = {}) => {
    const text = typeof overrideText === 'string' ? overrideText : inputValue;
    const hasImages = Array.isArray(attachments?.images) && attachments.images.length > 0;
    const hasFiles = Array.isArray(attachments?.files) && attachments.files.length > 0;
    if (!text.trim() && !hasImages && !hasFiles) return;
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    isAtBottomRef.current = true;
    setShowScrollToBottom(false);
    sendMessage(text || 'Analyze the attached file(s).', attachments);
  };

  const handleSelectSuggestion = (prompt) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-workspace" id="chat-workspace-container" style={{ position: 'relative' }}>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="chat-workspace__messages"
        id="chat-message-list"
      >
        <div className="chat-workspace__column">
          {isEmpty ? (
            <ChatWelcome onSelectSuggestion={handleSelectSuggestion} />
          ) : (
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {showScrollToBottom && (
        <button
          type="button"
          className="chat-scroll-bottom-btn"
          onClick={() => scrollToBottom('smooth')}
          title="Jump to latest"
          aria-label="Jump to latest"
        >
          <ArrowDown size={15} />
        </button>
      )}

      <PromptInput
        inputRef={inputRef}
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
