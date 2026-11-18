// Electron main process entry point
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { registerHandlers } = require('./ipcHandlers');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#0a0d14',
    title: 'Agentic Harness',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });

  // Resolve frontend build path: check dev server, workspace frontend/dist, packaged dist, or fallback
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const workspaceDist = path.resolve(__dirname, '../../../frontend/dist/index.html');
  const packagedDist = path.resolve(__dirname, '../../frontend/dist/index.html');
  const fallbackRenderer = path.resolve(__dirname, '../renderer/index.html');

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else if (fs.existsSync(workspaceDist)) {
    mainWindow.loadFile(workspaceDist);
  } else if (fs.existsSync(packagedDist)) {
    mainWindow.loadFile(packagedDist);
  } else {
    mainWindow.loadFile(fallbackRenderer);
  }
}

app.whenReady().then(() => {
  registerHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
