/**
 * Automated Verification Suite for Agentic Harness Enhancements
 * Tests:
 * 1. Provider Service & dynamic model resolution
 * 2. Diagnostic categorization & secret sanitization
 * 3. Chat Service authentic zero-state and unconfigured provider blocking
 * 4. Settings categories data structure
 * 5. Marketplace sub-navigation tabs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// In-memory mock for localStorage in Node test runner
const memoryStore = {};
globalThis.localStorage = {
  getItem: (key) => memoryStore[key] || null,
  setItem: (key, val) => { memoryStore[key] = String(val); },
  removeItem: (key) => { delete memoryStore[key]; },
  clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); }
};

import { providerService, PROVIDER_TEMPLATES } from '../services/providerService.js';
import { sanitizeDiagnostics, createDiagnostic, ERROR_CATEGORIES } from '../utils/diagnostics.js';
import { chatService } from '../services/chatService.js';
import { SETTINGS_CATEGORIES, MARKETPLACE_TABS } from '../constants/navigation.js';

test('Provider Service: starts in clean zero-provider state', () => {
  localStorage.clear();
  assert.equal(providerService.hasConfiguredProvider(), false);
  assert.deepEqual(providerService.getConfiguredProviders(), []);
  assert.deepEqual(providerService.getAvailableModels(), []);
});

test('Provider Service: adding a provider dynamically resolves genuine models', () => {
  localStorage.clear();
  const added = providerService.addOrUpdateProvider({
    type: 'anthropic',
    name: 'Anthropic Production',
    apiKey: 'sk-ant-api03-1234567890abcdef1234',
    baseURL: 'https://api.anthropic.com/v1'
  });

  assert.equal(providerService.hasConfiguredProvider(), true);
  assert.equal(added.name, 'Anthropic Production');

  const models = providerService.getAvailableModels();
  assert.ok(models.length > 0);
  assert.ok(models.some((m) => m.id === 'claude-3-7-sonnet'));

  // Disconnecting provider removes models
  providerService.removeProvider(added.id);
  assert.equal(providerService.hasConfiguredProvider(), false);
  assert.deepEqual(providerService.getAvailableModels(), []);
});

test('Provider Service: masks API keys without exposing secrets', () => {
  const masked = providerService.maskApiKey('sk-ant-api03-abcdef12345678');
  assert.ok(!masked.includes('api03-abcdef'));
  assert.ok(masked.startsWith('sk-a'));
  assert.ok(masked.endsWith('5678'));
});

test('Diagnostics: sanitizes secret tokens from technical error traces', () => {
  const rawError = 'Failed to connect with key sk-ant-api03-abcdef12345678901234 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const clean = sanitizeDiagnostics(rawError);
  assert.ok(!clean.includes('sk-ant-api03'));
  assert.ok(clean.includes('sk-***[REDACTED]'));
  assert.ok(clean.includes('Bearer ***[REDACTED]'));
});

test('Diagnostics: correctly identifies provider not configured error', () => {
  const diag = createDiagnostic(new Error('No provider active'), { hasProvider: false });
  assert.equal(diag.category, ERROR_CATEGORIES.PROVIDER_NOT_CONFIGURED);
  assert.equal(diag.title, 'Provider Not Configured');
  assert.ok(diag.suggestion.includes('Open Settings → API & Providers'));
});

test('Diagnostics: correctly identifies authentication failure', () => {
  const diag = createDiagnostic(new Error('HTTP 401: Invalid API key provided'), { hasProvider: true });
  assert.equal(diag.category, ERROR_CATEGORIES.AUTHENTICATION_FAILED);
  assert.equal(diag.title, 'Authentication Failed');
});

test('Chat Service: starts with zero fabricated conversations', () => {
  localStorage.clear();
  const convs = chatService.loadConversations();
  assert.deepEqual(convs, []);
});

test('Chat Service: blocks message dispatch when no provider is configured', async () => {
  localStorage.clear();
  const assistantMsg = await chatService.sendMessage('Test goal without provider');
  assert.equal(assistantMsg.isError, true);
  assert.equal(assistantMsg.diagnostic.category, ERROR_CATEGORIES.PROVIDER_NOT_CONFIGURED);
  assert.ok(assistantMsg.content.includes('Provider Not ConfigURED') || assistantMsg.content.includes('Provider Not Configured'));
  // Ensure no fake execution steps were created
  assert.deepEqual(assistantMsg.executionSteps || [], []);
});

test('Settings Categories: includes all 5 requested categories', () => {
  const ids = SETTINGS_CATEGORIES.map((c) => c.id);
  assert.ok(ids.includes('general'));
  assert.ok(ids.includes('providers'));
  assert.ok(ids.includes('models'));
  assert.ok(ids.includes('appearance'));
  assert.ok(ids.includes('privacy'));
});

test('Marketplace Sub-Navigation: includes Plugins, Skills, and Extensions', () => {
  assert.equal(MARKETPLACE_TABS.PLUGINS, 'plugins');
  assert.equal(MARKETPLACE_TABS.SKILLS, 'skills');
  assert.equal(MARKETPLACE_TABS.EXTENSIONS, 'extensions');
});
