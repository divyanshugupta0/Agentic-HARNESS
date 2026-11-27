import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Wrench, Square, Pause, Play, Check, Mic, FileText } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { useWorkspace } from '../../hooks/useWorkspace';
import { BUILTIN_TOOLS } from '../../constants/tools';

export function PromptInput({ inputRef, value, onChange, onSubmit }) {
  const { agentStatus, stopAgent, pauseAgent, resumeAgent, activeTools, toggleTool } = useChat();
  const { openLiveAudio } = useWorkspace();
  const [isToolsPopoverOpen, setIsToolsPopoverOpen] = useState(false);
  const [fileAttachments, setFileAttachments] = useState([]);
  const [imageAttachments, setImageAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const isRunning = agentStatus === 'running';
  const isPaused = agentStatus === 'paused';

  useEffect(() => {
    const el = inputRef?.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, inputRef]);

  const dispatchSubmit = () => {
    if (!value.trim() && fileAttachments.length === 0 && imageAttachments.length === 0) return;
    const imagesToSend = imageAttachments.map(({ mimeType, data, dataUrl, name, size }) => ({
      mimeType,
      data,
      dataUrl,
      name,
      size
    }));
    const filesToSend = fileAttachments.map(({ name, size, mimeType, isBinary, data, content }) => ({
      name,
      size,
      mimeType,
      isBinary,
      data,
      content
    }));
    setFileAttachments([]);
    setImageAttachments([]);
    onSubmit(value, { images: imagesToSend, files: filesToSend });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || fileAttachments.length > 0 || imageAttachments.length > 0) && !isRunning) {
        dispatchSubmit();
      }
    }
  };

  const addImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const comma = dataUrl.indexOf(',');
      const data = comma >= 0 ? dataUrl.slice(comma + 1) : '';
      setImageAttachments((prev) => [
        ...prev,
        {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name || 'pasted-image.png',
          size: file.size,
          mimeType: file.type || 'image/png',
          dataUrl,
          data
        }
      ]);
    };
    reader.readAsDataURL(file);
  };

  const addDocumentFile = (file) => {
    const lowerName = (file.name || '').toLowerCase();
    const isBinary =
      file.type === 'application/pdf' ||
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc') ||
      lowerName.endsWith('.xlsx');

    const reader = new FileReader();
    reader.onload = () => {
      if (isBinary) {
        const dataUrl = String(reader.result || '');
        const comma = dataUrl.indexOf(',');
        const data = comma >= 0 ? dataUrl.slice(comma + 1) : '';
        setFileAttachments((prev) => [
          ...prev,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || (lowerName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
            isBinary: true,
            data,
            content: ''
          }
        ]);
      } else {
        setFileAttachments((prev) => [
          ...prev,
          {
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'text/plain',
            isBinary: false,
            data: '',
            content: String(reader.result || '').slice(0, 30000)
          }
        ]);
      }
    };
    if (isBinary) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type && file.type.startsWith('image/')) {
      addImageFile(file);
    } else {
      addDocumentFile(file);
    }
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) addImageFile(file);
      }
    }
  };

  return (
    <div className="prompt-composer" id="chat-prompt-composer">
      <div className="prompt-composer__box">
        {imageAttachments.length > 0 && (
          <div className="prompt-composer__images-bar">
            {imageAttachments.map((img) => (
              <div key={img.id} className="prompt-composer__image-chip">
                <img src={img.dataUrl} alt={img.name} className="prompt-composer__image-thumb" />
                <div className="prompt-composer__image-meta">
                  <span className="prompt-composer__image-name">{img.name}</span>
                  <span className="prompt-composer__image-size">
                    {img.size ? `${Math.max(1, Math.round(img.size / 1024))} KB` : 'Image'}
                  </span>
                </div>
                <button
                  type="button"
                  className="prompt-composer__image-remove"
                  onClick={() => setImageAttachments((prev) => prev.filter((item) => item.id !== img.id))}
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {fileAttachments.length > 0 && (
          <div className="prompt-composer__images-bar">
            {fileAttachments.map((f) => (
              <div key={f.id} className="prompt-composer__image-chip">
                <span className="prompt-composer__file-icon">
                  <FileText size={16} />
                </span>
                <div className="prompt-composer__image-meta">
                  <span className="prompt-composer__image-name">{f.name}</span>
                  <span className="prompt-composer__image-size">
                    {f.size ? `${Math.max(1, Math.round(f.size / 1024))} KB` : 'File'}
                  </span>
                </div>
                <button
                  type="button"
                  className="prompt-composer__image-remove"
                  onClick={() => setFileAttachments((prev) => prev.filter((item) => item.id !== f.id))}
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
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
          onPaste={handlePaste}
          disabled={isRunning && !isPaused}
        />

        <div className="prompt-composer__toolbar">
          <div className="prompt-composer__tools">
            {/* Attachment Button */}
            <input
              type="file"
              accept=".pdf,image/*,.txt,.md,.js,.jsx,.ts,.tsx,.json,.py,.java,.css,.html,.yml,.yaml,.sql,.csv,.doc,.docx"
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

            {/* PersonaPlex Live Audio Button */}
            <button
              type="button"
              className="btn-icon"
              onClick={openLiveAudio}
              title="Launch PersonaPlex Live Audio (Full-Duplex Speech)"
              style={{
                color: 'var(--accent-cyan)',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderRadius: '6px'
              }}
              id="prompt-live-audio-btn"
            >
              <Mic size={15} />
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
                    width: '295px',
                    maxHeight: 'min(360px, 55vh)',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '10px',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      padding: '4px 6px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>Available Agent Tools</span>
                    <span>{activeTools.length}/{BUILTIN_TOOLS.length}</span>
                  </div>
                  <div
                    style={{
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingRight: '2px'
                    }}
                  >
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
                            gap: '8px',
                            padding: '7px 8px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{tool.name}</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                              {tool.description}
                            </span>
                          </div>
                          {isSelected && <Check size={14} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />}
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
              disabled={(!value.trim() && fileAttachments.length === 0 && imageAttachments.length === 0) || isRunning}
              onClick={dispatchSubmit}
              title="Send message (Enter)"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
