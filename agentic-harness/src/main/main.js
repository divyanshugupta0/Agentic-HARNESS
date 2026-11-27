// Electron main process entry point
const { app, BrowserWindow, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { registerHandlers } = require('./ipcHandlers');
const { showPipWindow, hidePipWindow, isAgentRunning } = require('./pipWindow');

let mainWindow;

function createWindow() {
  // Completely remove the default application menu bar (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#0a0d14',
    title: 'Agentic Harness',
    autoHideMenuBar: true, // Hide menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });

  // Explicitly remove menu from the window instance
  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);

  // Automatically grant microphone media permission for live audio mode
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media' || permission === 'audioCapture' || permission === 'microphone';
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media' || permission === 'audioCapture' || permission === 'microphone') {
      callback(true);
      return;
    }
    callback(false);
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

  mainWindow.on('minimize', () => {
    if (isAgentRunning()) showPipWindow();
  });
  mainWindow.on('blur', () => {
    if (isAgentRunning()) showPipWindow();
  });
  mainWindow.on('focus', () => {
    hidePipWindow();
  });
  mainWindow.on('restore', () => {
    hidePipWindow();
  });
  mainWindow.on('closed', () => {
    hidePipWindow();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
