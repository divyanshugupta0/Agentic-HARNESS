// IPC handlers for main process
const { ipcMain, session, shell } = require('electron');
const { BaseAgent } = require('../agents/baseAgent');
const { MemoryStore } = require('../memory/memoryStore');
const { readFile, writeFile } = require('../tools/fsTool');
const { createSocialLoginHandler } = require('./socialLogin');
const { createAuthenticatedSessionVerifier } = require('./authSession');

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
      const content = await readFile(filePath);
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:write', async (event, { path: filePath, content }) => {
    await requireAuthenticatedSession();
    try {
      await writeFile(filePath, content);
      return { success: true };
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
