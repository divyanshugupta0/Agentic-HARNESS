// IPC handlers for main process
const { ipcMain } = require('electron');

function registerHandlers() {
  ipcMain.handle('agent:start', async (event, goal) => {
    // TODO: start agent run
    return { status: 'started', goal };
  });

  ipcMain.handle('agent:stop', async () => {
    return { status: 'stopped' };
  });

  ipcMain.handle('agent:pause', async () => {
    return { status: 'paused' };
  });

  ipcMain.handle('agent:resume', async () => {
    return { status: 'resumed' };
  });
}

module.exports = { registerHandlers };
