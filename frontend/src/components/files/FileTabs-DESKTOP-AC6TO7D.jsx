import React from 'react';
import { X } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { getFileIcon } from '../../utils/fileIcons';

export function FileTabs() {
  const { openFileTabs, activeFile, openFile, closeFileTab } = useWorkspace();

  if (!openFileTabs || openFileTabs.length === 0) {
    return null;
  }

  return (
    <div className="files-workspace__tabs" id="files-editor-tabs">
      {openFileTabs.map((file) => {
        const isActive = activeFile?.id === file.id;
        return (
          <div
            key={file.id}
            className={`files-workspace__tab ${isActive ? 'files-workspace__tab--active' : ''}`}
            onClick={() => openFile(file.id)}
            title={file.path}
          >
            <div className="files-workspace__tab-icon">
              {getFileIcon(file.type)}
            </div>
            <span className="files-workspace__tab-title">{file.name}</span>
            {file.isDirty && (
              <span className="files-workspace__dirty-badge" title="Unsaved changes" />
            )}
            <button
              type="button"
              className="files-workspace__tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeFileTab(file.id);
              }}
              title="Close tab"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
