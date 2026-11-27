// Development script for Agentic Harness Desktop
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ─── 1. Build modern Vite React frontend bundle ───────────────────────────────
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

// ─── 2. Start Auth Backend Server ────────────────────────────────────────────
const backendDir = path.resolve(__dirname, '../../backend');
let authServer = null;

function waitForAuthServer(port, retries, delay) {
  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      http.get(`http://localhost:${port}/health`, (res) => {
        resolve();
      }).on('error', () => {
        if (remaining <= 0) return reject(new Error(`Auth server did not start on port ${port}`));
        setTimeout(() => attempt(remaining - 1), delay);
      });
    }
    attempt(retries);
  });
}

if (fs.existsSync(backendDir)) {
  const authPort = process.env.PORT || 3001;
  console.log(`Starting auth backend on port ${authPort}...`);
  authServer = spawn(process.execPath, ['src/server.js'], {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env }
  });
  authServer.on('error', (err) => {
    console.warn('Auth server error:', err.message);
  });
}

// ─── 3. Launch Electron once auth server is ready ────────────────────────────
const authPort = process.env.PORT || 3001;

// Wait up to 10 seconds (20 retries × 500ms) for the auth server
waitForAuthServer(authPort, 20, 500)
  .then(() => console.log('Auth server is ready.'))
  .catch((err) => console.warn(`Warning: ${err.message}. Launching Electron anyway...`))
  .finally(() => {
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
    const electron = spawn(electronBinary, [mainPath], {
      stdio: 'inherit',
      env
    });

    electron.on('close', (code) => {
      console.log(`Electron process exited with code ${code}`);
      // Gracefully shut down the auth server when Electron exits
      if (authServer) {
        console.log('Stopping auth backend server...');
        authServer.kill('SIGTERM');
      }
      process.exit(code || 0);
    });
  });
