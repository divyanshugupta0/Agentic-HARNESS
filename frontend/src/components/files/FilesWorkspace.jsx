import React from 'react';
import { FileExplorer } from './FileExplorer';
import { FileTabs } from './FileTabs';
import { FileEditor } from './FileEditor';

export function FilesWorkspace() {
  return (
    <div className="files-workspace" id="files-workspace-container">
      <FileExplorer />
      <div className="files-workspace__main">
        <FileTabs />
        <FileEditor />
      </div>
    </div>
  );
}
