// Development script
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 1. Build Vite frontend bundle
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

// 2. Build legacy fallback bundle
try {
  execSync('node scripts/build-renderer.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (err) {
  // Ignored if using Vite
}

// 3. Start Electron
let electronBinary;
try {
  electronBinary = require('electron');
} catch (e) {
  electronBinary = path.join(__dirname, '../node_modules/electron/dist/electron.exe');
}

const mainPath = path.join(__dirname, '../src/main/main.js');

console.log('Launching Agentic Harness Electron Desktop...');
const electron = spawn(electronBinary, [mainPath], {
  stdio: 'inherit'
});

electron.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});
