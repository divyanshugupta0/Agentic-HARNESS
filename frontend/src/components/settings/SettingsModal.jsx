import React, { useState, useEffect } from 'react';
import {
  SunMoon,
  Key,
  Sliders,
  Cpu,
  Shield,
  Terminal,
  X
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { AppearanceSettings } from './AppearanceSettings';
import { ApiProvidersSettings } from './ApiProvidersSettings';
import { GeneralSettings } from './GeneralSettings';
import { ModelsSettings } from './ModelsSettings';
import { PrivacySettings } from './PrivacySettings';

import { SETTINGS_CATEGORIES as RAW_CATEGORIES } from '../../constants/navigation';

const ICON_MAP = {
  general: Sliders,
  providers: Key,
  models: Cpu,
  appearance: SunMoon,
  privacy: Shield
};

export const SETTINGS_CATEGORIES = RAW_CATEGORIES.map((cat) => ({
  ...cat,
  icon: ICON_MAP[cat.id] || Sliders
}));

export function SettingsModal({
  isOpen,
  onClose,
  initialCategory = 'appearance',
  id = 'settings-modal'
}) {
  const [activePage, setActivePage] = useState(initialCategory);

  useEffect(() => {
    if (initialCategory) {
      setActivePage(initialCategory);
    }
  }, [initialCategory, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      id={id}
      maxWidth="980px"
    >
      <div className="settings-layout">
        {/* Region A: Settings Navigation Sidebar */}
        <aside className="settings-sidebar" aria-label="Settings navigation">
          <span className="settings-sidebar__category">Workspace</span>

          {SETTINGS_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activePage === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                className={`settings-sidebar__item ${isActive ? 'settings-sidebar__item--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActivePage(cat.id)}
              >
                <Icon size={15} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Region B: Main Settings Content Area */}
        <main className="settings-layout__content">
          {activePage === 'general' && <GeneralSettings />}
          {activePage === 'providers' && <ApiProvidersSettings />}
          {activePage === 'models' && (
            <ModelsSettings onNavigateToProviders={() => setActivePage('providers')} />
          )}
          {activePage === 'appearance' && <AppearanceSettings />}
          {activePage === 'privacy' && <PrivacySettings />}
        </main>
      </div>
    </Modal>
  );
}
