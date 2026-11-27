/**
 * Agentic Harness — Dynamic Models Configuration
 * Models are sourced strictly from configured providers.
 * If no provider is configured, the available models list is empty.
 */

import { providerService } from '../services/providerService.js';

export function getAvailableModels() {
  return providerService.getAvailableModels();
}

export const AVAILABLE_MODELS = providerService.getAvailableModels();

export const DEFAULT_MODEL_ID = null;
