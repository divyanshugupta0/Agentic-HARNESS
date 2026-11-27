/**
 * Agentic Harness - Guardrails Security & Policy Engine
 * Provides pre-execution and post-execution guardrails for prompts, tools,
 * shell commands, file paths, and output data sanitation.
 */

const path = require('path');

// Violation types
const ViolationType = {
  PROMPT_INPUT: 'PROMPT_INPUT',
  PROMPT_INJECTION: 'PROMPT_INJECTION',
  SENSITIVE_DATA_LEAK: 'SENSITIVE_DATA_LEAK',
  COMMAND_INJECTION: 'COMMAND_INJECTION',
  UNSAFE_COMMAND: 'UNSAFE_COMMAND',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  UNAUTHORIZED_TOOL: 'UNAUTHORIZED_TOOL',
  RESOURCE_LIMIT: 'RESOURCE_LIMIT',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
  SELF_TERMINATION: 'SELF_TERMINATION'
};

// Severity levels
const Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Custom Error for Guardrail Violations
 */
class GuardrailViolation extends Error {
  constructor(message, violation) {
    super(message);
    this.name = 'GuardrailViolation';
    this.type = violation?.type || ViolationType.POLICY_VIOLATION;
    this.severity = violation?.severity || Severity.HIGH;
    this.rule = violation?.rule || 'unspecified';
    this.target = violation?.target || null;
    this.timestamp = violation?.timestamp || new Date().toISOString();
  }
}

// Known prompt injection and jailbreak signatures
const PROMPT_INJECTION_PATTERNS = [
  {
    regex: /(?:ignore|disregard|forget|bypass|override)\s+(?:all\s+)?(?:previous|prior|system|initial|above)\s+(?:instructions|prompts|rules|commands|directives)/i,
    name: 'instruction_override',
    severity: Severity.CRITICAL
  },
  {
    regex: /(?:reveal|show|print|dump|output|repeat)\s+(?:your\s+)?(?:system\s+prompt|initial\s+prompt|core\s+directives|hidden\s+instructions)/i,
    name: 'system_prompt_leak',
    severity: Severity.HIGH
  },
  {
    regex: /(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(?:DAN|jailbreak|unrestricted|godmode|root|an\s+unfiltered\s+AI)/i,
    name: 'jailbreak_persona',
    severity: Severity.CRITICAL
  },
  {
    regex: /developer\s+mode\s+(?:is\s+)?(?:enabled|on|activated)|enter\s+developer\s+mode/i,
    name: 'developer_mode_exploit',
    severity: Severity.HIGH
  },
  {
    regex: /\[(?:system|instruction|system_message|developer)\]/i,
    name: 'delimiter_hijack',
    severity: Severity.MEDIUM
  }
];

// Dangerous shell commands and patterns
const DANGEROUS_COMMAND_PATTERNS = [
  {
    regex: /\brm\s+-(?:[a-zA-Z]*r[a-zA-Z]*f|[a-zA-Z]*f[a-zA-Z]*r)\s+[/~]/i,
    name: 'root_filesystem_deletion',
    severity: Severity.CRITICAL
  },
  {
    regex: /\brd\s+\/s\s+\/q\s+[c-zC-Z]:\\/i,
    name: 'windows_root_deletion',
    severity: Severity.CRITICAL
  },
  {
    regex: /\bdel\s+\/[fF]\s+\/[sS]\s+\/[qQ]\s+[c-zC-Z]:\\/i,
    name: 'windows_mass_deletion',
    severity: Severity.CRITICAL
  },
  {
    regex: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
    name: 'bash_fork_bomb',
    severity: Severity.CRITICAL
  },
  {
    regex: /\b(?:mkfs|fdisk|dd\s+if=.*of=\/dev\/)/i,
    name: 'disk_formatting_or_raw_write',
    severity: Severity.CRITICAL
  },
  {
    regex: /(?:curl|wget)\s+[^|;]+(?:\|\s*(?:bash|sh|zsh|python|perl|powershell)|>\s*\/etc\/)/i,
    name: 'untrusted_remote_execution_pipe',
    severity: Severity.CRITICAL
  },
  {
    regex: /\b(?:shutdown|reboot|init\s+0|halt)\b/i,
    name: 'system_shutdown',
    severity: Severity.HIGH
  },
  {
    regex: /(?:\/etc\/shadow|\/etc\/passwd|SYSTEM32\\config\\SAM)/i,
    name: 'credential_database_access',
    severity: Severity.CRITICAL
  }
];

// Sensitive information patterns (secrets, credentials, PII)
const SENSITIVE_PATTERNS = [
  {
    regex: /sk-[a-zA-Z0-9_-]{20,}/g,
    name: 'openai_api_key',
    replacement: '[REDACTED_API_KEY]',
    severity: Severity.CRITICAL
  },
  {
    regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g,
    name: 'github_token',
    replacement: '[REDACTED_GITHUB_TOKEN]',
    severity: Severity.CRITICAL
  },
  {
    regex: /AKIA[0-9A-Z]{16}/g,
    name: 'aws_access_key',
    replacement: '[REDACTED_AWS_KEY]',
    severity: Severity.CRITICAL
  },
  {
    regex: /Bearer\s+([a-zA-Z0-9_\-\.]{25,})/gi,
    name: 'bearer_token',
    replacement: 'Bearer [REDACTED_TOKEN]',
    severity: Severity.HIGH
  },
  {
    regex: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/g,
    name: 'private_key',
    replacement: '[REDACTED_PRIVATE_KEY]',
    severity: Severity.CRITICAL
  },
  {
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    name: 'us_ssn',
    replacement: '[REDACTED_SSN]',
    severity: Severity.HIGH
  },
  {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    name: 'email_address',
    replacement: '[REDACTED_EMAIL]',
    severity: Severity.LOW
  }
];

/**
 * Validate input prompt against injection attacks and size limits
 * @param {string} prompt - Raw input prompt
 * @param {Object} options - Configuration options
 * @returns {Object} { allowed: boolean, violations: Array }
 */
function validatePrompt(prompt, options = {}) {
  const { maxPromptLength = 32000, throwOnError = false } = options;
  const violations = [];

  if (typeof prompt !== 'string') {
    violations.push({
      type: ViolationType.PROMPT_INPUT,
      severity: Severity.HIGH,
      rule: 'prompt_type_check',
      message: 'Prompt must be a string'
    });
  } else {
    // Length check
    if (prompt.length > maxPromptLength) {
      violations.push({
        type: ViolationType.RESOURCE_LIMIT,
        severity: Severity.MEDIUM,
        rule: 'max_length',
        message: `Prompt length (${prompt.length}) exceeds maximum allowable limit (${maxPromptLength})`
      });
    }

    // Pattern checks
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.regex.test(prompt)) {
        violations.push({
          type: ViolationType.PROMPT_INJECTION,
          severity: pattern.severity,
          rule: pattern.name,
          message: `Detected potential prompt injection/jailbreak pattern: ${pattern.name}`,
          target: prompt.slice(0, 80)
        });
      }
    }
  }

  const allowed = violations.length === 0;

  if (!allowed && throwOnError) {
    const primary = violations[0];
    throw new GuardrailViolation(primary.message, primary);
  }

  return { allowed, violations };
}

/**
 * Validate shell command against security blacklists and allowlists
 * @param {string} command - Shell command to inspect
 * @param {Array<string>} [allowlist] - Optional permitted binary allowlist
 * @param {Object} [options] - Configuration options
 * @returns {Object} { allowed: boolean, violations: Array }
 */
function validateCommand(command, allowlist = null, options = {}) {
  const { throwOnError = false } = options;
  const violations = [];

  if (!command || typeof command !== 'string') {
    violations.push({
      type: ViolationType.UNSAFE_COMMAND,
      severity: Severity.HIGH,
      rule: 'invalid_command',
      message: 'Command must be a non-empty string'
    });
    if (throwOnError) throw new GuardrailViolation('Invalid command', violations[0]);
    return { allowed: false, violations };
  }

  const trimmed = command.trim();

  // Check dangerous patterns
  for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      violations.push({
        type: ViolationType.UNSAFE_COMMAND,
        severity: pattern.severity,
        rule: pattern.name,
        message: `Dangerous command pattern detected: ${pattern.name}`,
        target: trimmed
      });
    }
  }

  // Self-termination protection: Prevent agent from killing its own application process
  const currentPid = process.pid;
  const ppid = process.ppid;
  const selfKillRegex = new RegExp(`\\b(?:kill|taskkill|pkill|killall|Stop-Process)\\b.*?(?:\\b(?:${currentPid}|${ppid})\\b|electron|agentic-harness)`, 'i');
  if (selfKillRegex.test(trimmed)) {
    violations.push({
      type: ViolationType.SELF_TERMINATION,
      severity: Severity.CRITICAL,
      rule: 'self_termination_prevented',
      message: `Security Exception: Prohibited from terminating the agent's host application process (PID: ${currentPid})`,
      target: trimmed
    });
  }

  // Check allowlist if provided
  if (Array.isArray(allowlist) && allowlist.length > 0) {
    const binary = trimmed.split(/[\s;&|]+/)[0].toLowerCase();
    const cleanBinary = path.basename(binary).replace(/\.(exe|cmd|bat|sh)$/i, '');
    const isAllowed = allowlist.some(allowed => {
      const cleanAllowed = allowed.toLowerCase().replace(/\.(exe|cmd|bat|sh)$/i, '');
      return cleanBinary === cleanAllowed || binary === allowed.toLowerCase();
    });

    if (!isAllowed) {
      violations.push({
        type: ViolationType.UNAUTHORIZED_TOOL,
        severity: Severity.HIGH,
        rule: 'allowlist_violation',
        message: `Command binary "${cleanBinary}" is not in the approved allowlist [${allowlist.join(', ')}]`,
        target: trimmed
      });
    }
  }

  const allowed = violations.length === 0;

  if (!allowed && throwOnError) {
    const primary = violations[0];
    throw new GuardrailViolation(primary.message, primary);
  }

  return { allowed, violations };
}

/**
 * Validate file path to prevent directory traversal
 * @param {string} targetPath - Path being accessed
 * @param {string} [baseDir] - Workspace root directory constraint
 * @param {Object} [options] - Configuration options
 * @returns {Object} { allowed: boolean, violations: Array, resolvedPath: string }
 */
function validateFilePath(targetPath, baseDir = null, options = {}) {
  const { throwOnError = false } = options;
  const violations = [];

  if (!targetPath || typeof targetPath !== 'string') {
    violations.push({
      type: ViolationType.PATH_TRAVERSAL,
      severity: Severity.HIGH,
      rule: 'invalid_path',
      message: 'File path must be a non-empty string'
    });
    if (throwOnError) throw new GuardrailViolation('Invalid path', violations[0]);
    return { allowed: false, violations, resolvedPath: null };
  }

  // Null byte injection check
  if (targetPath.indexOf('\0') !== -1 || targetPath.includes('%00')) {
    violations.push({
      type: ViolationType.PATH_TRAVERSAL,
      severity: Severity.CRITICAL,
      rule: 'null_byte_injection',
      message: 'Path contains prohibited null-byte characters',
      target: targetPath
    });
  }

  const resolved = baseDir
    ? path.resolve(baseDir, targetPath)
    : path.resolve(targetPath);

  // If base directory is enforced, ensure resolved path stays within bounds
  if (baseDir) {
    const resolvedBase = path.resolve(baseDir);
    const relative = path.relative(resolvedBase, resolved);
    const isOutside = relative.startsWith('..') || path.isAbsolute(relative);

    if (isOutside) {
      violations.push({
        type: ViolationType.PATH_TRAVERSAL,
        severity: Severity.CRITICAL,
        rule: 'path_traversal_escape',
        message: `Path escapes the authorized base directory: "${baseDir}"`,
        target: targetPath
      });
    }
  }

  const allowed = violations.length === 0;

  if (!allowed && throwOnError) {
    const primary = violations[0];
    throw new GuardrailViolation(primary.message, primary);
  }

  return { allowed, violations, resolvedPath: resolved };
}

/**
 * Validate tool execution permission
 * @param {string} toolName - Name of the tool requested
 * @param {Object} params - Tool parameters
 * @param {Array<string>} [allowedTools] - List of permitted tools
 * @param {Object} [options] - Options
 * @returns {Object} { allowed: boolean, violations: Array }
 */
function validateToolExecution(toolName, params = {}, allowedTools = [], options = {}) {
  const { throwOnError = false } = options;
  const violations = [];

  if (Array.isArray(allowedTools) && allowedTools.length > 0 && !allowedTools.includes(toolName)) {
    violations.push({
      type: ViolationType.UNAUTHORIZED_TOOL,
      severity: Severity.HIGH,
      rule: 'tool_permission_denied',
      message: `Tool "${toolName}" is not authorized for this agent. Allowed: [${allowedTools.join(', ')}]`,
      target: toolName
    });
  }

  // Specific tool validations
  if (toolName === 'shellTool' && params?.cmd) {
    const cmdCheck = validateCommand(params.cmd, params.allowlist);
    violations.push(...cmdCheck.violations);
  }

  if (toolName === 'fsTool' && params?.path) {
    const pathCheck = validateFilePath(params.path, params.baseDir);
    violations.push(...pathCheck.violations);
  }

  // Self-termination tool execution checks
  if (toolName === 'shellTool' && (params?.action === 'killProcess' || params?.method === 'killProcess')) {
    const targetPid = params?.params?.[0] ?? params?.pid;
    if (targetPid === process.pid || targetPid === process.ppid) {
      violations.push({
        type: ViolationType.SELF_TERMINATION,
        severity: Severity.CRITICAL,
        rule: 'self_process_kill_blocked',
        message: `Security Exception: Agent attempted to terminate its own application host process (PID: ${targetPid})`,
        target: targetPid
      });
    }
  }

  if (['windowsOperator', 'operator', 'robot', 'ghost', 'ghostTool'].includes(toolName) &&
      ['closeWindow', 'closeApp'].includes(params?.action)) {
    const rawTarget = String(params?.params?.[0] || params?.window || params?.windowTitle || '').toLowerCase();
    if (rawTarget.includes('agentic harness') || rawTarget.includes('agentic-harness') || rawTarget === 'electron') {
      violations.push({
        type: ViolationType.SELF_TERMINATION,
        severity: Severity.CRITICAL,
        rule: 'self_window_close_blocked',
        message: `Security Exception: Agent attempted to close its own application window ("${rawTarget}")`,
        target: rawTarget
      });
    }
  }

  const allowed = violations.length === 0;

  if (!allowed && throwOnError) {
    const primary = violations[0];
    throw new GuardrailViolation(primary.message, primary);
  }

  return { allowed, violations };
}

/**
 * Detect sensitive data in output
 * @param {string} text - Text to analyze
 * @returns {Array<Object>} Found sensitive leaks
 */
function detectSensitiveData(text) {
  if (typeof text !== 'string') return [];
  const findings = [];

  for (const pattern of SENSITIVE_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches && matches.length > 0) {
      findings.push({
        type: ViolationType.SENSITIVE_DATA_LEAK,
        severity: pattern.severity,
        rule: pattern.name,
        count: matches.length,
        message: `Detected potential sensitive credential exposure: ${pattern.name}`
      });
    }
  }

  return findings;
}

/**
 * Mask sensitive data (keys, tokens, credentials, PII) in text
 * @param {string} text - Text to sanitize
 * @param {Object} [options] - Sanitization options
 * @returns {string} Sanitized text
 */
function maskSensitiveData(text, options = {}) {
  if (typeof text !== 'string') return text;
  let sanitized = text;

  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, pattern.replacement);
  }

  return sanitized;
}

/**
 * Full output guardrail: validate and optionally redact output
 * @param {string} output - Agent output string
 * @param {Object} [options] - Options { redact: true, throwOnError: false }
 * @returns {Object} { allowed: boolean, sanitized: string, violations: Array }
 */
function validateOutput(output, options = {}) {
  const { redact = true, throwOnError = false } = options;
  const violations = detectSensitiveData(output);
  const allowed = violations.length === 0;
  const sanitized = redact ? maskSensitiveData(output) : output;

  if (!allowed && throwOnError) {
    const primary = violations[0];
    throw new GuardrailViolation(primary.message, primary);
  }

  return {
    allowed,
    violations,
    sanitized
  };
}

/**
 * Guardrail Engine class for stateful and configurable policies
 */
class GuardrailEngine {
  constructor(config = {}) {
    this.config = {
      maxPromptLength: config.maxPromptLength || 32000,
      enforceAllowlist: config.enforceAllowlist !== false,
      commandAllowlist: config.commandAllowlist || ['node', 'git', 'npm', 'echo', 'cat', 'ls', 'dir'],
      allowedTools: config.allowedTools || ['fsTool', 'shellTool', 'httpTool'],
      workspaceRoot: config.workspaceRoot || process.cwd(),
      redactOutput: config.redactOutput !== false,
      strictMode: config.strictMode || false
    };
    this.customRules = [];
  }

  addCustomRule(ruleFn) {
    if (typeof ruleFn === 'function') {
      this.customRules.push(ruleFn);
    }
  }

  checkPrompt(prompt) {
    const res = validatePrompt(prompt, {
      maxPromptLength: this.config.maxPromptLength,
      throwOnError: this.config.strictMode
    });

    for (const rule of this.customRules) {
      try {
        const customRes = rule('prompt', prompt);
        if (customRes && !customRes.allowed) {
          res.allowed = false;
          res.violations.push(...(customRes.violations || []));
        }
      } catch (e) {
        if (this.config.strictMode) throw e;
      }
    }

    return res;
  }

  checkCommand(cmd) {
    return validateCommand(
      cmd,
      this.config.enforceAllowlist ? this.config.commandAllowlist : null,
      { throwOnError: this.config.strictMode }
    );
  }

  checkFilePath(filePath) {
    return validateFilePath(filePath, this.config.workspaceRoot, {
      throwOnError: this.config.strictMode
    });
  }

  checkTool(toolName, params) {
    return validateToolExecution(toolName, params, this.config.allowedTools, {
      throwOnError: this.config.strictMode
    });
  }

  sanitize(output) {
    return validateOutput(output, {
      redact: this.config.redactOutput,
      throwOnError: this.config.strictMode
    });
  }
}

// Module exports (supports CommonJS and ES Module consumer conventions)
module.exports = {
  ViolationType,
  Severity,
  GuardrailViolation,
  validatePrompt,
  validateCommand,
  validateFilePath,
  validateToolExecution,
  validateOutput,
  maskSensitiveData,
  detectSensitiveData,
  GuardrailEngine,
  // Default singleton instance
  guardrails: new GuardrailEngine()
};