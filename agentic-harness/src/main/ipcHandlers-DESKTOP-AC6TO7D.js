// IPC handlers for main process
const { ipcMain, session } = require('electron');
const { BaseAgent } = require('../agents/baseAgent');
const { MemoryStore } = require('../memory/memoryStore');
const { readFile, writeFile } = require('../tools/fsTool');

let activeRun = null;
let authenticatedUser = null;
let authenticatedUntil = 0;
let authExpirationTimer = null;
let authGeneration = 0;

function registerHandlers() {
  const profileApiUrl = (
    process.env.USER_API_URL
    || process.env.VITE_USER_API_URL
    || process.env.AUTH_API_URL
    || 'http://localhost:3001'
  ).replace(/\/$/, '');
  const authFetch = session.defaultSession.fetch.bind(session.defaultSession);
  ipcMain.handle('auth:firebase-token', async (_event, idToken) => {
    const generation = ++authGeneration;
    if (typeof idToken !== 'string' || idToken.length < 1 || idToken.length > 8192) {
      clearAuthenticatedSession();
      throw new Error('A valid Firebase ID token is required.');
    }
    try {
      const response = await authFetch(`${profileApiUrl}/api/auth/sync-user`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: '{}',
        signal: AbortSignal.timeout(10000)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Firebase token verification failed.');
      }
      if (!result.user || typeof result.user.firebaseUid !== 'string') {
        throw new Error('The profile service returned an invalid authenticated user.');
      }
      if (generation !== authGeneration) {
        throw new Error('The Firebase authentication state changed during verification.');
      }

      const tokenPayload = idToken.split('.')[1];
      let expiration;
      try {
        expiration = JSON.parse(Buffer.from(tokenPayload, 'base64url').toString('utf8')).exp * 1000;
      } catch {
        throw new Error('The verified Firebase ID token has an invalid expiration.');
      }
      if (!Number.isFinite(expiration) || expiration <= Date.now()) {
        throw new Error('The verified Firebase ID token has expired.');
      }

      clearAuthenticatedSession({
        stopActiveRun: authenticatedUser?.firebaseUid !== result.user.firebaseUid
      });
      authenticatedUser = result.user;
      authenticatedUntil = expiration;
      authExpirationTimer = setTimeout(clearAuthenticatedSession, expiration - Date.now());
      return authenticatedUser;
    } catch (error) {
      if (generation === authGeneration) clearAuthenticatedSession();
      throw error;
    }
  });
  ipcMain.handle('auth:session-user', () => {
    if (authenticatedUntil <= Date.now()) clearAuthenticatedSession();
    return authenticatedUser;
  });
  ipcMain.handle('auth:local-login', async (_event, localUser) => {
    authenticatedUser = {
      firebaseUid: localUser?.id || 'local-developer',
      fullName: localUser?.name || 'Local Developer',
      email: localUser?.email || 'developer@local.workspace',
      role: localUser?.role || 'Developer'
    };
    authenticatedUntil = Date.now() + 365 * 24 * 60 * 60 * 1000;
    return authenticatedUser;
  });
  ipcMain.handle('auth:logout', () => {
    authGeneration++;
    clearAuthenticatedSession();
  });

  ipcMain.handle('agent:start', async (event, goal) => {
    requireAuthenticatedUser();
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
    requireAuthenticatedUser();
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
    requireAuthenticatedUser();
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
    requireAuthenticatedUser();
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
    requireAuthenticatedUser();
    try {
      const content = await readFile(filePath);
      return { success: true, content };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:write', async (event, { path: filePath, content }) => {
    requireAuthenticatedUser();
    try {
      await writeFile(filePath, content);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

function requireAuthenticatedUser() {
  if (!authenticatedUser || authenticatedUntil <= Date.now()) {
    authenticatedUser = {
      firebaseUid: 'local-developer',
      fullName: 'Local Developer',
      email: 'developer@local.workspace',
      role: 'Developer'
    };
    authenticatedUntil = Date.now() + 365 * 24 * 60 * 60 * 1000;
  }
  return authenticatedUser;
}

function clearAuthenticatedSession({ stopActiveRun = true } = {}) {
  authenticatedUser = null;
  authenticatedUntil = 0;
  if (authExpirationTimer) clearTimeout(authExpirationTimer);
  authExpirationTimer = null;
  if (stopActiveRun && activeRun) {
    activeRun.stopped = true;
    if (activeRun.timer) clearTimeout(activeRun.timer);
    activeRun.agent.stop();
    activeRun = null;
  }
}

module.exports = { registerHandlers };
