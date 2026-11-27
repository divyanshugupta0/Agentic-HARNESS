const { BrowserWindow, screen } = require('electron');
const path = require('path');

let pipWindow = null;
let lastState = { running: false, model: '', statusText: '', previewText: '' };

function createPipWindow() {
  if (pipWindow && !pipWindow.isDestroyed()) {
    return pipWindow;
  }

  const { width, height, x, y } = screen.getPrimaryDisplay().workArea;
  const pipWidth = 370;
  const pipHeight = 220;

  pipWindow = new BrowserWindow({
    width: pipWidth,
    height: pipHeight,
    x: x + width - pipWidth - 18,
    y: y + height - pipHeight - 18,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    show: false,
    backgroundColor: '#0b0f19',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Exclude PiP window from Windows screen capture (seeScreen / captureScreen)
  try {
    pipWindow.setContentProtection(true);
  } catch (_) {}

  pipWindow.loadFile(path.join(__dirname, '../renderer/pip.html'));
  pipWindow.webContents.once('did-finish-load', () => {
    if (pipWindow && !pipWindow.isDestroyed()) {
      pipWindow.webContents.send('pip:state', lastState);
    }
  });

  pipWindow.on('closed', () => {
    pipWindow = null;
  });

  return pipWindow;
}

function showPipWindow() {
  const win = createPipWindow();
  if (!win.isVisible()) {
    win.showInactive();
  }
  if (!win.webContents.isLoading()) {
    win.webContents.send('pip:state', lastState);
  }
}

function hidePipWindow() {
  if (pipWindow && !pipWindow.isDestroyed() && pipWindow.isVisible()) {
    pipWindow.hide();
  }
}

function updatePipState(state) {
  lastState = { ...lastState, ...state };
  if (pipWindow && !pipWindow.isDestroyed() && !pipWindow.webContents.isLoading()) {
    pipWindow.webContents.send('pip:state', lastState);
  }
}

function isAgentRunning() {
  return Boolean(lastState.running);
}

module.exports = {
  showPipWindow,
  hidePipWindow,
  updatePipState,
  isAgentRunning
};

