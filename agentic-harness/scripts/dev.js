// Development script
const { spawn, execSync } = require('child_process');
const path = require('path');

// 1. Build renderer bundle first
console.log('Building React renderer bundle...');
try {
  execSync('node scripts/build-renderer.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (err) {
  console.error('Failed to build renderer bundle:', err.message);
  process.exit(1);
}

// 2. Start Electron
let electronBinary;
try {
  electronBinary = require('electron');
} catch (e) {
  electronBinary = path.join(__dirname, '../node_modules/electron/dist/electron.exe');
}

const mainPath = path.join(__dirname, '../src/main/main.js');

console.log('Launching Electron...');
const electron = spawn(electronBinary, [mainPath], {
  stdio: 'inherit'
});

electron.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
});
