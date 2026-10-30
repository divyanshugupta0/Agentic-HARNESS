import React, { useState } from 'react';
import {
  MessageSquare,
  Folder,
  LayoutGrid,
  ChevronDown,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Circle
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useChat } from '../../context/ChatContext';
import { TABS } from '../../constants/navigation';
import { AVAILABLE_MODELS } from '../../constants/models';
import { Modal } from '../common/Modal';

export function Header() {
  const { currentTab, setCurrentTab, isSidebarCollapsed, toggleSidebar } = useWorkspace();
  const { selectedModel, setSelectedModel, agentStatus } = useChat();
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  const activeModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const getStatusColor = () => {
    if (agentStatus === 'running') return 'var(--accent-cyan)';
    if (agentStatus === 'paused') return 'var(--accent-amber)';
    if (agentStatus === 'stopped') return 'var(--accent-rose)';
    return 'var(--accent-emerald)';
  };

  return (
    <header className="header" id="app-header">
      <div className="header__left">
        <button
          type="button"
          className="btn-icon"
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          id="sidebar-toggle-btn"
        >
          {isSidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div className="header__workspace-info">
          <span className="header__workspace-title">Workspace</span>
        </div>

        {/* Model Selector Badge */}
        <button
          type="button"
          className="header__model-badge"
          onClick={() => setIsModelModalOpen(true)}
          title="Change active model"
          id="header-model-selector"
        >
          <Sparkles size={13} />
          <span>{activeModelObj.name}</span>
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Center Modular Navigation Tabs */}
      <nav className="header__tabs" id="header-navigation-tabs">
        <button
          type="button"
          id="tab-chat"
          className={`header__tab-btn ${currentTab === TABS.CHAT ? 'header__tab-btn--active' : ''}`}
          onClick={() => setCurrentTab(TABS.CHAT)}
        >
          <MessageSquare size={15} />
          <span>Chat</span>
        </button>

        <button
          type="button"
          id="tab-files"
          className={`header__tab-btn ${currentTab === TABS.FILES ? 'header__tab-btn--active' : ''}`}
          onClick={() => setCurrentTab(TABS.FILES)}
        >
          <Folder size={15} />
          <span>Files</span>
        </button>

        <button
          type="button"
          id="tab-marketplace"
          className={`header__tab-btn ${currentTab === TABS.MARKETPLACE ? 'header__tab-btn--active' : ''}`}
          onClick={() => setCurrentTab(TABS.MARKETPLACE)}
        >
          <LayoutGrid size={15} />
          <span>Marketplace</span>
        </button>
      </nav>

      {/* Right Section: Agent Status Pill */}
      <div className="header__right">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            fontWeight: 500
          }}
          id="agent-status-indicator"
        >
          <Circle size={8} fill={getStatusColor()} color={getStatusColor()} />
          <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
            Agent: {agentStatus}
          </span>
        </div>
      </div>

      {/* Model Selection Modal */}
      <Modal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        title="Select AI Agent Foundation Model"
        id="model-selector-modal"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {AVAILABLE_MODELS.map((model) => (
            <div
              key={model.id}
              onClick={() => {
                setSelectedModel(model.id);
                setIsModelModalOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: selectedModel === model.id ? 'var(--bg-tertiary)' : 'transparent',
                border: selectedModel === model.id ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {model.name}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {model.provider} • Context: {model.context}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {model.tag}
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </header>
  );
}
