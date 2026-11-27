/**
 * Agentic Harness — AI Provider & Models Service
 * Manages provider configurations, credential storage in localStorage,
 * dynamic model lists, and connection verification.
 */

import { sanitizeDiagnostics, createDiagnostic, ERROR_CATEGORIES } from '../utils/diagnostics.js';

const API_BASE_URL = (import.meta?.env?.VITE_AUTH_API_URL || 'http://localhost:3002').replace(/\/$/, '');
const PROVIDERS_STORAGE_KEY = 'agentic_harness_providers';
const PROVIDER_KEY_PREFIX = 'agentic_harness_provider_key_';
const ACTIVE_PROVIDER_KEY = 'agentic_harness_active_provider';

export const PROVIDER_TEMPLATES = [
  {
    type: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku',
    requiresKey: true,
    keyPlaceholder: 'sk-ant-api03-...',
    defaultBaseURL: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', context: '200k', tag: 'Hybrid Reasoning' },
      { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', context: '200k', tag: 'Coding & Analysis' },
      { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', context: '200k', tag: 'High Speed' }
    ]
  },
  {
    type: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o Mini, and o-series reasoning models',
    requiresKey: true,
    keyPlaceholder: 'sk-proj-...',
    defaultBaseURL: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o Omni', context: '128k', tag: 'Multimodal' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: '128k', tag: 'Fast & Lightweight' },
      { id: 'o1', name: 'OpenAI o1', context: '128k', tag: 'Deep Reasoning' },
      { id: 'o3-mini', name: 'OpenAI o3-mini', context: '128k', tag: 'STEM Reasoning' }
    ]
  },
  {
    type: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek R1 reasoning and DeepSeek V3 general chat models',
    requiresKey: true,
    keyPlaceholder: 'sk-...',
    defaultBaseURL: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-r1', name: 'DeepSeek R1', context: '128k', tag: 'Open Reasoning' },
      { id: 'deepseek-chat', name: 'DeepSeek V3', context: '128k', tag: 'General Intelligence' }
    ]
  },
  {
    type: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.5 Pro and Gemini 2.0 Flash models',
    requiresKey: true,
    keyPlaceholder: 'AIzaSy...',
    defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: '1M', tag: 'Deep Multimodal' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context: '1M', tag: 'Realtime Agentic' }
    ]
  },
  {
    type: 'ollama',
    name: 'Ollama (Local Machine)',
    description: 'Locally running open models on your workstation with zero telemetry',
    requiresKey: false,
    keyPlaceholder: 'Not required for local daemon',
    defaultBaseURL: 'http://localhost:11434',
    models: [
      { id: 'llama3.3:70b', name: 'Llama 3.3 70B (Ollama)', context: '64k', tag: 'Private Local' },
      { id: 'deepseek-r1:14b', name: 'DeepSeek R1 14B (Ollama)', context: '32k', tag: 'Local Reasoning' },
      { id: 'qwen2.5-coder:32b', name: 'Qwen 2.5 Coder (Ollama)', context: '32k', tag: 'Local Coding' }
    ]
  },
  {
    type: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified API routing to 100+ commercial and open models',
    requiresKey: true,
    keyPlaceholder: 'sk-or-v1-...',
    defaultBaseURL: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (Router)', context: '200k', tag: 'Unified' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Router)', context: '128k', tag: 'Unified' },
      { id: 'openai/gpt-4o', name: 'GPT-4o (Router)', context: '128k', tag: 'Unified' }
    ]
  },
  {
    type: 'groq',
    name: 'Groq Cloud',
    description: 'Ultra high-speed LPU inference for open-weight models',
    requiresKey: true,
    keyPlaceholder: 'gsk_...',
    defaultBaseURL: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', context: '128k', tag: 'Ultra Fast' }
    ]
  },
  {
    type: 'custom',
    name: 'Custom Provider',
    description: 'Connect any OpenAI-compatible endpoint (vLLM, LM Studio, LiteLLM, Azure, self-hosted)',
    requiresKey: false,
    isCustom: true,
    keyPlaceholder: 'Optional API key / bearer token',
    defaultBaseURL: 'http://localhost:8000/v1',
    models: []
  }
];

class ProviderService {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error notifying provider listener:', err);
      }
    });
  }

  getTemplates() {
    return PROVIDER_TEMPLATES;
  }

  getConfiguredProviders() {
    try {
      if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return [];
      const stored = localStorage.getItem(PROVIDERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse configured providers:', e);
    }
    return [];
  }

  hasConfiguredProvider() {
    return this.getConfiguredProviders().length > 0;
  }

  getProviderById(id) {
    return this.getConfiguredProviders().find((p) => p.id === id) || null;
  }

  getApiKey(providerId) {
    if (!providerId) return '';
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const isolated = localStorage.getItem(`${PROVIDER_KEY_PREFIX}${providerId}`);
        if (isolated !== null) return isolated;
      }
    } catch (_) {}
    return this.getProviderById(providerId)?.apiKey || '';
  }

  setApiKey(providerId, apiKey) {
    if (!providerId) return;
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        if (apiKey) {
          localStorage.setItem(`${PROVIDER_KEY_PREFIX}${providerId}`, apiKey);
        } else {
          localStorage.removeItem(`${PROVIDER_KEY_PREFIX}${providerId}`);
        }
      }
    } catch (_) {}
  }

  setActiveTarget({ providerId, modelId }) {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(ACTIVE_PROVIDER_KEY, JSON.stringify({ providerId, modelId }));
      }
      this.notify();
    } catch (_) {}
  }

  getActiveTarget(fallbackModelId = null) {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const raw = localStorage.getItem(ACTIVE_PROVIDER_KEY);
        if (raw) {
          const { providerId, modelId } = JSON.parse(raw);
          const provider = this.getProviderById(providerId);
          if (provider && provider.status !== 'error') {
            const targetModelId = fallbackModelId || modelId;
            const matchedModel = (provider.models || []).find((m) => m.id === targetModelId);
            if (matchedModel) {
              return {
                provider,
                apiKey: this.getApiKey(provider.id),
                model: matchedModel
              };
            }
          }
        }
      }
    } catch (_) {}
    return this.getProviderForModel(fallbackModelId);
  }

  getProviderForModel(modelId) {
    const providers = this.getConfiguredProviders().filter((p) => p.status !== 'error');
    if (!providers.length) return null;

    if (modelId) {
      for (const prov of providers) {
        const matchedModel = (prov.models || []).find((m) => m.id === modelId);
        if (matchedModel) {
          return {
            provider: prov,
            apiKey: this.getApiKey(prov.id),
            model: matchedModel
          };
        }
      }
      return null;
    }

    const first = providers[0];
    return {
      provider: first,
      apiKey: this.getApiKey(first.id),
      model: first.models?.[0] || null
    };
  }

  saveProviders(providers) {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
      }
      this.notify();
    } catch (e) {
      console.error('Failed to save providers to storage:', e);
    }
  }

  addOrUpdateProvider({ id = null, type, name, apiKey = '', baseURL = '', customModels = '' }) {
    const template = PROVIDER_TEMPLATES.find((t) => t.type === type);
    if (!template) {
      throw new Error(`Unknown provider type: ${type}`);
    }

    const providers = this.getConfiguredProviders();
    const displayName = (name || template.name).trim();
    const existingIndex = id
      ? providers.findIndex((p) => p.id === id)
      : type === 'custom'
      ? providers.findIndex((p) => p.type === 'custom' && p.name.toLowerCase() === displayName.toLowerCase())
      : providers.findIndex((p) => p.type === type);

    const parsedCustomIds = String(customModels || '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const customModelEntries = parsedCustomIds.map((modelId) => ({
      id: modelId,
      name: modelId,
      context: 'Custom',
      tag: modelId.endsWith(':free') ? 'Free' : 'Custom',
      provider: displayName
    }));

    let resolvedModels;
    if (type === 'custom') {
      resolvedModels = customModelEntries.length
        ? customModelEntries
        : [{ id: 'custom-model', name: 'custom-model', context: 'Custom', tag: 'Custom', provider: displayName }];
    } else {
      const templateModels = template.models.map((m) => ({
        ...m,
        provider: displayName
      }));
      const seen = new Set(customModelEntries.map((m) => m.id));
      resolvedModels = [...customModelEntries, ...templateModels.filter((m) => !seen.has(m.id))];
    }

    const providerId = existingIndex >= 0 ? providers[existingIndex].id : `prov_${Date.now()}`;
    const trimmedKey = apiKey.trim();
    this.setApiKey(providerId, trimmedKey);

    const providerEntry = {
      id: providerId,
      type,
      name: displayName,
      apiKey: trimmedKey,
      baseURL: baseURL.trim() || template.defaultBaseURL,
      customModelIds: parsedCustomIds,
      status: 'connected',
      updatedAt: new Date().toISOString(),
      models: resolvedModels
    };

    if (existingIndex >= 0) {
      providers[existingIndex] = providerEntry;
    } else {
      providers.push(providerEntry);
    }

    this.saveProviders(providers);
    return providerEntry;
  }

  removeProvider(id) {
    this.setApiKey(id, '');
    const providers = this.getConfiguredProviders().filter((p) => p.id !== id);
    this.saveProviders(providers);
  }

  async fetchAndSyncModels(providerId) {
    const provider = this.getProviderById(providerId);
    if (!provider) {
      return { success: false, error: 'Provider not found', models: [] };
    }

    const apiKey = this.getApiKey(provider.id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: {
            type: provider.type,
            name: provider.name,
            baseURL: provider.baseURL,
            apiKey
          }
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        return {
          success: false,
          error: payload.error || `HTTP ${response.status}`,
          models: provider.models || []
        };
      }

      const liveModels = Array.isArray(payload.models) ? payload.models : [];
      if (liveModels.length > 0) {
        const providers = this.getConfiguredProviders();
        const idx = providers.findIndex((p) => p.id === provider.id);
        if (idx >= 0) {
          const customEntries = (providers[idx].customModelIds || []).map((modelId) => ({
            id: modelId,
            name: modelId,
            context: 'Custom',
            tag: modelId.endsWith(':free') ? 'Free' : 'Custom',
            provider: providers[idx].name
          }));
          const seen = new Set(customEntries.map((m) => m.id));
          providers[idx] = {
            ...providers[idx],
            models: [...customEntries, ...liveModels.filter((m) => !seen.has(m.id))],
            updatedAt: new Date().toISOString()
          };
          this.saveProviders(providers);
        }
      }

      return { success: true, models: liveModels };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network error while fetching models',
        models: provider.models || []
      };
    }
  }

  async testConnection(providerId) {
    const provider = this.getProviderById(providerId);
    if (!provider) {
      return {
        success: false,
        error: createDiagnostic(new Error('Provider configuration not found.'), {
          category: ERROR_CATEGORIES.MISSING_CONFIGURATION
        })
      };
    }

    const template = PROVIDER_TEMPLATES.find((t) => t.type === provider.type);
    const apiKey = this.getApiKey(provider.id);

    if (template?.requiresKey && (!apiKey || apiKey.length < 8)) {
      return {
        success: false,
        error: createDiagnostic(new Error('Invalid API key or token format. Credentials must be configured.'), {
          category: ERROR_CATEGORIES.AUTHENTICATION_FAILED
        })
      };
    }

    const syncRes = await this.fetchAndSyncModels(provider.id);
    if (!syncRes.success) {
      return {
        success: false,
        error: createDiagnostic(new Error(syncRes.error), {
          category: ERROR_CATEGORIES.NETWORK_ERROR
        })
      };
    }

    return {
      success: true,
      message: `Verified ${provider.name}. Synced ${syncRes.models.length} live models.`
    };
  }

  /**
   * Returns genuinely available models from configured providers.
   * If no provider is configured, returns [].
   */
  getAvailableModels() {
    const providers = this.getConfiguredProviders();
    if (!providers.length) return [];

    const models = [];
    providers.forEach((prov) => {
      if (prov.status !== 'error' && Array.isArray(prov.models)) {
        models.push(...prov.models);
      }
    });

    return models;
  }

  maskApiKey(key) {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    const first = key.slice(0, 4);
    const last = key.slice(-4);
    return `${first}••••${last}`;
  }
}

export const providerService = new ProviderService();
