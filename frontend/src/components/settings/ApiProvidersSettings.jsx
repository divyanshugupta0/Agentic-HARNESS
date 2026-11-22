import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Check,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  Cpu
} from 'lucide-react';
import { providerService, PROVIDER_TEMPLATES } from '../../services/providerService';
import { Button } from '../common/Button';

export function ApiProvidersSettings() {
  const [providers, setProviders] = useState(() => providerService.getConfiguredProviders());
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState('anthropic');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [customBaseURL, setCustomBaseURL] = useState('');
  const [customName, setCustomName] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [testResult, setTestResult] = useState(null); // { providerId, success, message, diagnostic }
  const [formError, setFormError] = useState('');

  useEffect(() => {
    return providerService.subscribe(() => {
      setProviders(providerService.getConfiguredProviders());
    });
  }, []);

  const activeTemplate = PROVIDER_TEMPLATES.find((t) => t.type === selectedTemplateType) || PROVIDER_TEMPLATES[0];

  const handleStartAdd = (templateType) => {
    setSelectedTemplateType(templateType || 'anthropic');
    const t = PROVIDER_TEMPLATES.find((x) => x.type === templateType) || PROVIDER_TEMPLATES[0];
    setCustomBaseURL(t.defaultBaseURL);
    setCustomName(t.name);
    setApiKeyInput('');
    setFormError('');
    setIsAdding(true);
  };

  const handleSaveProvider = (e) => {
    e.preventDefault();
    setFormError('');

    if (activeTemplate.requiresKey && (!apiKeyInput.trim() || apiKeyInput.trim().length < 8)) {
      setFormError('Please enter a valid API key for this provider.');
      return;
    }

    try {
      providerService.addOrUpdateProvider({
        type: activeTemplate.type,
        name: customName || activeTemplate.name,
        apiKey: apiKeyInput,
        baseURL: customBaseURL || activeTemplate.defaultBaseURL
      });
      setIsAdding(false);
      setApiKeyInput('');
      setTestResult({
        providerId: null,
        success: true,
        message: `${customName || activeTemplate.name} successfully connected.`
      });
    } catch (err) {
      setFormError(err.message || 'Failed to save provider configuration.');
    }
  };

  const handleTestConnection = async (providerId) => {
    setTestingId(providerId);
    setTestResult(null);
    try {
      const res = await providerService.testConnection(providerId);
      setTestResult({
        providerId,
        success: res.success,
        message: res.message || res.error?.message,
        diagnostic: res.error
      });
    } catch (err) {
      setTestResult({
        providerId,
        success: false,
        message: err.message || 'Connection test failed.'
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleRemoveProvider = (providerId) => {
    providerService.removeProvider(providerId);
    if (testResult?.providerId === providerId) {
      setTestResult(null);
    }
  };

  return (
    <div className="api-providers-settings">
      <div className="api-providers-settings__header">
        <div>
          <h2 className="api-providers-settings__title">API & AI Providers</h2>
          <p className="api-providers-settings__subtitle">
            Configure your AI providers and local model backends. API keys are stored locally on your desktop workstation and never sent to external servers.
          </p>
        </div>
        {!isAdding && (
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => handleStartAdd('anthropic')}
            id="add-provider-btn"
          >
            Add Provider
          </Button>
        )}
      </div>

      {testResult && !testResult.providerId && (
        <div className={`diagnostic-banner ${testResult.success ? 'diagnostic-banner--success' : 'diagnostic-banner--error'}`}>
          {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Add / Configure Provider Form */}
      {isAdding && (
        <div className="api-providers-settings__form-card">
          <div className="api-providers-settings__form-header">
            <h3 className="api-providers-settings__form-title">Connect AI Provider</h3>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setIsAdding(false)}
              title="Close"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSaveProvider} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {formError && (
              <div className="diagnostic-banner diagnostic-banner--error">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <div className="auth-form__group">
              <label className="auth-form__label">Select Provider</label>
              <select
                className="auth-form__input-wrapper"
                style={{ width: '100%', cursor: 'pointer' }}
                value={selectedTemplateType}
                onChange={(e) => {
                  const tType = e.target.value;
                  setSelectedTemplateType(tType);
                  const t = PROVIDER_TEMPLATES.find((x) => x.type === tType);
                  if (t) {
                    setCustomBaseURL(t.defaultBaseURL);
                    setCustomName(t.name);
                  }
                }}
              >
                {PROVIDER_TEMPLATES.map((tpl) => (
                  <option key={tpl.type} value={tpl.type}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="auth-form__group">
              <label className="auth-form__label">Display Name</label>
              <div className="auth-form__input-wrapper">
                <input
                  type="text"
                  className="auth-form__input"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Anthropic Production"
                  required
                />
              </div>
            </div>

            {activeTemplate.requiresKey && (
              <div className="auth-form__group">
                <label className="auth-form__label">API Key / Token</label>
                <div className="auth-form__input-wrapper">
                  <Key size={15} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    className="auth-form__input"
                    placeholder={activeTemplate.keyPlaceholder}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    required={activeTemplate.requiresKey}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? 'Hide' : 'Show'}
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div className="auth-form__group">
              <label className="auth-form__label">Base Endpoint URL</label>
              <div className="auth-form__input-wrapper">
                <input
                  type="url"
                  className="auth-form__input"
                  value={customBaseURL}
                  onChange={(e) => setCustomBaseURL(e.target.value)}
                  placeholder={activeTemplate.defaultBaseURL}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Connect Provider
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Connected Providers Section */}
      <div className="api-providers-settings__section">
        <h3 className="api-providers-settings__section-heading">
          Connected Providers ({providers.length})
        </h3>

        {providers.length === 0 ? (
          <div className="api-providers-settings__empty">
            <Shield size={28} style={{ color: 'var(--text-disabled)', marginBottom: '8px' }} />
            <p className="api-providers-settings__empty-title">No AI providers connected</p>
            <p className="api-providers-settings__empty-desc">
              Connect a commercial API or local Ollama daemon to activate autonomous agent execution and unlock model selection.
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => handleStartAdd('anthropic')}
              style={{ marginTop: '12px' }}
            >
              Connect First Provider
            </Button>
          </div>
        ) : (
          <div className="api-providers-settings__list">
            {providers.map((provider) => {
              const isTesting = testingId === provider.id;
              const hasTestResult = testResult?.providerId === provider.id;

              return (
                <div key={provider.id} className="api-provider-card">
                  <div className="api-provider-card__main">
                    <div className="api-provider-card__icon">
                      <Cpu size={18} />
                    </div>
                    <div className="api-provider-card__info">
                      <div className="api-provider-card__title-row">
                        <span className="api-provider-card__name">{provider.name}</span>
                        <span className="api-provider-card__status-badge">
                          <span className="api-provider-card__status-dot" />
                          Connected
                        </span>
                      </div>
                      <div className="api-provider-card__meta">
                        <span>{provider.baseURL}</span>
                        {provider.apiKey && (
                          <span>• Key: {providerService.maskApiKey(provider.apiKey)}</span>
                        )}
                        <span>• {provider.models?.length || 0} models</span>
                      </div>
                    </div>
                  </div>

                  <div className="api-provider-card__actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RefreshCw}
                      disabled={isTesting}
                      onClick={() => handleTestConnection(provider.id)}
                    >
                      {isTesting ? 'Verifying...' : 'Test Connection'}
                    </Button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleRemoveProvider(provider.id)}
                      title="Disconnect Provider"
                    >
                      <Trash2 size={14} style={{ color: 'var(--status-error)' }} />
                    </button>
                  </div>

                  {hasTestResult && (
                    <div className={`diagnostic-banner ${testResult.success ? 'diagnostic-banner--success' : 'diagnostic-banner--error'}`} style={{ width: '100%', marginTop: '10px' }}>
                      {testResult.success ? <Check size={15} /> : <AlertCircle size={15} />}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>{testResult.message}</span>
                        {testResult.diagnostic?.suggestion && (
                          <small style={{ opacity: 0.9 }}>{testResult.diagnostic.suggestion}</small>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available / Quick Connect Providers */}
      <div className="api-providers-settings__section">
        <h3 className="api-providers-settings__section-heading">Available Provider Integrations</h3>
        <div className="api-providers-settings__catalog">
          {PROVIDER_TEMPLATES.map((tpl) => {
            const isAlreadyConnected = providers.some((p) => p.type === tpl.type);

            return (
              <div key={tpl.type} className="api-provider-catalog-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="api-provider-catalog-card__name">{tpl.name}</span>
                  <p className="api-provider-catalog-card__desc">{tpl.description}</p>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {tpl.models.length} Models
                  </span>
                  {isAlreadyConnected ? (
                    <span style={{ fontSize: '11px', color: 'var(--status-success)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> Active
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartAdd(tpl.type)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
