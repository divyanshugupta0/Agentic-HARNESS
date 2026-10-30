import React from 'react';
import { X, FileText, FileCode, FileJson } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export function FileTabs() {
  const { openFileTabs, activeFile, openFile, closeFileTab } = useWorkspace();

  const getFileIcon = (type) => {
    switch (type) {
      case 'json':
        return <FileJson size={14} color="var(--accent-amber)" />;
      case 'javascript':
        return <FileCode size={14} color="var(--accent-cyan)" />;
      default:
        return <FileText size={14} color="var(--text-secondary)" />;
    }
  };

  return (
    <div className="files-workspace__tabs" id="files-editor-tabs">
      {openFileTabs.map((file) => {
        const isActive = activeFile?.id === file.id;
        return (
          <div
            key={file.id}
            className={`files-workspace__tab ${isActive ? 'files-workspace__tab--active' : ''}`}
            onClick={() => openFile(file.id)}
          >
            {getFileIcon(file.type)}
            <span>{file.name}</span>
            {file.isDirty && <span className="files-workspace__dirty-badge" />}
            <button
              type="button"
              className="files-workspace__tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeFileTab(file.id);
              }}
              title="Close Tab"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
