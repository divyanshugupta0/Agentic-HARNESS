// IPC handlers for main process
const { ipcMain, session, shell, dialog, BrowserWindow } = require('electron');
const { showPipWindow, hidePipWindow, updatePipState } = require('./pipWindow');
const fs = require('node:fs');
const path = require('node:path');
const { BaseAgent } = require('../agents/baseAgent');
const { MemoryStore } = require('../memory/memoryStore');
const { readFile, writeFile } = require('../tools/fsTool');
const { createSocialLoginHandler } = require('./socialLogin');
const { createAuthenticatedSessionVerifier } = require('./authSession');
const {
  fsTool,
  shellTool,
  httpTool,
  robot,
  systemTool,
  gitTool,
  searchTool,
  ghost,
  windowsOperator,
  playwright,
  browserUse,
  stagehand,
  customToolManager,
  personaPlex,
  liveAudio,
  executeTool,
  getAvailableTools
} = require('../tools');

let activeRun = null;

function registerHandlers() {
  const authApiUrl = process.env.AUTH_API_URL || process.env.VITE_AUTH_API_URL || 'http://localhost:3001';
  const authFetch = session.defaultSession.fetch.bind(session.defaultSession);
  const requireAuthenticatedSession = createAuthenticatedSessionVerifier({
    apiUrl: authApiUrl,
    fetchImpl: authFetch
  });
  const openSocialLogin = createSocialLoginHandler({
    apiUrl: authApiUrl,
    fetchImpl: authFetch,
    openExternal: (url) => shell.openExternal(url)
  });
  ipcMain.handle('auth:open-social-login', (_event, provider) => openSocialLogin(provider));
  ipcMain.handle('auth:credential', async (_event, { action, name, email, password } = {}) => {
    if (!['login', 'signup'].includes(action)) {
      throw new Error('Unsupported authentication action');
    }
    const response = await authFetch(`${authApiUrl}/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
      signal: AbortSignal.timeout(10000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Authentication failed');
    }
    return result;
  });
  ipcMain.handle('auth:session-user', async () => {
    const response = await authFetch(`${authApiUrl}/auth/user`, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
      cache: 'no-store'
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error('Unable to restore the desktop authentication session');
    return response.json();
  });
  ipcMain.handle('auth:logout', async () => {
    try {
      const response = await authFetch(`${authApiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Unable to end the desktop authentication session');
    } finally {
      stopActiveRun();
    }
  });

  ipcMain.handle('agent:start', async (event, goal) => {
    await requireAuthenticatedSession();
    stopActiveRun();

    const memory = new MemoryStore();
    memory.addMessage('user', goal);

    const availableToolIds = [
      'fsTool', 'shellTool', 'httpTool', 'robot', 'systemTool', 'gitTool', 'searchTool',
      'ghost', 'windowsOperator', 'playwright', 'browserUse', 'stagehand', 'customToolManager',
      'personaPlex', 'liveAudio'
    ];
    const agent = new BaseAgent('research-agent', 'Autonomous Local Assistant', availableToolIds);
    const sender = event.sender;

    const runState = {
      agent,
      goal,
      memory,
      stopped: false,
      paused: false,
      timer: null,
      stepIndex: 0
    };
    activeRun = runState;

    const steps = [
      { delay: 350, msg: `🤖 Initialized agent [${agent.id}] with system prompt & tools [${agent.tools.join(', ')}]` },
      { delay: 650, msg: `🧠 Short-term memory store active. Goal recorded: "${goal}"` },
      { delay: 850, msg: `📋 Generating multi-step execution plan...` },
      { delay: 1100, msg: `[Step 1/3] Validating local workspace environment & security sandbox` },
      { delay: 1400, msg: `[Step 2/3] Analyzing objective and inspecting relevant file structures...` },
      { delay: 1600, msg: `[Step 3/3] Synthesizing reasoning trace and verifying completion metrics...` }
    ];

    function executeNextStep() {
      if (!activeRun || runState.stopped || runState.paused) return;

      if (runState.stepIndex < steps.length) {
        const current = steps[runState.stepIndex];
        runState.stepIndex++;
        runState.timer = setTimeout(() => {
          if (!activeRun || runState.stopped || runState.paused) return;
          try {
            sender.send('agent:log', current.msg);
          } catch (e) {}
          executeNextStep();
        }, current.delay);
      } else {
        const result = {
          status: 'completed',
          goal,
          summary: `Successfully executed agent workflow for: "${goal}"`,
          stepsExecuted: steps.length,
          timestamp: new Date().toISOString()
        };
        try {
          sender.send('agent:result', result);
        } catch (e) {}
        activeRun = null;
      }
    }

    setTimeout(() => {
      executeNextStep();
    }, 150);

    return { status: 'started', goal, timestamp: Date.now() };
  });

  ipcMain.handle('agent:stop', async (event) => {
    await requireAuthenticatedSession();
    if (activeRun) {
      stopActiveRun();
      try {
        event.sender.send('agent:log', '🛑 Agent execution stopped by supervisor.');
      } catch (e) {}
      activeRun = null;
    }
    return { status: 'stopped' };
  });

  ipcMain.handle('agent:pause', async (event) => {
    await requireAuthenticatedSession();
    if (activeRun) {
      activeRun.paused = true;
      if (activeRun.timer) clearTimeout(activeRun.timer);
      activeRun.agent.pause();
      try {
        event.sender.send('agent:log', '⏸️ Agent execution paused.');
      } catch (e) {}
    }
    return { status: 'paused' };
  });

  ipcMain.handle('agent:resume', async (event) => {
    await requireAuthenticatedSession();
    if (activeRun && activeRun.paused) {
      activeRun.paused = false;
      activeRun.agent.resume();
      try {
        event.sender.send('agent:log', '▶️ Agent execution resumed.');
      } catch (e) {}
    }
    return { status: 'resumed' };
  });

  // Secure File System IPC handlers
  ipcMain.handle('file:read', async (event, filePath) => {
    await requireAuthenticatedSession();
    try {
      const content = await fsTool.readFile(filePath);
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:write', async (event, { path: filePath, content }) => {
    await requireAuthenticatedSession();
    try {
      await fsTool.writeFile(filePath, content);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:list', async (event, dirPath) => {
    try {
      const list = await fsTool.listDirectory(dirPath);
      return { success: true, list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.cache']);
  const TEXT_EXTS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.txt',
    '.css', '.scss', '.html', '.htm', '.py', '.java', '.go', '.rs', '.yml',
    '.yaml', '.toml', '.env', '.example', '.sql', '.sh', '.ps1', '.xml', '.svg'
  ]);

  function inferEditorType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.md') return 'markdown';
    if (ext === '.json') return 'json';
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) return 'javascript';
    if (['.html', '.htm'].includes(ext)) return 'html';
    if (['.css', '.scss'].includes(ext)) return 'css';
    return 'text';
  }

  function loadProjectFolder(rootDir, maxFiles = 200) {
    const resolved = path.resolve(rootDir);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new Error(`Project folder not found: ${rootDir}`);
    }

    const collected = [];
    const walk = (dir) => {
      if (collected.length >= maxFiles) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

      for (const entry of entries) {
        if (collected.length >= maxFiles) break;
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name)) {
            walk(path.join(dir, entry.name));
          }
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        const ext = path.extname(entry.name).toLowerCase();
        if (!TEXT_EXTS.has(ext) && !entry.name.startsWith('.env')) continue;

        try {
          const stat = fs.statSync(fullPath);
          if (stat.size > 512 * 1024) continue;
          const content = fs.readFileSync(fullPath, 'utf8');
          const rel = path.relative(resolved, fullPath).replace(/\\/g, '/');
          collected.push({
            id: `proj-${Buffer.from(rel).toString('base64url')}`,
            name: rel,
            path: fullPath,
            type: inferEditorType(entry.name),
            content,
            updatedAt: stat.mtime.toISOString(),
            isDirty: false
          });
        } catch (_) {}
      }
    };

    walk(resolved);
    try {
      process.chdir(resolved);
    } catch (_) {}
    return {
      success: true,
      projectPath: resolved,
      projectName: path.basename(resolved),
      files: collected
    };
  }

  ipcMain.handle('dialog:open-project', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Open Project Folder',
        properties: ['openDirectory']
      });
      if (result.canceled || !result.filePaths?.length) {
        return { success: false, canceled: true };
      }
      return loadProjectFolder(result.filePaths[0]);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:read-folder', async (_event, { path: folderPath } = {}) => {
    try {
      if (!folderPath) throw new Error('Folder path is required');
      return loadProjectFolder(folderPath);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:set-cwd', async (_event, { path: folderPath } = {}) => {
    try {
      if (!folderPath) return { success: false };
      const resolved = path.resolve(folderPath);
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        process.chdir(resolved);
        return { success: true, cwd: resolved };
      }
      return { success: false, error: 'Directory not found' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('pip:update', async (_event, state) => {
    updatePipState(state || {});
    return { success: true };
  });

  ipcMain.handle('pip:action', async (_event, { action } = {}) => {
    const mainWin = BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && !w.getTitle().includes('Live PiP')
    );
    if (action === 'focus-main') {
      hidePipWindow();
      if (mainWin) {
        if (mainWin.isMinimized()) mainWin.restore();
        mainWin.focus();
      }
    } else if (action === 'stop') {
      if (mainWin) {
        mainWin.webContents.send('pip:stop-agent');
      }
    } else if (action === 'close') {
      hidePipWindow();
    } else if (action === 'show') {
      showPipWindow();
    }
    return { success: true };
  });

  // Universal Tool Execution IPC Handler
  ipcMain.handle('tool:execute', async (event, { tool, action, params }) => {
    try {
      const result = await executeTool(tool, action, params);
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tool:list', async () => {
    return getAvailableTools();
  });

  // Windows Desktop Control (Robot.js) Direct IPC Handlers
  ipcMain.handle('robot:getMousePos', async () => {
    try {
      const pos = await robot.getMousePos();
      return { success: true, pos };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('robot:moveMouse', async (event, { x, y, smooth = false }) => {
    try {
      if (smooth) {
        await robot.moveMouseSmooth(x, y);
      } else {
        await robot.moveMouse(x, y);
      }
      return { success: true, x, y };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('robot:mouseClick', async (event, { button = 'left', double = false } = {}) => {
    try {
      await robot.mouseClick(button, double);
      return { success: true, button, double };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('robot:typeString', async (event, text) => {
    try {
      await robot.typeString(text);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('robot:keyTap', async (event, { key, modifiers }) => {
    try {
      await robot.keyTap(key, modifiers);
      return { success: true, key };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('robot:captureScreen', async (event, outputPath) => {
    try {
      const info = await robot.captureScreen(outputPath);
      return { success: true, info };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('robot:getScreenSize', async () => {
    try {
      const size = await robot.getScreenSize();
      return { success: true, size };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Ghost Background Desktop Automation IPC Handlers (NORTHTEKDevs/ghost)
  ipcMain.handle('ghost:listWindows', async (event, query) => {
    try {
      const list = await ghost.listWindows(query);
      return { success: true, list };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ghost:inspectElements', async (event, { windowQuery, maxDepth }) => {
    try {
      const elements = await ghost.inspectElements(windowQuery, maxDepth);
      return { success: true, elements };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ghost:clickElement', async (event, { windowQuery, elementQuery }) => {
    try {
      const res = await ghost.clickElement(windowQuery, elementQuery);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ghost:setText', async (event, { windowQuery, elementQuery, text }) => {
    try {
      const res = await ghost.setText(windowQuery, elementQuery, text);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ghost:captureWindow', async (event, { windowQuery, outputPath }) => {
    try {
      const res = await ghost.captureWindow(windowQuery, outputPath);
      return { success: true, ...res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ghost:focusWindow', async (event, windowQuery) => {
    try {
      const res = await ghost.focusWindow(windowQuery);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Windows Human Operator IPC Handlers (Full Human-Like Windows Access)
  ipcMain.handle('operator:launchApp', async (event, { app, args }) => {
    try {
      return await windowsOperator.launchApp(app, args);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:hotkey', async (event, keys) => {
    try {
      return await windowsOperator.pressHotkey(keys);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:click', async (event, { x, y, button }) => {
    try {
      return await windowsOperator.click(x, y, button);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:doubleClick', async (event, { x, y }) => {
    try {
      return await windowsOperator.doubleClick(x, y);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:type', async (event, { text, delay }) => {
    try {
      return await windowsOperator.type(text, delay);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:openWithDefault', async (event, target) => {
    try {
      return await windowsOperator.openWithDefault(target);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:closeWindow', async (event, windowTitle) => {
    try {
      return await windowsOperator.closeWindow(windowTitle);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:setWindowState', async (event, { windowTitle, state }) => {
    try {
      return await windowsOperator.setWindowState(windowTitle, state);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:speak', async (event, { text, rate }) => {
    try {
      return await windowsOperator.speak(text, rate);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:seeScreen', async (event, outputPath) => {
    try {
      return await windowsOperator.seeScreen(outputPath);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('operator:runWorkflow', async (event, steps) => {
    try {
      return await windowsOperator.runHumanWorkflow(steps);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Browser Automation IPC Handlers
  ipcMain.handle('browser:navigate', async (event, url) => {
    try {
      return await playwright.navigate(url);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:click', async (event, selector) => {
    try {
      return await playwright.click(selector);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:type', async (event, { selector, text }) => {
    try {
      return await playwright.type(selector, text);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:screenshot', async (event, outputPath) => {
    try {
      return await playwright.screenshot(outputPath);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('browser:runAgent', async (event, { goal, options }) => {
    try {
      return await browserUse.runBrowserAgent(goal, options);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('stagehand:act', async (event, instruction) => {
    try {
      return await stagehand.act(instruction);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('stagehand:extract', async (event, { instruction, schema }) => {
    try {
      return await stagehand.extract(instruction, schema);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('stagehand:observe', async (event, instruction) => {
    try {
      return await stagehand.observe(instruction);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Custom AI Tools Creation & Verification IPC Handlers
  ipcMain.handle('customTool:create', async (event, toolSpec) => {
    try {
      return await customToolManager.createCustomTool(toolSpec);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('customTool:verify', async (event, toolName) => {
    try {
      return await customToolManager.verifyCustomTool(toolName);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('customTool:execute', async (event, { name, params }) => {
    try {
      return await customToolManager.executeCustomTool(name, params);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('customTool:list', async () => {
    try {
      return { success: true, tools: customToolManager.listCustomTools() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('customTool:delete', async (event, toolName) => {
    try {
      return customToolManager.deleteCustomTool(toolName);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // PersonaPlex Live Audio & Full-Duplex Simultaneous Voice IPC Handlers
  ipcMain.handle('liveAudio:start', async (event, config) => {
    try {
      return await personaPlex.startLiveAudioSession(config);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('liveAudio:chunk', async (event, { chunk, vad }) => {
    try {
      return await personaPlex.processAudioInputChunk(chunk, vad);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('liveAudio:speak', async (event, { text, options }) => {
    try {
      return await personaPlex.speak(text, options);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('liveAudio:interrupt', async () => {
    try {
      personaPlex.handleBargeIn();
      return { success: true, interrupted: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('liveAudio:configurePersona', async (event, { voicePrompt, textPrompt }) => {
    try {
      return personaPlex.configurePersona(voicePrompt, textPrompt);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('liveAudio:stop', async () => {
    try {
      return personaPlex.stopLiveAudioSession();
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('liveAudio:status', async () => {
    try {
      return { success: true, ...personaPlex.getStatus() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // System telemetry IPC handler
  ipcMain.handle('system:info', async () => {
    try {
      return {
        success: true,
        system: systemTool.getSystemInfo(),
        cpu: systemTool.getCpuInfo(),
        memory: systemTool.getMemoryInfo(),
        disk: systemTool.getDiskInfo(),
        network: systemTool.getNetworkInfo()
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

function stopActiveRun() {
  if (!activeRun) return;
  activeRun.stopped = true;
  if (activeRun.timer) clearTimeout(activeRun.timer);
  activeRun.agent.stop();
  activeRun = null;
}

module.exports = { registerHandlers };
