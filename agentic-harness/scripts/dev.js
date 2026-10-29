// Development script
const { spawn } = require('child_process');
const path = require('path');

const electronPath = path.join(__dirname, '../node_modules/electron/dist/electron.exe');
const mainPath = path.join(__dirname, '../src/main/main.js');

const electron = spawn(electronPath, [mainPath], {
  stdio: 'inherit'
});

electron.on('close', (code) => {
  console.log(`Electron exited with code ${code}`);
});
