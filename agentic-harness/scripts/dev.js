// Development script for Agentic Harness Desktop
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 1. Build modern Vite React frontend bundle
const frontendDir = path.resolve(__dirname, '../../frontend');
if (fs.existsSync(frontendDir)) {
  console.log('Building modern Vite React frontend...');
  try {
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: frontendDir
    });
  } catch (err) {
    console.warn('Frontend build notice:', err.message);
  }
}

// 2. Start backend SQLite profile service
const backendDir = path.resolve(__dirname, '../../backend');
let backendProcess;
if (fs.existsSync(backendDir)) {
  console.log('Starting backend Firebase profile service...');
  try {
    const backendServerScript = path.join(backendDir, 'src/firebaseProfileServer.js');
    backendProcess = spawn(process.execPath, [backendServerScript], {
      cwd: backendDir,
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (err) {
    console.warn(`Unable to start backend profile server: ${err.message}`);
  }
}

// 3. Serve the frontend over localhost so Firebase recognizes the desktop renderer origin
let viteProcess;
try {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  viteProcess = spawn(npmCmd, ['run', 'dev'], {
    cwd: frontendDir,
    stdio: 'inherit',
    env: { ...process.env },
    shell: false
  });
} catch (err) {
  console.warn(`Unable to start the frontend dev server: ${err.message}`);
}

async function waitForFrontend(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Frontend dev server did not become ready at ${url}`);
}

// 4. Start Electron
let electronBinary;
try {
  electronBinary = require('electron');
} catch (e) {
  electronBinary = path.join(__dirname, '../node_modules/electron/dist/electron.exe');
}

const mainPath = path.join(__dirname, '../src/main/main.js');

// Crucial: Sanitize environment so Electron runs as GUI application rather than node
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

console.log('Launching Agentic Harness Electron Desktop...');
waitForFrontend('http://localhost:5173')
  .then(() => {
    env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
    const electron = spawn(electronBinary, [mainPath], {
      stdio: 'inherit',
      env
    });

    electron.on('close', (code) => {
      if (viteProcess && !viteProcess.killed) viteProcess.kill();
      if (backendProcess && !backendProcess.killed) backendProcess.kill();
      console.log(`Electron process exited with code ${code}`);
    });
  })
  .catch((error) => {
    if (viteProcess && !viteProcess.killed) viteProcess.kill();
    if (backendProcess && !backendProcess.killed) backendProcess.kill();
    console.error(error.message);
    process.exitCode = 1;
  });
