// Development script
const { spawn } = require('child_process');
const path = require('path');

const electron = spawn('npx', ['electron', path.join(__dirname, '../src/main/main.js')], {
  stdio: 'inherit',
  shell: true
});

electron.on('close', (code) => {
  console.log(`Electron exited with code ${code}`);
});
