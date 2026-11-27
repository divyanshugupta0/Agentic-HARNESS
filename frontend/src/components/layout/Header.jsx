import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Folder,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Search,
  Check,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Circle,
  Settings,
  Monitor,
  ShieldCheck,
  Mic,
  Cpu
} from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useChat } from '../../hooks/useChat';
import { TABS } from '../../constants/navigation';
import { providerService } from '../../services/providerService';
import { Modal } from '../common/Modal';
import { SettingsModal } from '../settings/SettingsModal';

export function Header() {
  const { currentTab, setCurrentTab, isSidebarCollapsed, toggleSidebar, openLiveAudio } = useWorkspace();
  const { selectedModel, setSelectedModel, agentStatus } = useChat();
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState(() => providerService.getAvailableModels());
  const [configuredProviders, setConfiguredProviders] = useState(() => providerService.getConfiguredProviders());
  const [activeProviderId, setActiveProviderId] = useState(null);
  const [modelSearch, setModelSearch] = useState('');

  useEffect(() => {
    return providerService.subscribe(() => {
      setAvailableModels(providerService.getAvailableModels());
      setConfiguredProviders(providerService.getConfiguredProviders());
    });
  }, []);

  const activeModelObj = availableModels.find((m) => m.id === selectedModel) || availableModels[0] || null;
  const selectedProvider = configuredProviders.find((p) => p.id === activeProviderId) || null;

  const closeModelModal = () => {
    setIsModelModalOpen(false);
    setActiveProviderId(null);
    setModelSearch('');
  };

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
          <span>{activeModelObj ? activeModelObj.name : 'No Model Configured'}</span>
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
          id="tab-windows"
          className={`header__tab-btn ${currentTab === TABS.WINDOWS ? 'header__tab-btn--active' : ''}`}
          onClick={() => setCurrentTab(TABS.WINDOWS)}
          title="Windows OS & Ghost Background Automation"
        >
          <Monitor size={15} />
          <span>Windows OS</span>
        </button>

        <button
          type="button"
          id="tab-custom-tools"
          className={`header__tab-btn ${currentTab === TABS.CUSTOM_TOOLS ? 'header__tab-btn--active' : ''}`}
          onClick={() => setCurrentTab(TABS.CUSTOM_TOOLS)}
          title="Custom AI Tools & Verification Gate"
        >
          <ShieldCheck size={15} />
          <span>Custom Tools</span>
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

      {/* Right Section: PersonaPlex Live Audio, Settings & Agent Status Pill */}
      <div className="header__right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Live Audio Button */}
        <button
          type="button"
          onClick={openLiveAudio}
          title="Launch Live Audio Mode (Gemini & ChatGPT style Liquid Orb)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(168, 85, 247, 0.25))',
            border: '1px solid var(--accent-cyan)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.2)'
          }}
        >
          <Mic size={13} color="var(--accent-cyan)" />
          <span>Live Audio</span>
        </button>

        <button
          type="button"
          className="btn-icon"
          onClick={() => setIsSettingsModalOpen(true)}
          title="Settings"
          aria-label="Settings"
          id="settings-btn"
        >
          <Settings size={17} />
        </button>

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

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        id="settings-modal"
      />

      {/* Model Selection Modal */}
      <Modal
        isOpen={isModelModalOpen}
        onClose={closeModelModal}
        title={selectedProvider ? selectedProvider.name : 'Select AI Agent Foundation Model'}
        id="model-selector-modal"
      >
        <div className="model-picker">
          {configuredProviders.length === 0 ? (
            <div className="model-picker__empty">
              <p>
                No providers configured. Add an API key in Settings to unlock models.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  closeModelModal();
                  setIsSettingsModalOpen(true);
                }}
              >
                Open Settings
              </button>
            </div>
          ) : !selectedProvider ? (
            <div className="model-picker__list">
              {configuredProviders.map((prov) => {
                const hasActiveModel = (prov.models || []).some((m) => m.id === selectedModel);
                return (
                  <button
                    key={prov.id}
                    type="button"
                    className={`model-picker__provider-row${hasActiveModel ? ' model-picker__provider-row--active' : ''}`}
                    onClick={() => {
                      setActiveProviderId(prov.id);
                      setModelSearch('');
                    }}
                  >
                    <div className="model-picker__provider-left">
                      <span className="model-picker__provider-icon">
                        <Cpu size={16} />
                      </span>
                      <span className="model-picker__provider-name">{prov.name}</span>
                    </div>
                    <ChevronRight size={16} className="model-picker__arrow" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="model-picker__models-view">
              <div className="model-picker__toolbar">
                <button
                  type="button"
                  className="model-picker__back-btn"
                  onClick={() => {
                    setActiveProviderId(null);
                    setModelSearch('');
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Providers</span>
                </button>

                <div className="model-picker__search">
                  <Search size={14} className="model-picker__search-icon" />
                  <input
                    type="text"
                    className="model-picker__search-input"
                    placeholder={`Search ${selectedProvider.name} models...`}
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="model-picker__models-list">
                {(() => {
                  const q = modelSearch.trim().toLowerCase();
                  const filtered = (selectedProvider.models || []).filter(
                    (m) =>
                      !q ||
                      m.name.toLowerCase().includes(q) ||
                      m.id.toLowerCase().includes(q) ||
                      (m.tag && m.tag.toLowerCase().includes(q))
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="model-picker__empty">
                        <p>No models match "{modelSearch}".</p>
                      </div>
                    );
                  }
                  return filtered.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        className={`model-picker__model-row${isSelected ? ' model-picker__model-row--selected' : ''}`}
                        onClick={() => {
                          providerService.setActiveTarget({
                            providerId: selectedProvider.id,
                            modelId: model.id
                          });
                          setSelectedModel(model.id);
                          closeModelModal();
                        }}
                      >
                        <div className="model-picker__model-info">
                          <span className="model-picker__model-name">{model.name}</span>
                          <span className="model-picker__model-meta">
                            {model.id} • Context: {model.context || 'Standard'}
                          </span>
                        </div>
                        <div className="model-picker__model-right">
                          <span
                            className={`model-picker__tag${
                              model.tag === 'Free' ? ' model-picker__tag--free' : ''
                            }`}
                          >
                            {model.tag || 'Ready'}
                          </span>
                          {isSelected && <Check size={15} className="model-picker__check" />}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </header>
  );
}
