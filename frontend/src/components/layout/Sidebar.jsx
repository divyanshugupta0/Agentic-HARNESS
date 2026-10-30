import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  LogIn,
  LogOut,
  Settings,
  Bot
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { TABS, CONVERSATION_GROUPS } from '../../constants/navigation';
import { Modal } from '../common/Modal';

export function Sidebar() {
  const { isSidebarCollapsed, setCurrentTab } = useWorkspace();
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createNewChat,
    deleteConversation,
    searchQuery,
    setSearchQuery
  } = useChat();
  const { user, isAuthenticated, signOut, openSignInModal } = useAuth();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Group conversations by relative date
  const groupConversations = () => {
    const groups = {
      [CONVERSATION_GROUPS.TODAY]: [],
      [CONVERSATION_GROUPS.YESTERDAY]: [],
      [CONVERSATION_GROUPS.PREVIOUS_7_DAYS]: [],
      [CONVERSATION_GROUPS.OLDER]: []
    };

    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    conversations.forEach((conv) => {
      const convDate = new Date(conv.updatedAt || Date.now());
      const convDateStr = convDate.toDateString();

      if (convDateStr === todayStr) {
        groups[CONVERSATION_GROUPS.TODAY].push(conv);
      } else if (convDateStr === yesterdayStr) {
        groups[CONVERSATION_GROUPS.YESTERDAY].push(conv);
      } else if (convDate > sevenDaysAgo) {
        groups[CONVERSATION_GROUPS.PREVIOUS_7_DAYS].push(conv);
      } else {
        groups[CONVERSATION_GROUPS.OLDER].push(conv);
      }
    });

    return groups;
  };

  const grouped = groupConversations();

  const handleNewChat = () => {
    createNewChat('New Agent Mission');
    setCurrentTab(TABS.CHAT);
  };

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <aside
      className={`sidebar ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}
      id="sidebar-container"
    >
      {/* Top Section: Brand & Logo */}
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0
            }}
          >
            <Bot size={18} />
          </div>
          {!isSidebarCollapsed && (
            <span className="sidebar__brand-text">Agentic Harness</span>
          )}
        </div>
      </div>

      {/* Actions: New Chat & Search */}
      <div className="sidebar__actions">
        <button
          type="button"
          className="sidebar__new-chat-btn"
          onClick={handleNewChat}
          title="Start a new chat"
          id="sidebar-new-chat-button"
        >
          <Plus size={16} />
          {!isSidebarCollapsed && <span>New Mission</span>}
        </button>

        {!isSidebarCollapsed && (
          <button
            type="button"
            className="sidebar__search-btn"
            onClick={() => setIsSearchModalOpen(true)}
            id="sidebar-search-button"
          >
            <Search size={14} />
            <span>Search missions...</span>
            <span className="sidebar__search-shortcut">⌘K</span>
          </button>
        )}
      </div>

      {/* Middle Section: Scrollable History */}
      <div className="sidebar__history" id="sidebar-history-list">
        {filteredConversations ? (
          <div className="sidebar__group">
            <span className="sidebar__group-title">Search Results</span>
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`sidebar__item ${conv.id === activeConversationId ? 'sidebar__item--active' : ''}`}
                onClick={() => {
                  selectConversation(conv.id);
                  setCurrentTab(TABS.CHAT);
                }}
              >
                <MessageSquare size={14} />
                {!isSidebarCollapsed && (
                  <span className="sidebar__item-title">{conv.title}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, list]) => {
            if (list.length === 0) return null;
            return (
              <div key={groupTitle} className="sidebar__group">
                {!isSidebarCollapsed && (
                  <span className="sidebar__group-title">{groupTitle}</span>
                )}
                {list.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
                      onClick={() => {
                        selectConversation(conv.id);
                        setCurrentTab(TABS.CHAT);
                      }}
                      title={conv.title}
                    >
                      <MessageSquare size={14} />
                      {!isSidebarCollapsed && (
                        <>
                          <span className="sidebar__item-title">{conv.title}</span>
                          <div className="sidebar__item-actions">
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: '22px', height: '22px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                              title="Delete conversation"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Section: User Profile & Auth */}
      <div className="sidebar__footer" id="sidebar-user-profile">
        {isAuthenticated ? (
          <div className="sidebar__profile">
            <div className="sidebar__avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="sidebar__profile-info">
                  <span className="sidebar__username">{user.name}</span>
                  <span className="sidebar__user-status">{user.role}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setIsSettingsModalOpen(true)}
                    title="Settings"
                  >
                    <Settings size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={signOut}
                    title="Sign Out"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            style={{ width: '100%' }}
            onClick={openSignInModal}
            id="sidebar-signin-button"
          >
            <LogIn size={15} />
            {!isSidebarCollapsed && <span>Sign In</span>}
          </button>
        )}
      </div>

      {/* Search Modal */}
      <Modal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        title="Search Past Missions"
        id="sidebar-search-modal"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="auth-form__input-wrapper">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="auth-form__input"
              placeholder="Type to filter conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {conversations
              .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    selectConversation(conv.id);
                    setCurrentTab(TABS.CHAT);
                    setIsSearchModalOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {conv.title}
                </div>
              ))}
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Agentic Harness Settings"
        id="sidebar-settings-modal"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Desktop Environment
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Local Node.js & Electron runtime configuration.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sandbox Mode</span>
            <span style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontWeight: 500 }}>
              Enabled (Isolated)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Default Storage</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Local Vector DB</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active User</span>
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{user.email || user.name}</span>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
