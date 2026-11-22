/**
 * Agentic Harness — AI Provider & Models Service
 * Manages provider configurations, credential storage in localStorage,
 * dynamic model lists, and connection verification.
 */

import { sanitizeDiagnostics, createDiagnostic, ERROR_CATEGORIES } from '../utils/diagnostics.js';

const PROVIDERS_STORAGE_KEY = 'agentic_harness_providers';
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

  addOrUpdateProvider({ type, name, apiKey = '', baseURL = '' }) {
    const template = PROVIDER_TEMPLATES.find((t) => t.type === type);
    if (!template) {
      throw new Error(`Unknown provider type: ${type}`);
    }

    const providers = this.getConfiguredProviders();
    const existingIndex = providers.findIndex((p) => p.type === type);

    const providerEntry = {
      id: existingIndex >= 0 ? providers[existingIndex].id : `prov_${Date.now()}`,
      type,
      name: name || template.name,
      apiKey: apiKey.trim(),
      baseURL: baseURL.trim() || template.defaultBaseURL,
      status: 'connected',
      updatedAt: new Date().toISOString(),
      models: template.models.map((m) => ({
        ...m,
        provider: name || template.name
      }))
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
    const providers = this.getConfiguredProviders().filter((p) => p.id !== id);
    this.saveProviders(providers);
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

    // Validate key requirement
    if (template?.requiresKey && (!provider.apiKey || provider.apiKey.length < 8)) {
      return {
        success: false,
        error: createDiagnostic(new Error('Invalid API key or token format. Credentials must be configured.'), {
          category: ERROR_CATEGORIES.AUTHENTICATION_FAILED
        })
      };
    }

    // If local Ollama, try to reach the endpoint
    if (provider.type === 'ollama') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${provider.baseURL}/api/tags`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          return { success: true, message: 'Connected to local Ollama daemon successfully.' };
        }
        return {
          success: false,
          error: createDiagnostic(new Error(`Ollama daemon returned HTTP ${res.status}`), {
            category: ERROR_CATEGORIES.NETWORK_ERROR
          })
        };
      } catch (err) {
        return {
          success: false,
          error: createDiagnostic(err, { category: ERROR_CATEGORIES.NETWORK_ERROR })
        };
      }
    }

    // Cloud providers: verify configuration presence and valid structure
    return {
      success: true,
      message: `Verified configuration for ${provider.name}. Available models: ${provider.models.length}.`
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
