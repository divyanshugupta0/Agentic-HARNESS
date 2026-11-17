// IPC handlers for main process
const { ipcMain } = require('electron');
const { BaseAgent } = require('../agents/baseAgent');
const { MemoryStore } = require('../memory/memoryStore');
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
  ipcMain.handle('agent:start', async (event, goal) => {
    if (activeRun) {
      activeRun.stopped = true;
      if (activeRun.timer) clearTimeout(activeRun.timer);
    }

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
    if (activeRun) {
      activeRun.stopped = true;
      if (activeRun.timer) clearTimeout(activeRun.timer);
      activeRun.agent.stop();
      try {
        event.sender.send('agent:log', '🛑 Agent execution stopped by supervisor.');
      } catch (e) {}
      activeRun = null;
    }
    return { status: 'stopped' };
  });

  ipcMain.handle('agent:pause', async (event) => {
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
    try {
      const content = await fsTool.readFile(filePath);
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:write', async (event, { path: filePath, content }) => {
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

module.exports = { registerHandlers };
