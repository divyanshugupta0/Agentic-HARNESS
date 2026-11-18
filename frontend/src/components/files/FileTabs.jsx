import React from 'react';
import { X } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { getFileIcon } from '../../utils/fileIcons';

export function FileTabs() {
  const { openFileTabs, activeFile, openFile, closeFileTab } = useWorkspace();

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
