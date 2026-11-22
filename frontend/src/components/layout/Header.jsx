import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Folder,
  LayoutGrid,
  ChevronDown,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Settings,
  AlertCircle,
  Plus
} from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useChat } from '../../hooks/useChat';
import { TABS } from '../../constants/navigation';
import { providerService } from '../../services/providerService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function Header() {
  const { currentTab, setCurrentTab, isSidebarCollapsed, toggleSidebar } = useWorkspace();
  const { selectedModel, setSelectedModel, agentStatus, openSettings } = useChat();
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState(() => providerService.getAvailableModels());
  const [hasProvider, setHasProvider] = useState(() => providerService.hasConfiguredProvider());

  useEffect(() => {
    return providerService.subscribe(() => {
      setAvailableModels(providerService.getAvailableModels());
      setHasProvider(providerService.hasConfiguredProvider());
    });
  }, []);

  const activeModelObj = availableModels.find((m) => m.id === selectedModel) || availableModels[0] || null;

  const getStatusColor = () => {
    if (agentStatus === 'running') return 'var(--status-info)';
    if (agentStatus === 'paused') return 'var(--status-warning)';
    if (agentStatus === 'stopped') return 'var(--status-error)';
    return 'var(--status-success)';
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
          {isSidebarCollapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
        </button>

        <div className="header__workspace-info">
          <span className="header__workspace-title">Agentic Harness</span>
        </div>

        {/* Dynamic Model Selector Badge */}
        {hasProvider && activeModelObj ? (
          <button
            type="button"
            className="header__model-badge"
            onClick={() => setIsModelModalOpen(true)}
            title="Change active foundation model"
            id="header-model-selector"
          >
            <Sparkles size={13} style={{ color: 'var(--accent-indigo)' }} />
            <span>{activeModelObj.name}</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>
        ) : (
          <button
            type="button"
            className="header__model-badge header__model-badge--unconfigured"
            onClick={() => setIsModelModalOpen(true)}
            title="Connect an AI Provider"
            id="header-model-selector"
          >
            <AlertCircle size={13} style={{ color: 'var(--status-warning)' }} />
            <span>No Provider Connected</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* Center Modular Navigation Tabs (Segmented Control) */}
      <nav className="header__tabs" id="header-navigation-tabs">
        <button
          type="button"
          id="tab-chat"
          className={`header__tab-btn ${currentTab === TABS.CHAT ? 'header__tab-btn--active' : ''}`}
          onClick={() => setCurrentTab(TABS.CHAT)}
        >
          <MessageSquare size={14} />
          <span>Chat</span>
        </button>

        <button
          type="button"
          id="tab-files"
          className={`header__tab-btn ${currentTab === TABS.FILES ? 'header__tab-btn--active' : ''}`}
          onClick={() => setCurrentTab(TABS.FILES)}
        >
          <Folder size={14} />
          <span>Files</span>
        </button>

        <button
          type="button"
          id="tab-marketplace"
          className={`header__tab-btn ${currentTab === TABS.MARKETPLACE ? 'header__tab-btn--active' : ''}`}
          onClick={() => setCurrentTab(TABS.MARKETPLACE)}
        >
          <LayoutGrid size={14} />
          <span>Marketplace</span>
        </button>
      </nav>

      {/* Right Section: Settings and Agent Status */}
      <div className="header__right">
        <div
          className="header__status-indicator"
          id="agent-status-indicator"
          title={`Agent Status: ${agentStatus}`}
        >
          <div
            className={`header__status-dot ${agentStatus === 'running' ? 'header__status-dot--pulse' : ''}`}
            style={{ backgroundColor: getStatusColor() }}
          />
          <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
            {agentStatus}
          </span>
        </div>

        <button
          type="button"
          className="btn-icon"
          onClick={() => openSettings('general')}
          title="Workspace Settings"
          aria-label="Settings"
          id="settings-btn"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Model Selection Modal */}
      <Modal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        title="Select AI Agent Foundation Model"
        id="model-selector-modal"
      >
        {availableModels.length === 0 ? (
          <div className="api-providers-settings__empty" style={{ padding: '24px 16px' }}>
            <AlertCircle size={32} style={{ color: 'var(--accent-amber)', marginBottom: '8px' }} />
            <p className="api-providers-settings__empty-title">
              Your workspace is not connected to an AI provider yet.
            </p>
            <p className="api-providers-settings__empty-desc">
              Connect a provider to access available models and start using Agentic Harness.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setIsModelModalOpen(false);
                openSettings('providers');
              }}
              style={{ marginTop: '16px' }}
            >
              Add Provider
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Active Provider Models ({availableModels.length})
              </span>
              <button
                type="button"
                className="auth-form__switch-link"
                style={{ fontSize: '11px' }}
                onClick={() => {
                  setIsModelModalOpen(false);
                  openSettings('providers');
                }}
              >
                Manage Providers
              </button>
            </div>

            {availableModels.map((model) => (
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
                  border: selectedModel === model.id ? '1px solid var(--border-focus)' : '1px solid var(--border-default)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {model.name}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {model.provider} • Context: {model.context}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  {model.tag || 'Ready'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </header>
  );
}
