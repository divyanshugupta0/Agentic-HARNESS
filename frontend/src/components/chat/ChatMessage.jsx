import React, { useState } from 'react';
import {
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  Terminal,
  Sparkles,
  AlertCircle,
  Key,
  RefreshCw
} from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { Button } from '../common/Button';

export function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const { openSettings } = useChat();
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDiagnosticAction = () => {
    if (message.diagnostic?.actionKey === 'open-providers-settings' || !message.diagnostic?.actionKey) {
      openSettings('providers');
    }
  };

  return (
    <div
      className={`chat-message ${isUser ? 'chat-message--user' : 'chat-message--assistant'} ${message.isError ? 'chat-message--error' : ''}`}
    >
      <div className="chat-message__avatar" aria-hidden="true">
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className="chat-message__content">
        {/* Diagnostic Banner if Message is Error / Diagnostic */}
        {message.isError && message.diagnostic && (
          <div className="diagnostic-card">
            <div className="diagnostic-card__header">
              <div className="diagnostic-card__title-row">
                <AlertCircle size={16} style={{ color: 'var(--status-error)', flexShrink: 0 }} />
                <span className="diagnostic-card__title">{message.diagnostic.title}</span>
              </div>
              {message.diagnostic.actionLabel && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Key}
                  onClick={handleDiagnosticAction}
                >
                  {message.diagnostic.actionLabel}
                </Button>
              )}
            </div>

            <p className="diagnostic-card__desc">{message.diagnostic.message}</p>
            {message.diagnostic.suggestion && (
              <p className="diagnostic-card__suggestion">{message.diagnostic.suggestion}</p>
            )}

            {message.diagnostic.technicalDetails && (
              <div className="diagnostic-card__details">
                <button
                  type="button"
                  className="diagnostic-card__details-toggle"
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                >
                  {isDetailsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span>Technical details</span>
                </button>
                {isDetailsOpen && (
                  <pre className="diagnostic-card__details-body">
                    {message.diagnostic.technicalDetails}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Thinking / Reasoning Collapse (DeepSeek / Claude style) */}
        {!isUser && !message.isError && message.thinking && (
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
        {!isUser && !message.isError && message.executionSteps && message.executionSteps.length > 0 && (
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

        {/* Primary Message Bubble (only shown if not duplicate of diagnostic) */}
        {(!message.isError || !message.diagnostic) && (
          <div className="chat-message__bubble">
            {message.content}
          </div>
        )}

        {/* Footer Actions (Timestamp & Copy) */}
        <div className="chat-message__footer">
          <span className="chat-message__timestamp">{message.timestamp}</span>
          {!isUser && message.content && !message.isError && (
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
