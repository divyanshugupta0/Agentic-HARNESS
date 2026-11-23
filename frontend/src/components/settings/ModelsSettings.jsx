import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Check } from 'lucide-react';
import { providerService } from '../../services/providerService';
import { Button } from '../common/Button';

export function ModelsSettings({ onNavigateToProviders }) {
  const [models, setModels] = useState(() => providerService.getAvailableModels());
  const [providers, setProviders] = useState(() => providerService.getConfiguredProviders());

  useEffect(() => {
    return providerService.subscribe(() => {
      setModels(providerService.getAvailableModels());
      setProviders(providerService.getConfiguredProviders());
    });
  }, []);

  return (
    <div className="appearance-settings">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <h2 className="appearance-settings__title">AI Foundation Models</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Active models dynamically resolved from your connected AI providers.
          </p>
        </div>
        {onNavigateToProviders && (
          <Button variant="secondary" size="sm" icon={Plus} onClick={onNavigateToProviders}>
            Add Provider
          </Button>
        )}
      </div>

      {models.length === 0 ? (
        <div className="api-providers-settings__empty">
          <Cpu size={28} style={{ color: 'var(--text-disabled)', marginBottom: '8px' }} />
          <p className="api-providers-settings__empty-title">No models available</p>
          <p className="api-providers-settings__empty-desc">
            Your workspace is not connected to an AI provider yet. Connect a provider to unlock models.
          </p>
          {onNavigateToProviders && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={onNavigateToProviders}
              style={{ marginTop: '12px' }}
            >
              Configure AI Provider
            </Button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          {models.map((model) => (
            <div
              key={model.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                  {model.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Provider: {model.provider} • Context Window: {model.context}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {model.tag || 'Available'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
