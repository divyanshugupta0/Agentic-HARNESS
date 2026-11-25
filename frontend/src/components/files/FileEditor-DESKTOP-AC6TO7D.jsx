import React, { useEffect, useRef } from 'react';
import { Save, Check, FileCode } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Button } from '../common/Button';

export function FileEditor() {
  const { activeFile, updateFileContent, saveActiveFile } = useWorkspace();
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveActiveFile]);

  if (!activeFile) {
    return (
      <div className="files-workspace__empty-state">
        <div className="files-workspace__empty-icon">
          <FileCode size={32} />
        </div>
        <p className="files-workspace__empty-title">No file open</p>
        <p className="files-workspace__empty-desc">
          Select a file from the explorer on the left or create a new file to start editing.
        </p>
      </div>
    );
  }

  const lines = (activeFile.content || '').split('\n');
  const lineCount = lines.length;

  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  return (
    <div className="files-workspace__editor" id="files-editor">
      {/* Editor Toolbar */}
      <div className="files-workspace__editor-toolbar">
        <div className="files-workspace__editor-info">
          <span className="files-workspace__editor-path">
            {activeFile.path || activeFile.name}
          </span>
          {activeFile.isDirty && (
            <span className="files-workspace__unsaved-indicator">
              • Unsaved
            </span>
          )}
          <span className="files-workspace__stat-badge">{lineCount} lines</span>
          <span className="files-workspace__stat-badge">{activeFile.content?.length || 0} chars</span>
        </div>

        <Button
          variant={activeFile.isDirty ? 'primary' : 'secondary'}
          size="sm"
          icon={activeFile.isDirty ? Save : Check}
          onClick={saveActiveFile}
          id="files-save-button"
        >
          {activeFile.isDirty ? 'Save (Ctrl+S)' : 'Saved'}
        </Button>
      </div>

      {/* Editor Main Pane */}
      <div className="files-workspace__editor-pane">
        <div className="files-workspace__line-numbers" ref={lineNumbersRef} aria-hidden="true">
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className="files-workspace__textarea"
          value={activeFile.content || ''}
          onChange={(e) => updateFileContent(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
