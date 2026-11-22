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
import { useWorkspace } from '../../hooks/useWorkspace';
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';
import { TABS } from '../../constants/navigation';
import { groupConversationsByDate } from '../../utils/formatDate';
import { Modal } from '../common/Modal';
import { SettingsModal } from '../settings/SettingsModal';

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
  const { user, isAuthenticated, signOut, openSignInModal, profileError } = useAuth();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const grouped = groupConversationsByDate(conversations);

  const handleNewChat = () => {
    createNewChat('New Mission');
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
      {/* Top Section: Brand Lockup */}
      <div className="sidebar__header">
        <div className="sidebar__brand">
          <div className="sidebar__logo-badge" title="Agentic Harness">
            <Bot size={16} />
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
          title="Start a new chat (Ctrl+N)"
          id="sidebar-new-chat-button"
        >
          <div className="sidebar__new-chat-content">
            <Plus size={15} />
            {!isSidebarCollapsed && <span>New Chat</span>}
          </div>
          {!isSidebarCollapsed && <span className="sidebar__new-chat-shortcut">⌘N</span>}
        </button>

        {!isSidebarCollapsed && (
          <button
            type="button"
            className="sidebar__search-btn"
            onClick={() => setIsSearchModalOpen(true)}
            id="sidebar-search-button"
          >
            <Search size={14} />
            <span>Search history...</span>
            <span className="sidebar__search-shortcut">⌘K</span>
          </button>
        )}
      </div>

      {/* Middle Section: Scrollable History */}
      <div className="sidebar__history" id="sidebar-history-list">
        {filteredConversations ? (
          <div className="sidebar__group">
            <span className="sidebar__group-title">Search Results</span>
            {filteredConversations.map((conv) => {
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
                  {isActive && <div className="sidebar__item-indicator" />}
                  <MessageSquare size={14} className="sidebar__item-icon" />
                  {!isSidebarCollapsed && (
                    <span className="sidebar__item-title">{conv.title}</span>
                  )}
                </div>
              );
            })}
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
                      {isActive && <div className="sidebar__item-indicator" />}
                      <MessageSquare size={14} className="sidebar__item-icon" />
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
              {user.avatar
                ? <img src={user.avatar} alt="" className="sidebar__avatar-image" />
                : (user.name ? user.name.charAt(0).toUpperCase() : 'U')}
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="sidebar__profile-info">
                  <span className="sidebar__username">{user.name}</span>
                  <span className="sidebar__user-status">{user.role || user.email || 'Local Developer'}</span>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setIsSettingsModalOpen(true)}
                    title="Settings"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={signOut}
                    title="Sign Out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={openSignInModal}
            id="sidebar-signin-button"
          >
            <LogIn size={15} />
            {!isSidebarCollapsed && <span>Sign In</span>}
          </button>
        )}
        {profileError && !isSidebarCollapsed && (
          <p className="sidebar__auth-error" role="status">{profileError}</p>
        )}
      </div>

      {/* Search Modal */}
      <Modal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        title="Search Past Conversations"
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
                    fontSize: '13px',
                    transition: 'background-color 0.15s'
                  }}
                >
                  {conv.title}
                </div>
              ))}
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        id="sidebar-settings-modal"
      />
    </aside>
  );
}
