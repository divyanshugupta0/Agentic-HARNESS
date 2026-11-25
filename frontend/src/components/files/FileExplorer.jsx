import React, { useState } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
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
          <Plus size={16} />
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
              {getFileIcon(file.type)}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              <button
                type="button"
                className="btn-icon"
                style={{ width: '20px', height: '20px' }}
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
      <div className="files-workspace__recent">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={12} color="var(--text-muted)" />
          <span className="files-workspace__recent-title">Recently Modified</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
          {recentlyModified.map((file) => (
            <div
              key={file.id}
              onClick={() => openFile(file.id)}
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {formatClockTime(file.updatedAt)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* New File Modal */}
      <Modal
        isOpen={isNewFileModalOpen}
        onClose={() => setIsNewFileModalOpen(false)}
        title="Create New Workspace File"
        id="files-create-modal"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="auth-form__group">
            <label className="auth-form__label">File Name & Extension</label>
            <div className="auth-form__input-wrapper">
              <input
                type="text"
                className="auth-form__input"
                placeholder="e.g. agent-runner.js, notes.md, schema.json"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" onClick={() => setIsNewFileModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!newFileName.trim()}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
