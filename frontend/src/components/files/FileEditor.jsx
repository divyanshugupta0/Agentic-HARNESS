import React, { useEffect, useRef } from 'react';
import { Save, Check } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
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
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px'
        }}
      >
        Select a file from the explorer to preview or edit.
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
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {activeFile.path}
          </span>
          {activeFile.isDirty && (
            <span style={{ color: 'var(--accent-amber)', fontSize: '11px' }}>
              • Unsaved changes
            </span>
          )}
          <span>{lineCount} lines</span>
          <span>{activeFile.content?.length || 0} characters</span>
        </div>

        <Button
          variant={activeFile.isDirty ? 'primary' : 'secondary'}
          size="sm"
          icon={activeFile.isDirty ? Save : Check}
          onClick={saveActiveFile}
          id="files-save-button"
        >
          {activeFile.isDirty ? 'Save File' : 'Saved'}
        </Button>
      </div>

      {/* Editor Main Pane */}
      <div className="files-workspace__editor-pane">
        <div className="files-workspace__line-numbers" ref={lineNumbersRef}>
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
