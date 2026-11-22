import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronRight, Check, Copy, Terminal, Sparkles } from 'lucide-react';

export function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div
      className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--assistant'}`}
    >
      <div className="chat-message__avatar" aria-hidden="true">
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className="chat-message__content">
        {/* Thinking / Reasoning Collapse (DeepSeek / Claude style) */}
        {!isUser && message.thinking && (
          <div className="chat-message__thinking">
            <button
              type="button"
              className="chat-message__thinking-header"
              onClick={() => setIsThinkingOpen(!isThinkingOpen)}
            >
              <div className="chat-message__thinking-header-left">
                {isThinkingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Sparkles size={13} style={{ color: 'var(--accent-indigo)' }} />
                <span>Agent Reasoning & Plan</span>
              </div>
              <span className="chat-message__thinking-badge">Thought Process</span>
            </button>
            {isThinkingOpen && (
              <div className="chat-message__thinking-body">
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.thinking}</pre>
              </div>
            )}
          </div>
        )}

        {/* Action Logs & Execution Trace */}
        {!isUser && message.executionSteps && message.executionSteps.length > 0 && (
          <div className="chat-message__execution">
            <div className="chat-message__execution-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={12} style={{ color: 'var(--accent-indigo)' }} />
                Action Execution Trace
              </span>
              <span className="chat-message__execution-count">
                {message.executionSteps.length} {message.executionSteps.length === 1 ? 'Step' : 'Steps'}
              </span>
            </div>
            <div className="chat-message__execution-list">
              {message.executionSteps.map((step, idx) => (
                <div key={idx} className="chat-message__execution-item">
                  <span className="chat-message__execution-bullet">›</span>
                  <span className="chat-message__execution-text">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Message Bubble */}
        <div className="chat-message__bubble">
          {message.content}
        </div>

        {/* Footer Actions (Timestamp & Copy) */}
        <div className="chat-message__footer">
          <span className="chat-message__timestamp">{message.timestamp}</span>
          {!isUser && message.content && (
            <button
              type="button"
              onClick={handleCopy}
              className="chat-message__copy-btn"
              title="Copy response to clipboard"
            >
              {isCopied ? (
                <>
                  <Check size={12} style={{ color: 'var(--status-success)' }} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
