import React, { useState } from 'react';
import { Plus, Trash2, Clock, FilePlus } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { getFileIcon } from '../../utils/fileIcons';
import { formatClockTime } from '../../utils/formatDate';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function FileExplorer() {
  const { files, activeFile, openFile, createFile, deleteFile, recentlyModified } = useWorkspace();
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (newFileName.trim()) {
      createFile(newFileName.trim());
      setNewFileName('');
      setIsNewFileModalOpen(false);
    }
  };

  return (
    <div className="files-workspace__sidebar" id="files-explorer">
      <div className="files-workspace__sidebar-header">
        <span className="files-workspace__sidebar-title">Workspace Files</span>
        <button
          type="button"
          className="btn-icon"
          onClick={() => setIsNewFileModalOpen(true)}
          title="Create New File"
          id="files-create-button"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* File Tree */}
      <div className="files-workspace__tree">
        {files.map((file) => {
          const isActive = activeFile?.id === file.id;
          return (
            <div
              key={file.id}
              className={`files-workspace__tree-item ${isActive ? 'files-workspace__tree-item--active' : ''}`}
              onClick={() => openFile(file.id)}
            >
              <div className="files-workspace__tree-icon">
                {getFileIcon(file.type)}
              </div>
              <span className="files-workspace__tree-name">
                {file.name}
              </span>
              <button
                type="button"
                className="files-workspace__tree-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file.id);
                }}
                title="Delete File"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Recently Modified Files */}
      {recentlyModified && recentlyModified.length > 0 && (
        <div className="files-workspace__recent">
          <div className="files-workspace__recent-header">
            <Clock size={12} style={{ color: 'var(--text-muted)' }} />
            <span className="files-workspace__recent-title">Recently Modified</span>
          </div>
          <div className="files-workspace__recent-list">
            {recentlyModified.map((file) => (
              <div
                key={file.id}
                onClick={() => openFile(file.id)}
                className="files-workspace__recent-item"
              >
                <span className="files-workspace__recent-name">{file.name}</span>
                <span className="files-workspace__recent-time">
                  {formatClockTime(file.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New File Modal */}
      <Modal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        title="Create New File"
        id="new-file-modal"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="auth-form__group">
            <label className="auth-form__label">File Name (with extension)</label>
            <div className="auth-form__input-wrapper">
              <FilePlus size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="auth-form__input"
                placeholder="e.g. app.js, index.html, styles.css"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsNewFileModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create File
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
