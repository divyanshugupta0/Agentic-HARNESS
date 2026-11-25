import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronRight, Check, Copy, Terminal } from 'lucide-react';

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
      <div className="chat-message__avatar">
        {isUser ? <User size={16} /> : <Bot size={16} />}
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
              {isThinkingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Agent Reasoning & Plan</span>
            </button>
            {isThinkingOpen && (
              <div className="chat-message__thinking-body">
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.thinking}</pre>
              </div>
            )}
          </div>
        )}

        {/* Execution Steps Trace */}
        {!isUser && message.executionSteps && message.executionSteps.length > 0 && (
          <div className="chat-message__execution">
            <div className="chat-message__execution-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={12} color="var(--accent-cyan)" />
                Action Execution Trace
              </span>
              <span>{message.executionSteps.length} Steps</span>
            </div>
            <div className="chat-message__execution-list">
              {message.executionSteps.map((step, idx) => (
                <div key={idx} className="chat-message__execution-item">
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Primary Message Bubble */}
        <div className="chat-message__bubble">
          {message.content}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            padding: '2px 4px'
          }}
        >
          <span>{message.timestamp}</span>
          {!isUser && message.content && (
            <button
              type="button"
              onClick={handleCopy}
              className="btn-icon"
              style={{ width: '20px', height: '20px' }}
              title="Copy message"
            >
              {isCopied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

