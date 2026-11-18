import React, { useState } from 'react';
import { ArrowLeft, SunMoon } from 'lucide-react';
import { Modal } from '../common/Modal';
import { AppearanceSettings } from './AppearanceSettings';

export function SettingsModal({ isOpen, onClose, id = 'settings-modal' }) {
  const [activePage, setActivePage] = useState('appearance');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" id={id} maxWidth="980px">
      <div className="settings-layout">
        <aside className="settings-sidebar" aria-label="Settings navigation">
          <button type="button" className="settings-sidebar__back" onClick={onClose}>
            <ArrowLeft size={14} />
            Back to app
          </button>
          <span className="settings-sidebar__category">Personal</span>
          <button
            type="button"
            className={`settings-sidebar__item${activePage === 'appearance' ? ' settings-sidebar__item--active' : ''}`}
            aria-current={activePage === 'appearance' ? 'page' : undefined}
            onClick={() => setActivePage('appearance')}
          >
            <SunMoon size={16} />
            Appearance
          </button>
        </aside>
        <main className="settings-layout__content">
          {activePage === 'appearance' && <AppearanceSettings />}
        </main>
      </div>
    </Modal>
  );
}
