import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Shield, Settings, Info } from 'lucide-react';

export function PluginDetails({ plugin, isOpen, onClose, onSaveConfig }) {
  if (!plugin) return null;

  const [config, setConfig] = useState(() => ({ ...(plugin.config || {}) }));

  const handleSave = () => {
    onSaveConfig(plugin.id, config);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${plugin.name} — Settings`}
      id="plugin-details-modal"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 600 }}>
            {plugin.category} • v{plugin.version}
          </span>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {plugin.description}
          </p>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Published by <strong>{plugin.author}</strong>
          </div>
        </div>

        {/* Permissions Block */}
        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Shield size={14} color="var(--accent-emerald)" />
            Security Permissions
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            This plugin operates within the local sandboxed desktop environment and obeys context-isolation IPC rules.
          </p>
        </div>

        {/* Configuration Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Settings size={14} />
            Plugin Parameters
          </div>

          {Object.entries(config).map(([key, val]) => {
            const isBool = typeof val === 'boolean';
            const isArray = Array.isArray(val);

            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  flexDirection: isBool ? 'row' : 'column',
                  justifyContent: isBool ? 'space-between' : 'flex-start',
                  alignItems: isBool ? 'center' : 'stretch',
                  gap: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {key}
                </span>

                {isBool ? (
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                  />
                ) : (
                  <input
                    type="text"
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--bg-secondary)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-default)'
                    }}
                    value={isArray ? val.join(', ') : val}
                    onChange={(e) => {
                      const newV = isArray
                        ? e.target.value.split(',').map((s) => s.trim())
                        : e.target.value;
                      setConfig({ ...config, [key]: newV });
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Parameters
          </Button>
        </div>
      </div>
    </Modal>
  );
}
