/**
 * Agentic Harness — Error Diagnostic & Sanitization Utilities
 * Provides sanitized, human-readable diagnostics with suggested resolutions.
 */

export const ERROR_CATEGORIES = {
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  TOOL_EXECUTION_FAILURE: 'TOOL_EXECUTION_FAILURE',
  MISSING_CONFIGURATION: 'MISSING_CONFIGURATION',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Strips secret tokens, API keys, and sensitive environment variables from logs
 */
export function sanitizeDiagnostics(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***[REDACTED]')
    .replace(/bearer\s+[a-zA-Z0-9._-]{20,}/gi, 'Bearer ***[REDACTED]')
    .replace(/(api[_-]?key[:=]\s*["']?)[a-zA-Z0-9_-]{8,}(["']?)/gi, '$1***[REDACTED]$2')
    .replace(/(password[:=]\s*["']?)[^"'\s]{4,}(["']?)/gi, '$1***[REDACTED]$2');
}

/**
 * Classifies an error into a standardized diagnostic object
 */
export function createDiagnostic(error, context = {}) {
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const cleanMessage = sanitizeDiagnostics(rawMessage);

  if (context.category === ERROR_CATEGORIES.PROVIDER_NOT_CONFIGURED || !context.hasProvider) {
    return {
      category: ERROR_CATEGORIES.PROVIDER_NOT_CONFIGURED,
      title: 'Provider Not Configured',
      message: 'Connect an AI provider to start using agent execution.',
      suggestion: 'Open Settings → API & Providers to configure an API key for OpenAI, Anthropic, Ollama, or DeepSeek.',
      actionLabel: 'Configure Provider',
      actionKey: 'open-providers-settings',
      technicalDetails: cleanMessage || 'No active AI provider detected in workspace settings.'
    };
  }

  if (/unauthorized|401|invalid\s*api\s*key|authentication\s*failed/i.test(cleanMessage)) {
    return {
      category: ERROR_CATEGORIES.AUTHENTICATION_FAILED,
      title: 'Authentication Failed',
      message: 'Authentication failed. Check your provider credentials and try again.',
      suggestion: 'Verify that your API key is active and has sufficient billing credits or permissions.',
      actionLabel: 'Check Provider Settings',
      actionKey: 'open-providers-settings',
      technicalDetails: cleanMessage
    };
  }

  if (/network|fetch\s*failed|econnrefused|failed\s*to\s*fetch|timeout/i.test(cleanMessage)) {
    return {
      category: ERROR_CATEGORIES.NETWORK_ERROR,
      title: 'Network Connection Error',
      message: 'Unable to reach the selected provider. Check your network connection.',
      suggestion: 'If using a local model (Ollama), ensure the local daemon is running on http://localhost:11434.',
      actionLabel: 'Retry Connection',
      actionKey: 'retry',
      technicalDetails: cleanMessage
    };
  }

  if (/model.*not.*found|model.*unavailable|unsupported\s*model|does\s*not\s*exist/i.test(cleanMessage)) {
    return {
      category: ERROR_CATEGORIES.MODEL_UNAVAILABLE,
      title: 'Model Unavailable',
      message: 'The selected model is unavailable or not supported by this provider.',
      suggestion: 'Select another model from the model switcher or refresh the model list in Settings.',
      actionLabel: 'Switch Model',
      actionKey: 'switch-model',
      technicalDetails: cleanMessage
    };
  }

  if (/tool|sandbox|permission|fsTool|shellTool/i.test(cleanMessage)) {
    return {
      category: ERROR_CATEGORIES.TOOL_EXECUTION_FAILURE,
      title: 'Tool Execution Failure',
      message: 'The requested tool could not complete the operation. Review the execution details.',
      suggestion: 'Check file path permissions and ensure the operation conforms to local sandboxing rules.',
      actionLabel: 'Review Details',
      actionKey: 'expand-details',
      technicalDetails: cleanMessage
    };
  }

  return {
    category: ERROR_CATEGORIES.UNKNOWN,
    title: 'Execution Notice',
    message: cleanMessage || 'An unexpected issue occurred during execution.',
    suggestion: 'Review the technical log details below or re-run the task.',
    actionLabel: 'Retry',
    actionKey: 'retry',
    technicalDetails: cleanMessage
  };
}
