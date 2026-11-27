/**
 * Agentic Tool-Calling Loop Helpers
 * Builds tool-aware system prompts, parses ```tool_call and <tool_call> blocks
 * (JSON or XML function/parameter format), and strips raw tool tags from UI text.
 */

const TOOL_CATALOG = {
  projectTool: 'projectTool: askOpenProject(suggestedPath?, reason?) — displays an "Open Project" button to the user and loads the chosen folder into the Files editor',
  fsTool: 'fsTool: readFile(path), writeFile(path, content), appendFile(path, content), listDirectory(dirPath), searchFiles(dirPath, pattern), fileExists(path)',
  shellTool: 'shellTool: runCommand(cmd), listProcesses()',
  httpTool: 'httpTool: httpGet(url), httpPost(url, body), fetchWebPage(url), checkHealth(url)',
  gitTool: 'gitTool: gitStatus(), gitLog(), gitDiff(), gitBranch()',
  systemTool: 'systemTool: getSystemInfo(), getCpuInfo(), getMemoryInfo(), getDiskInfo(), getNetworkInfo()',
  searchTool: 'searchTool: webSearch(query)',
  webSearch: 'searchTool: webSearch(query)',
  robot: 'robot: getScreenSize(), getMousePos(), moveMouse(x, y), mouseClick(button), typeString(text), keyTap(key), captureScreen(), getActiveWindow()',
  ghost: 'ghost: listWindows(), inspectElements(hwnd), clickElement(hwnd, name), sendTextBackground(hwnd, text), focusWindow(hwnd)',
  windowsOperator: 'windowsOperator: launchApp(name), pressHotkey(keys), seeScreen(), getActiveWindow(), click(x, y), type(text)',
  playwright: 'playwright: navigate(url), click(selector), type(selector, text), screenshot(path), getContent()',
  browserUse: 'browserUse: runBrowserAgent(task), getInteractiveElements(), getAgentState()',
  stagehand: 'stagehand: act(instruction), extract(instruction), observe(instruction)',
  customToolManager: 'customToolManager: listCustomTools(), executeCustomTool(name, args), createCustomTool(spec)'
};

const ACTION_TO_TOOL = {
  readFile: 'fsTool',
  writeFile: 'fsTool',
  appendFile: 'fsTool',
  deleteFile: 'fsTool',
  listDirectory: 'fsTool',
  createDirectory: 'fsTool',
  fileExists: 'fsTool',
  searchFiles: 'fsTool',
  runCommand: 'shellTool',
  listProcesses: 'shellTool',
  httpGet: 'httpTool',
  httpPost: 'httpTool',
  fetchWebPage: 'httpTool',
  checkHealth: 'httpTool',
  gitStatus: 'gitTool',
  gitLog: 'gitTool',
  gitDiff: 'gitTool',
  gitBranch: 'gitTool',
  getSystemInfo: 'systemTool',
  getCpuInfo: 'systemTool',
  getMemoryInfo: 'systemTool',
  getDiskInfo: 'systemTool',
  getNetworkInfo: 'systemTool',
  webSearch: 'searchTool',
  getScreenSize: 'robot',
  getMousePos: 'robot',
  moveMouse: 'robot',
  moveMouseSmooth: 'robot',
  mouseClick: 'robot',
  dragMouse: 'robot',
  mouseScroll: 'robot',
  typeString: 'robot',
  keyTap: 'robot',
  captureScreen: 'robot',
  getActiveWindow: 'robot',
  getClipboard: 'robot',
  setClipboard: 'robot',
  beep: 'robot',
  listWindows: 'ghost',
  inspectElements: 'ghost',
  launchApp: 'windowsOperator',
  pressHotkey: 'windowsOperator',
  seeScreen: 'windowsOperator'
};

export function buildToolSystemPrompt(activeToolIds = [], projectRoot = null) {
  const specs = activeToolIds
    .map((id) => TOOL_CATALOG[id])
    .filter(Boolean);

  if (specs.length === 0) {
    return 'You are Agentic Harness, a fast, helpful AI assistant.';
  }

  return [
    'You are Agentic Harness, a fast autonomous desktop AI assistant.',
    projectRoot?.path
      ? `Active project folder: "${projectRoot.path}" (relative paths like "." resolve here).`
      : 'No project folder is open yet. Use projectTool.askOpenProject() if needed.',
    'Enabled tools (pass positional array in "params"):',
    ...specs.map((s) => `- ${s}`),
    '',
    'For opening apps (e.g. Chrome), use windowsOperator: {"tool": "windowsOperator", "action": "launchApp", "params": ["chrome"]}.',
    'For ANY desktop app without a dedicated tool (e.g. WhatsApp, Spotify, Notepad): use windowsOperator/ghost/robot! Example for WhatsApp: 1) launchApp("whatsapp") 2) focusWindow("WhatsApp") 3) pressHotkey("ctrl+f") 4) type("Divyanshu Gupta") 5) keyTap("enter") 6) type("Hii") 7) keyTap("enter"). Always focusWindow() before typing so keys go to the target app, not Agentic Harness.',
    'For visual screen perception & clicking: call windowsOperator.seeScreen() (returns live screen image with an offscreen 100px/200px pixel coordinate grid + CURSOR(x,y) marker) or ghost.inspectElements() (returns exact UI element x,y coordinates), then robot.moveMouse(x, y) / mouseClick().',
    'To call a tool, immediately output ONLY:',
    '```tool_call',
    '{"tool": "windowsOperator", "action": "launchApp", "params": ["chrome"]}',
    '```',
    'Do not write long thoughts before the tool_call. Wait for [Tool Result] before answering.'
  ].join('\n');
}

function coerceXmlParam(val) {
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  if (val === 'true') return true;
  if (val === 'false') return false;
  if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
    try {
      return JSON.parse(val);
    } catch (_) {}
  }
  return val;
}

const DEFAULT_TOOL_ACTIONS = {
  searchTool: 'webSearch',
  browserUse: 'runBrowserAgent',
  fsTool: 'listDirectory',
  shellTool: 'runCommand',
  httpTool: 'httpGet',
  gitTool: 'gitStatus',
  systemTool: 'getSystemInfo',
  projectTool: 'askOpenProject',
  windowsOperator: 'launchApp'
};

function normalizeParsedCall(tool, action, params) {
  let cleanTool = String(tool || '').replace(/\(\)$/, '').trim();
  let resolvedTool =
    cleanTool === 'webSearch'
      ? 'searchTool'
      : cleanTool === 'robotTool'
      ? 'robot'
      : cleanTool === 'ghostTool'
      ? 'ghost'
      : cleanTool;
  let resolvedAction = action ? String(action).replace(/\(\)$/, '').trim() : action;

  if (!resolvedAction && resolvedTool.includes('.')) {
    const [t, a] = resolvedTool.split('.');
    resolvedTool = t.trim();
    resolvedAction = a.replace(/\(\)$/, '').trim();
  }
  if (!resolvedAction && ACTION_TO_TOOL[resolvedTool]) {
    resolvedAction = resolvedTool;
    resolvedTool = ACTION_TO_TOOL[resolvedTool];
  }
  if (!resolvedAction && DEFAULT_TOOL_ACTIONS[resolvedTool]) {
    resolvedAction = DEFAULT_TOOL_ACTIONS[resolvedTool];
  }

  if (!resolvedTool || !resolvedAction) return null;
  let normalizedParams;
  if (Array.isArray(params)) {
    normalizedParams = params.map((p) => (Array.isArray(p) && p.length === 1 ? p[0] : p));
  } else if (params && typeof params === 'object') {
    normalizedParams = Object.values(params).map((p) => (Array.isArray(p) && p.length === 1 ? p[0] : p));
  } else if (params !== undefined && params !== null) {
    normalizedParams = [params];
  } else {
    normalizedParams = [];
  }

  return { tool: resolvedTool, action: resolvedAction, params: normalizedParams };
}

export function parseToolCalls(text) {
  if (!text) return [];
  const str = String(text);
  const calls = [];

  // 1. All fenced ```tool_call { ... } ``` or <tool_call>{ ... }</tool_call>
  const jsonRegex = /```tool_call\s*([\s\S]*?)```|<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/gi;
  let jm;
  while ((jm = jsonRegex.exec(str)) !== null) {
    const rawJson = (jm[1] || jm[2] || '').trim();
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed.tool === 'string') {
        const call = normalizeParsedCall(parsed.tool, parsed.action, parsed.params);
        if (call) calls.push(call);
      }
    } catch (_) {}
  }

  // 2. All XML <tool_call><function=NAME>...</function>(</tool_call> optional)
  const xmlRegex = /<tool_call>[\s\S]*?<function=([^>\s]+)>([\s\S]*?)<\/function>(?:[\s\S]*?<\/tool_call>)?/gi;
  let xm;
  while ((xm = xmlRegex.exec(str)) !== null) {
    const fnName = xm[1].trim();
    const body = xm[2];
    const paramRegex = /<parameter=([^>\s]+)>([\s\S]*?)<\/parameter>/gi;
    const paramMap = {};
    const orderedParams = [];
    let pm;

    while ((pm = paramRegex.exec(body)) !== null) {
      const key = pm[1].trim();
      const val = pm[2].trim();
      paramMap[key] = val;
      if (key !== 'action' && key !== 'tool') {
        orderedParams.push(coerceXmlParam(val));
      }
    }

    const action = paramMap.action || undefined;
    const tool = paramMap.tool || fnName;
    const call = normalizeParsedCall(tool, action, orderedParams);
    if (call) calls.push(call);
  }

  return calls;
}

export function parseToolCall(text) {
  return parseToolCalls(text)[0] || null;
}

export function stripToolCallBlocks(text) {
  return String(text || '')
    .replace(/```tool_call[\s\S]*?```/gi, '')
    .replace(/```tool_call[\s\S]*$/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<tool_call>[\s\S]*$/gi, '')
    .trim();
}
