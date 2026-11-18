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

// 2. Start Electron
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
});
