import React, { useState, useRef } from 'react';
import { ArrowUp, Paperclip, Wrench, Square, Pause, Play, Check, X } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { BUILTIN_TOOLS } from '../../constants/tools';

export function PromptInput({ inputRef, value, onChange, onSubmit }) {
  const { agentStatus, stopAgent, pauseAgent, resumeAgent, activeTools, toggleTool } = useChat();
  const [isToolsPopoverOpen, setIsToolsPopoverOpen] = useState(false);
  const [attachmentName, setAttachmentName] = useState(null);
  const fileInputRef = useRef(null);

  const isRunning = agentStatus === 'running';
  const isPaused = agentStatus === 'paused';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isRunning) {
        onSubmit();
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
    }
  };

  return (
    <div className="prompt-composer" id="chat-prompt-composer">
      <div className="prompt-composer__box">
        {attachmentName && (
          <div className="prompt-composer__attachment-chip">
            <Paperclip size={12} />
            <span>{attachmentName}</span>
            <button
              type="button"
              className="prompt-composer__attachment-remove"
              onClick={() => setAttachmentName(null)}
              title="Remove attachment"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <textarea
          ref={inputRef}
          id="chat-prompt-input"
          className="prompt-composer__textarea"
          placeholder="Ask Agentic Harness to analyze files, run tasks, or write code... (Shift+Enter for newline)"
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning && !isPaused}
        />

        <div className="prompt-composer__toolbar">
          <div className="prompt-composer__tools">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              type="button"
              className="btn-icon"
              onClick={() => fileInputRef.current?.click()}
              title="Attach local file context"
              id="prompt-attach-file-btn"
            >
              <Paperclip size={15} />
            </button>

            {/* Tools Selector Popover Toggle */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`prompt-composer__tool-badge ${isToolsPopoverOpen ? 'prompt-composer__tool-badge--active' : ''}`}
                onClick={() => setIsToolsPopoverOpen(!isToolsPopoverOpen)}
                title="Configure Agent Tools"
                id="prompt-tools-selector-btn"
              >
                <Wrench size={13} />
                <span>Tools ({activeTools.length})</span>
              </button>

              {isToolsPopoverOpen && (
                <div className="prompt-composer__tools-popover">
                  <div className="prompt-composer__tools-popover-header">
                    <span>Available Agent Tools</span>
                  </div>
                  <div className="prompt-composer__tools-popover-list">
                    {BUILTIN_TOOLS.map((tool) => {
                      const isSelected = activeTools.includes(tool.id);
                      return (
                        <div
                          key={tool.id}
                          className={`prompt-composer__tool-item ${isSelected ? 'prompt-composer__tool-item--selected' : ''}`}
                          onClick={() => toggleTool(tool.id)}
                        >
                          <div className="prompt-composer__tool-info">
                            <span className="prompt-composer__tool-name">{tool.name}</span>
                            <span className="prompt-composer__tool-desc">{tool.description}</span>
                          </div>
                          {isSelected && <Check size={14} style={{ color: 'var(--accent-indigo)' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Action: Send or Stop/Pause */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isRunning && (
              <>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={isPaused ? resumeAgent : pauseAgent}
                  title={isPaused ? 'Resume execution' : 'Pause execution'}
                  style={{ color: 'var(--status-warning)' }}
                >
                  {isPaused ? <Play size={15} /> : <Pause size={15} />}
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={stopAgent}
                  title="Stop agent run"
                  style={{ color: 'var(--status-error)' }}
                >
                  <Square size={15} />
                </button>
              </>
            )}

            <button
              type="button"
              id="chat-send-button"
              className="prompt-composer__send-btn"
              disabled={!value.trim() || isRunning}
              onClick={onSubmit}
              title="Send instructions (Enter)"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
