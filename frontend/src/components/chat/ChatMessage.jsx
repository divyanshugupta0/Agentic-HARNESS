import React, { useState } from 'react';
import {
  Sparkles,
  User,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  Terminal,
  Brain,
  AlertTriangle,
  FolderOpen,
  FileText
} from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import { useWorkspace } from '../../hooks/useWorkspace';

function ThinkingBadge({ text, isStreaming }) {
  const [isOpen, setIsOpen] = useState(false);
  const expanded = isOpen || isStreaming;

  return (
    <div className="chat-message__thinking-group">
      <button
        type="button"
        className={`chat-message__pill${expanded ? ' chat-message__pill--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Brain size={12} />
        <span>{isStreaming ? 'Thinking...' : 'Thought process'}</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {expanded && (
        <div className="chat-message__thinking-body">
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{text}</pre>
        </div>
      )}
    </div>
  );
}

/**
 * Modern Agentic Harness Message Component
 * Renders chronological thought badges, tool execution chips, and Markdown text blocks.
 */
export function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const { openProjectFolder } = useWorkspace();
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isOpeningProject, setIsOpeningProject] = useState(false);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard?.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1800);
    }
  };

  if (isUser) {
    const hasAttachments = Array.isArray(message.attachments) && message.attachments.length > 0;
    return (
      <div className="chat-message chat-message--user">
        <div className="chat-message__content">
          {hasAttachments && (
            <div className="chat-message__user-attachments">
              {message.attachments.map((att, idx) =>
                att.kind === 'image' && att.dataUrl ? (
                  <img
                    key={idx}
                    src={att.dataUrl}
                    alt={att.name}
                    className="chat-message__user-image"
                  />
                ) : (
                  <div key={idx} className="chat-message__user-file-chip">
                    <FileText size={13} />
                    <span>{att.name}</span>
                  </div>
                )
              )}
            </div>
          )}
          <div className="chat-message__bubble">{message.content}</div>
          <div className="chat-message__meta">
            <span>{message.timestamp}</span>
          </div>
        </div>
        <div className="chat-message__avatar">
          <User size={15} />
        </div>
      </div>
    );
  }

  const hasBlocks = Array.isArray(message.blocks) && message.blocks.length > 0;
  const hasSteps = Array.isArray(message.executionSteps) && message.executionSteps.length > 0;

  return (
    <div className="chat-message chat-message--assistant">
      <div className={`chat-message__avatar${message.isExecuting ? ' chat-message__avatar--active' : ''}`}>
        {message.isError ? <AlertTriangle size={15} /> : <Sparkles size={15} />}
      </div>

      <div className="chat-message__content">
        {hasBlocks ? (
          <div className="chat-message__timeline">
            {message.blocks.map((block, idx) => {
              const isLastBlock = idx === message.blocks.length - 1;
              if (block.type === 'thinking') {
                return (
                  <ThinkingBadge
                    key={`b-${idx}`}
                    text={block.text}
                    isStreaming={Boolean(message.isExecuting && isLastBlock)}
                  />
                );
              }
              if (block.type === 'tool') {
                return (
                  <div key={`b-${idx}`} className="chat-message__tool-chip">
                    <Terminal size={12} />
                    <span>{block.label}</span>
                  </div>
                );
              }
              if (block.type === 'text') {
                return (
                  <div key={`b-${idx}`} className={`chat-message__bubble${message.isError ? ' chat-message__bubble--error' : ''}`}>
                    <MarkdownContent content={block.text} />
                  </div>
                );
              }
              return null;
            })}

            {message.isExecuting && message.blocks.every((b) => b.type !== 'text') && !message.blocks.some((b, i) => i === message.blocks.length - 1 && b.type === 'thinking') && (
              <div className="chat-message__typing">
                <span className="chat-message__typing-dot" />
                <span className="chat-message__typing-dot" />
                <span className="chat-message__typing-dot" />
              </div>
            )}
          </div>
        ) : (
          <>
            {(message.thinking || hasSteps) && (
              <div className="chat-message__pills">
                {message.thinking && (
                  <button
                    type="button"
                    className={`chat-message__pill${isThinkingOpen ? ' chat-message__pill--open' : ''}`}
                    onClick={() => setIsThinkingOpen((prev) => !prev)}
                  >
                    <Brain size={12} />
                    <span>{message.isExecuting ? 'Reasoning...' : 'Thought process'}</span>
                    {isThinkingOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}

                {hasSteps && (
                  <button
                    type="button"
                    className={`chat-message__pill${isTraceOpen ? ' chat-message__pill--open' : ''}`}
                    onClick={() => setIsTraceOpen((prev) => !prev)}
                  >
                    <Terminal size={12} />
                    <span>
                      {message.executionSteps.length}{' '}
                      {message.executionSteps.length === 1 ? 'step' : 'steps'}
                    </span>
                    {isTraceOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                )}
              </div>
            )}

            {(isThinkingOpen || (message.isExecuting && message.thinking && !message.content)) && message.thinking && (
              <div className="chat-message__thinking-body">
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message.thinking}</pre>
              </div>
            )}

            {isTraceOpen && hasSteps && (
              <div className="chat-message__execution">
                <div className="chat-message__execution-list">
                  {message.executionSteps.map((step, idx) => (
                    <div key={idx} className="chat-message__execution-item">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`chat-message__bubble${message.isError ? ' chat-message__bubble--error' : ''}`}>
              {message.isExecuting && !message.content ? (
                <div className="chat-message__typing">
                  <span className="chat-message__typing-dot" />
                  <span className="chat-message__typing-dot" />
                  <span className="chat-message__typing-dot" />
                </div>
              ) : (
                <MarkdownContent content={message.content} />
              )}
            </div>
          </>
        )}

        {/* Interactive Open Project Prompt Action */}
        {message.actionRequest?.type === 'open-project' && (
          <div className="chat-message__action-card">
            <div className="chat-message__action-card-info">
              <FolderOpen size={16} color="var(--accent-cyan)" />
              <div>
                <div className="chat-message__action-card-title">Open Project Workspace</div>
                <div className="chat-message__action-card-sub">
                  {message.actionRequest.path
                    ? `Target: ${message.actionRequest.path}`
                    : 'Choose a folder to load into the Files editor'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={isOpeningProject}
              onClick={async () => {
                setIsOpeningProject(true);
                await openProjectFolder(message.actionRequest.path || '');
                setIsOpeningProject(false);
              }}
            >
              <FolderOpen size={14} />
              <span>{isOpeningProject ? 'Opening...' : 'Open Project'}</span>
            </button>
          </div>
        )}

        {/* Minimal Footer */}
        <div className="chat-message__meta">
          <span>{message.timestamp}</span>
          {message.content && !message.isExecuting && (
            <button
              type="button"
              onClick={handleCopy}
              className="chat-message__action-btn"
              title="Copy response"
            >
              {isCopied ? <Check size={12} color="var(--status-success)" /> : <Copy size={12} />}
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
