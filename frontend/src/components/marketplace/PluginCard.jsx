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
          <IconComponent size={22} />
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
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: plugin.enabled ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                color: plugin.enabled ? 'var(--status-success)' : 'var(--text-muted)',
                border: plugin.enabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-default)',
                cursor: 'pointer'
              }}
            >
              {plugin.enabled ? 'Enabled' : 'Disabled'}
            </button>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
