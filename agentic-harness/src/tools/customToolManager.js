/**
 * Agentic Harness - Custom Tool Creation & Verification Engine
 * Allows AI agents to dynamically generate custom tools that are saved to the user's device.
 * Enforces mandatory first-time security verification (syntax audit, AST security scan,
 * and sandboxed dry-run) before any custom tool can be registered or executed.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { validateCommand, validateOutput, ViolationType, Severity } = require('../../Guardrails/guardrails');

const CUSTOM_TOOLS_DIR = path.resolve(__dirname, '../../customTools');

// In-memory registry of loaded custom tools
const activeCustomTools = new Map();

/**
 * Ensure storage directory exists
 */
function ensureStorageDir() {
  if (!fs.existsSync(CUSTOM_TOOLS_DIR)) {
    fs.mkdirSync(CUSTOM_TOOLS_DIR, { recursive: true });
  }
}

/**
 * Sanitize and normalize a tool name
 */
function normalizeToolName(rawName) {
  return rawName.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * AI Tool Creation: Saves a newly generated tool to the user's device
 * Marked as PENDING_VERIFICATION.
 *
 * @param {Object} toolSpec
 * @param {string} toolSpec.name - Unique tool name (e.g. 'currencyConverter')
 * @param {string} toolSpec.description - Tool description
 * @param {string} toolSpec.code - Complete JavaScript tool code
 * @param {Array<string>} [toolSpec.parameters] - Expected parameters
 * @param {string} [toolSpec.author='AI Agent']
 * @returns {Promise<{ success: boolean, name: string, status: string, filePath: string }>}
 */
async function createCustomTool(toolSpec) {
  ensureStorageDir();

  const { name, description, code, parameters = [], author = 'AI Agent' } = toolSpec;

  if (!name || typeof name !== 'string') {
    throw new Error('Custom tool name is required');
  }
  if (!code || typeof code !== 'string') {
    throw new Error('Custom tool JavaScript code is required');
  }

  const cleanName = normalizeToolName(name);
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  const meta = {
    name: cleanName,
    description: description || 'Custom AI-generated tool',
    parameters,
    author,
    codeHash,
    status: 'PENDING_VERIFICATION',
    createdAt: new Date().toISOString(),
    verifiedAt: null,
    verifiedBy: null,
    rejectionReasons: []
  };

  const jsPath = path.join(CUSTOM_TOOLS_DIR, `${cleanName}.js`);
  const metaPath = path.join(CUSTOM_TOOLS_DIR, `${cleanName}.meta.json`);

  fs.writeFileSync(jsPath, code, 'utf8');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  activeCustomTools.set(cleanName, { meta, code, fn: null });

  return {
    success: true,
    name: cleanName,
    status: 'PENDING_VERIFICATION',
    filePath: jsPath,
    message: `Custom tool "${cleanName}" saved to disk. Security verification is required before first use.`
  };
}

/**
 * Verification Engine: Verifies a custom tool before first execution
 *
 * Verification Steps:
 * 1. Syntax & Compilation Audit: Compiles script using node:vm
 * 2. Static Guardrail Security Scan: Detects banned patterns, self-termination, unsafe API calls
 * 3. Isolated Sandboxed Dry-Run: Validates execution in restricted sandbox
 * 4. Activation: Marks VERIFIED and registers tool dynamically
 *
 * @param {string} toolName
 * @returns {Promise<{ success: boolean, status: string, name: string, violations: Array }>}
 */
async function verifyCustomTool(toolName) {
  ensureStorageDir();
  const cleanName = normalizeToolName(toolName);
  const jsPath = path.join(CUSTOM_TOOLS_DIR, `${cleanName}.js`);
  const metaPath = path.join(CUSTOM_TOOLS_DIR, `${cleanName}.meta.json`);

  if (!fs.existsSync(jsPath) || !fs.existsSync(metaPath)) {
    throw new Error(`Custom tool "${cleanName}" not found on device.`);
  }

  const code = fs.readFileSync(jsPath, 'utf8');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  const violations = [];

  // --- STAGE 1: Syntax & Compilation Audit ---
  let script;
  try {
    script = new vm.Script(code, { filename: `${cleanName}.js` });
  } catch (syntaxErr) {
    violations.push({
      stage: 'SYNTAX_AUDIT',
      message: `Syntax Error: ${syntaxErr.message}`
    });
  }

  // --- STAGE 2: Static Guardrails & Security Scan ---
  const bannedPatterns = [
    { regex: /\bprocess\.(exit|kill|abort)\b/i, name: 'self_termination_or_exit' },
    { regex: /\b(eval|Function)\s*\(/i, name: 'arbitrary_code_evaluation' },
    { regex: /\bchild_process\b/i, name: 'unrestricted_child_process' },
    { regex: /\b(?:taskkill|rm\s+-rf|format\s+[a-z]:)\b/i, name: 'dangerous_system_destruction' },
    { regex: /\b(?:\/etc\/shadow|\/etc\/passwd|SYSTEM32\\config)\b/i, name: 'system_credential_theft' }
  ];

  for (const bp of bannedPatterns) {
    if (bp.regex.test(code)) {
      violations.push({
        stage: 'STATIC_SECURITY_SCAN',
        message: `Prohibited dangerous security pattern detected: ${bp.name}`
      });
    }
  }

  // --- STAGE 3: Isolated Sandboxed Dry-Run ---
  let exportedFn = null;
  if (violations.length === 0) {
    try {
      const sandboxModule = { exports: {} };
      const sandbox = {
        module: sandboxModule,
        exports: sandboxModule.exports,
        console: {
          log: () => {},
          warn: () => {},
          error: () => {}
        },
        Math,
        JSON,
        Date,
        Buffer,
        parseInt,
        parseFloat,
        setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms || 0, 1000)),
        clearTimeout
      };

      const context = vm.createContext(sandbox);
      script.runInContext(context, { timeout: 3000 });

      const exported = sandboxModule.exports;
      if (typeof exported === 'function') {
        exportedFn = exported;
      } else if (typeof exported === 'object' && exported !== null) {
        const firstFn = Object.values(exported).find(v => typeof v === 'function');
        if (firstFn) exportedFn = firstFn;
      }

      if (!exportedFn) {
        violations.push({
          stage: 'SANDBOX_DRYRUN',
          message: 'Tool must export an executable function (via module.exports = function or module.exports = { ... })'
        });
      }
    } catch (dryRunErr) {
      violations.push({
        stage: 'SANDBOX_DRYRUN',
        message: `Sandbox execution failed: ${dryRunErr.message}`
      });
    }
  }

  // --- STAGE 4: Finalize Verification State ---
  if (violations.length > 0) {
    meta.status = 'REJECTED';
    meta.rejectionReasons = violations;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

    activeCustomTools.set(cleanName, { meta, code, fn: null });

    return {
      success: false,
      status: 'REJECTED',
      name: cleanName,
      violations
    };
  }

  // Verification Succeeded
  meta.status = 'VERIFIED';
  meta.verifiedAt = new Date().toISOString();
  meta.verifiedBy = 'Agentic Harness Security & Guardrails Engine';
  meta.rejectionReasons = [];

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  // Register in memory and dynamically attach to tools registry
  activeCustomTools.set(cleanName, { meta, code, fn: exportedFn });

  return {
    success: true,
    status: 'VERIFIED',
    name: cleanName,
    verifiedAt: meta.verifiedAt,
    message: `Custom tool "${cleanName}" verified and activated successfully.`
  };
}

/**
 * Execute a custom tool with verification enforcement
 * @param {string} toolName - Name of the custom tool
 * @param {Array<any>|Object} params - Arguments
 * @returns {Promise<any>}
 */
async function executeCustomTool(toolName, params = []) {
  const cleanName = normalizeToolName(toolName);
  let toolEntry = activeCustomTools.get(cleanName);

  if (!toolEntry) {
    // Attempt to load from disk
    const metaPath = path.join(CUSTOM_TOOLS_DIR, `${cleanName}.meta.json`);
    const jsPath = path.join(CUSTOM_TOOLS_DIR, `${cleanName}.js`);
    if (!fs.existsSync(metaPath) || !fs.existsSync(jsPath)) {
      throw new Error(`Custom tool "${cleanName}" does not exist.`);
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const code = fs.readFileSync(jsPath, 'utf8');
    toolEntry = { meta, code, fn: null };
    activeCustomTools.set(cleanName, toolEntry);
  }

  // Verification Gate Check
  if (toolEntry.meta.status !== 'VERIFIED') {
    throw new Error(
      `Security Exception: Custom tool "${cleanName}" has status "${toolEntry.meta.status}". First-time verification is required before execution. Run verifyCustomTool("${cleanName}") first.`
    );
  }

  // Instantiate function if needed
  if (!toolEntry.fn) {
    const sandboxModule = { exports: {} };
    const sandbox = {
      module: sandboxModule,
      exports: sandboxModule.exports,
      console,
      Math,
      JSON,
      Date,
      Buffer,
      parseInt,
      parseFloat
    };
    const context = vm.createContext(sandbox);
    const script = new vm.Script(toolEntry.code);
    script.runInContext(context, { timeout: 5000 });
    const exported = sandboxModule.exports;
    toolEntry.fn = typeof exported === 'function' ? exported : Object.values(exported).find(v => typeof v === 'function');
  }

  const args = Array.isArray(params) ? params : [params];
  const startTime = Date.now();

  const rawResult = await toolEntry.fn(...args);
  const durationMs = Date.now() - startTime;

  // Post-execution output sanitization
  let sanitized = rawResult;
  if (typeof rawResult === 'string') {
    const outCheck = validateOutput(rawResult, { redact: true });
    sanitized = outCheck.sanitized;
  }

  return {
    success: true,
    tool: cleanName,
    durationMs,
    result: sanitized
  };
}

/**
 * List all custom tools saved on the user's device
 */
function listCustomTools() {
  ensureStorageDir();
  const files = fs.readdirSync(CUSTOM_TOOLS_DIR);
  const metaFiles = files.filter(f => f.endsWith('.meta.json'));

  const list = [];
  for (const mf of metaFiles) {
    try {
      const content = fs.readFileSync(path.join(CUSTOM_TOOLS_DIR, mf), 'utf8');
      list.push(JSON.parse(content));
    } catch (_) {}
  }
  return list;
}

/**
 * Delete a custom tool from the user's device
 */
function deleteCustomTool(toolName) {
  ensureStorageDir();
  const cleanName = normalizeToolName(toolName);
  const jsPath = path.join(CUSTOM_TOOLS_DIR, `${cleanName}.js`);
  const metaPath = path.join(CUSTOM_TOOLS_DIR, `${cleanName}.meta.json`);

  let deleted = false;
  if (fs.existsSync(jsPath)) { fs.unlinkSync(jsPath); deleted = true; }
  if (fs.existsSync(metaPath)) { fs.unlinkSync(metaPath); deleted = true; }

  activeCustomTools.delete(cleanName);
  return { success: deleted, name: cleanName };
}

/**
 * Load all verified custom tools on startup
 */
function loadAllVerifiedTools() {
  const tools = listCustomTools();
  const verified = tools.filter(t => t.status === 'VERIFIED');
  for (const t of verified) {
    try {
      const jsPath = path.join(CUSTOM_TOOLS_DIR, `${t.name}.js`);
      if (fs.existsSync(jsPath)) {
        const code = fs.readFileSync(jsPath, 'utf8');
        activeCustomTools.set(t.name, { meta: t, code, fn: null });
      }
    } catch (_) {}
  }
  return verified;
}

module.exports = {
  createCustomTool,
  verifyCustomTool,
  executeCustomTool,
  listCustomTools,
  deleteCustomTool,
  loadAllVerifiedTools,
  CUSTOM_TOOLS_DIR
};

