/**
 * Agentic Harness - Central Tool Registry & Security Dispatcher
 * Consolidates all built-in tools with Guardrail verification and output sanitization.
 */

const fsTool = require('./fsTool');
const shellTool = require('./shellTool');
const httpTool = require('./httpTool');
const systemTool = require('./systemTool');
const gitTool = require('./gitTool');
const searchTool = require('./searchTool');
const {
  robot,
  ghost,
  windowsOperator,
  windowsControl
} = require('./windowsControl');
const {
  playwright,
  browserUse,
  stagehand,
  browserMcp,
  chromeDevToolsMcp,
  playwrightMcp,
  browserSuite
} = require('./browser');
const {
  personaPlex,
  liveAudio,
  audioSuite
} = require('./audio');
const customToolManager = require('./customToolManager');
const { validateToolExecution, validateOutput } = require('../../Guardrails/guardrails');

const TOOL_REGISTRY = {
  fsTool,
  shellTool,
  httpTool,
  robot,
  robotTool: robot,
  systemTool,
  gitTool,
  searchTool,
  ghost,
  ghostTool: ghost,
  windowsOperator,
  operator: windowsOperator,
  windowsControl,

  // Browser Tools Suite
  playwright,
  browserUse,
  stagehand,
  browserMcp,
  chromeDevToolsMcp,
  playwrightMcp,
  browserSuite,

  // Custom Tools Engine
  customToolManager,
  customTools: customToolManager,

  // PersonaPlex Full-Duplex Audio & Live Audio Mode
  personaPlex,
  liveAudio,
  audioSuite
};

const TOOL_SCHEMAS = [
  {
    id: 'fsTool',
    name: 'File System Engine',
    description: 'Read, write, append, search, and list workspace files with path traversal protection.',
    actions: ['readFile', 'writeFile', 'appendFile', 'deleteFile', 'listDirectory', 'createDirectory', 'fileExists', 'searchFiles']
  },
  {
    id: 'shellTool',
    name: 'Shell & Process Terminal',
    description: 'Execute allowlisted terminal commands, inspect process trees, or run in Docker sandboxes.',
    actions: ['runCommand', 'listProcesses', 'killProcess']
  },
  {
    id: 'httpTool',
    name: 'HTTP & Web Scraper',
    description: 'Query REST APIs, submit web payloads, and extract clean text from web pages.',
    actions: ['httpGet', 'httpPost', 'httpPut', 'httpDelete', 'fetchWebPage', 'checkHealth']
  },
  {
    id: 'robot',
    name: 'Windows Desktop Automation (Robot.js)',
    description: 'Mouse movement and clicks, keyboard typing, key shortcuts, screenshots, and active window control.',
    actions: ['getScreenSize', 'getMousePos', 'moveMouse', 'moveMouseSmooth', 'mouseClick', 'dragMouse', 'mouseScroll', 'typeString', 'keyTap', 'captureScreen', 'getActiveWindow', 'getClipboard', 'setClipboard', 'beep']
  },
  {
    id: 'systemTool',
    name: 'System & Hardware Telemetry',
    description: 'Inspect CPU load, RAM allocation, disk capacity, and network adapters.',
    actions: ['getSystemInfo', 'getCpuInfo', 'getMemoryInfo', 'getDiskInfo', 'getNetworkInfo']
  },
  {
    id: 'gitTool',
    name: 'Git Version Control',
    description: 'Query repo status, inspect commits, diff branches, and stage changes.',
    actions: ['gitStatus', 'gitLog', 'gitDiff', 'gitBranch', 'gitAdd', 'gitCommit']
  },
  {
    id: 'searchTool',
    name: 'Live Web Search',
    description: 'Search web indexes and developer knowledge bases for technical answers.',
    actions: ['webSearch']
  },
  {
    id: 'ghost',
    name: 'Ghost Background OS Automation',
    description: 'Zero-hijack background desktop automation: UI Automation accessibility tree inspection, background clicks/invokes, background text entry, and PrintWindow window capture (inspired by NORTHTEKDevs/ghost).',
    actions: ['listWindows', 'inspectElements', 'clickElement', 'clickCoordinates', 'setText', 'sendTextBackground', 'captureWindow', 'focusWindow', 'actThenVerify']
  },
  {
    id: 'windowsOperator',
    name: 'Full Windows Human Operator',
    description: 'Complete human-like desktop access: smooth mouse, double-click, right-click, drag & drop, typing, system hotkeys (Win+R, Alt+Tab, Ctrl+C/V/S, Alt+F4), app launching/closing, screen perception, and voice.',
    actions: ['moveMouseSmooth', 'click', 'doubleClick', 'rightClick', 'dragAndDrop', 'scroll', 'clickAndType', 'type', 'pressHotkey', 'openStartMenu', 'openRunDialog', 'showDesktop', 'switchApp', 'copy', 'paste', 'selectAll', 'save', 'closeActiveWindow', 'openTaskManager', 'launchApp', 'openWithDefault', 'closeWindow', 'setWindowState', 'switchWindow', 'seeScreen', 'getActiveWindow', 'speak', 'notify', 'runHumanWorkflow']
  },
  {
    id: 'playwright',
    name: 'Playwright Browser Automation',
    description: 'Web browser navigation, selector clicking, typing, screenshots, and page evaluation (microsoft/playwright).',
    actions: ['navigate', 'click', 'type', 'screenshot', 'getContent', 'evaluate', 'close']
  },
  {
    id: 'browserUse',
    name: 'Browser Use Autonomous Agent',
    description: 'Autonomous multi-step browser agent loop with interactive element perception (browser-use/browser-use).',
    actions: ['runBrowserAgent', 'getInteractiveElements', 'getAgentState']
  },
  {
    id: 'stagehand',
    name: 'Stagehand AI-Driven Browser',
    description: 'Natural language browser automation with act(), extract(), and observe() primitives (browserbase/stagehand).',
    actions: ['act', 'extract', 'observe']
  },
  {
    id: 'browserMcp',
    name: 'Browser MCP Bridge',
    description: 'Browser automation exposed through Model Context Protocol (nicholasoxford/browsermcp).',
    actions: ['navigate', 'click', 'type', 'screenshot', 'getDom']
  },
  {
    id: 'chromeDevToolsMcp',
    name: 'Chrome DevTools MCP',
    description: 'Chrome inspection and debugging via CDP: network, console logs, performance, device emulation (ChromeDevTools/chrome-devtools-mcp).',
    actions: ['inspectNetwork', 'captureConsoleLogs', 'inspectPerformance', 'emulateDevice']
  },
  {
    id: 'playwrightMcp',
    name: 'Playwright MCP',
    description: 'Structured browser interaction via Playwright MCP protocol (microsoft/playwright-mcp).',
    actions: ['pageGoto', 'pageClick', 'pageFill', 'pageScreenshot', 'pageEvaluate']
  },
  {
    id: 'customToolManager',
    name: 'Custom AI Tool Manager & Verification Engine',
    description: 'AI-generated custom tools saved on device with mandatory first-time security verification (syntax audit, AST security check, sandbox dry-run).',
    actions: ['createCustomTool', 'verifyCustomTool', 'executeCustomTool', 'listCustomTools', 'deleteCustomTool']
  },
  {
    id: 'personaPlex',
    name: 'PersonaPlex Full-Duplex Conversational Audio',
    description: 'Natural, simultaneous listening and speaking (NVIDIA PersonaPlex) with real-time barge-in interruption, conversational backchanneling, and hybrid voice/text role prompting.',
    actions: ['startLiveAudioSession', 'processAudioInputChunk', 'speak', 'handleBargeIn', 'configurePersona', 'stopLiveAudioSession', 'getStatus']
  },
  {
    id: 'liveAudio',
    name: 'Live Audio Mode & Stream Bridge',
    description: 'Bidirectional low-latency audio stream protocol with Voice Activity Detection (VAD) and WebRTC audio bridging.',
    actions: ['startLiveMode', 'sendChunk', 'interrupt', 'speak', 'stopLiveMode', 'getStatus']
  }
];

/**
 * Execute a tool action with Guardrail checks and output sanitization
 * @param {string} toolName - e.g. 'fsTool', 'robot', 'shellTool'
 * @param {string} action - Function name e.g. 'readFile', 'moveMouse', 'runCommand'
 * @param {Array<any>|Object} params - Arguments
 * @param {Object} [options]
 */
async function executeTool(toolName, action, params = [], options = {}) {
  const { allowedTools = Object.keys(TOOL_REGISTRY), redactOutput = true } = options;

  // 1. Guardrail validation
  validateToolExecution(toolName, { action, params }, allowedTools, { throwOnError: true });

  const targetTool = TOOL_REGISTRY[toolName];
  if (!targetTool) {
    throw new Error(`Tool "${toolName}" is not registered in the harness.`);
  }

  const fn = targetTool[action];
  if (typeof fn !== 'function') {
    throw new Error(`Action "${action}" does not exist on tool "${toolName}". Available: [${Object.keys(targetTool).filter(k => typeof targetTool[k] === 'function').join(', ')}]`);
  }

  const startTime = Date.now();
  const args = Array.isArray(params) ? params : [params];

  // 2. Execute action
  const rawResult = await fn(...args);
  const durationMs = Date.now() - startTime;

  // 3. Post-execution output sanitization
  let sanitizedResult = rawResult;
  if (redactOutput && typeof rawResult === 'string') {
    const outCheck = validateOutput(rawResult, { redact: true });
    sanitizedResult = outCheck.sanitized;
  }

  return {
    success: true,
    tool: toolName,
    action,
    durationMs,
    result: sanitizedResult
  };
}

/**
 * Get all available tools and schema specifications
 */
function getAvailableTools() {
  return TOOL_SCHEMAS;
}

module.exports = {
  // Modules
  fsTool,
  shellTool,
  httpTool,
  robot,
  robotTool: robot,
  systemTool,
  gitTool,
  searchTool,
  ghost,
  ghostTool: ghost,
  windowsOperator,
  operator: windowsOperator,
  windowsControl,

  // Browser Suite
  playwright,
  browserUse,
  stagehand,
  browserMcp,
  chromeDevToolsMcp,
  playwrightMcp,
  browserSuite,

  // Custom Tools Engine
  customToolManager,

  // Audio Suite (PersonaPlex Full-Duplex & Live Audio)
  personaPlex,
  liveAudio,
  audioSuite,

  // Dispatcher & Schema
  executeTool,
  getAvailableTools,
  TOOL_REGISTRY,
  TOOL_SCHEMAS
};

