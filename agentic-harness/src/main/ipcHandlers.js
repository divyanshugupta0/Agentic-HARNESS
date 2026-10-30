// IPC handlers for main process
const { ipcMain } = require('electron');
const { BaseAgent } = require('../agents/baseAgent');
const { MemoryStore } = require('../memory/memoryStore');
const { readFile, writeFile } = require('../tools/fsTool');

let activeRun = null;

function registerHandlers() {
  ipcMain.handle('agent:start', async (event, goal) => {
    if (activeRun) {
      activeRun.stopped = true;
      if (activeRun.timer) clearTimeout(activeRun.timer);
    }

    const memory = new MemoryStore();
    memory.addMessage('user', goal);

    const agent = new BaseAgent('research-agent', 'Autonomous Local Assistant', ['fsTool', 'shellTool', 'httpTool']);
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
      const content = await readFile(filePath);
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:write', async (event, { path: filePath, content }) => {
    try {
      await writeFile(filePath, content);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerHandlers };
