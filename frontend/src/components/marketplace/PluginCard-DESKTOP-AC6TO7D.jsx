import React from 'react';
import {
  FolderKanban,
  Terminal,
  Globe,
  Bot,
  Code2,
  Compass,
  GitPullRequest,
  Clock,
  Settings,
  Check,
  Download
} from 'lucide-react';
import { Button } from '../common/Button';

const ICON_MAP = {
  FolderKanban,
  Terminal,
  Globe,
  Bot,
  Code2,
  Compass,
  GitPullRequest,
  Clock
};

export function PluginCard({ plugin, onToggleInstall, onToggleEnabled, onOpenDetails }) {
  const IconComponent = ICON_MAP[plugin.icon] || Bot;

  return (
    <div className="plugin-card" id={`plugin-card-${plugin.id}`}>
      <div className="plugin-card__header">
        <div className="plugin-card__icon-badge">
          <IconComponent size={18} />
        </div>
        <span className="plugin-card__badge">{plugin.category}</span>
      </div>

      <div className="plugin-card__body">
        <h4 className="plugin-card__name">{plugin.name}</h4>
        <p className="plugin-card__desc">{plugin.description}</p>
      </div>

      <div className="plugin-card__footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {plugin.installed ? (
            <button
              type="button"
              onClick={() => onToggleEnabled(plugin.id)}
              className={`plugin-card__status-btn ${plugin.enabled ? 'plugin-card__status-btn--enabled' : 'plugin-card__status-btn--disabled'}`}
              title={plugin.enabled ? 'Click to disable' : 'Click to enable'}
            >
              <span className="plugin-card__status-dot" />
              <span>{plugin.enabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          ) : (
            <span className="plugin-card__version">
              v{plugin.version}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => onOpenDetails(plugin)}
            title="Configure Plugin"
          >
            <Settings size={15} />
          </button>

          <Button
            variant={plugin.installed ? 'ghost' : 'primary'}
            size="sm"
            icon={plugin.installed ? Check : Download}
            onClick={() => onToggleInstall(plugin.id)}
          >
            {plugin.installed ? 'Installed' : 'Install'}
          </Button>
        </div>
      </div>
    </div>
  );
}
