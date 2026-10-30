import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Wrench, Square, Pause, Play, Check } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
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
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              color: 'var(--accent-cyan)',
              alignSelf: 'flex-start'
            }}
          >
            <Paperclip size={12} />
            <span>{attachmentName}</span>
            <button
              type="button"
              onClick={() => setAttachmentName(null)}
              style={{ marginLeft: '4px', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ×
            </button>
          </div>
        )}

        <textarea
          ref={inputRef}
          id="chat-prompt-input"
          className="prompt-composer__textarea"
          placeholder="Ask Agentic Harness to analyze files, run tasks, or write code... (Shift+Enter for new line)"
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
              <Paperclip size={16} />
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
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: 0,
                    width: '260px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '10px',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 6px' }}>
                    Available Agent Tools
                  </div>
                  {BUILTIN_TOOLS.map((tool) => {
                    const isSelected = activeTools.includes(tool.id);
                    return (
                      <div
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{tool.name}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{tool.description}</span>
                        </div>
                        {isSelected && <Check size={14} color="var(--accent-cyan)" />}
                      </div>
                    );
                  })}
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
                  style={{ color: 'var(--accent-amber)' }}
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={stopAgent}
                  title="Stop agent run"
                  style={{ color: 'var(--accent-rose)' }}
                >
                  <Square size={16} />
                </button>
              </>
            )}

            <button
              type="button"
              id="chat-send-button"
              className="prompt-composer__send-btn"
              disabled={!value.trim() || isRunning}
              onClick={onSubmit}
              title="Execute Mission (Enter)"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
