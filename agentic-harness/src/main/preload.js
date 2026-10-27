// Preload script - secure IPC bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Expose only whitelisted IPC channels here
  sendMessage: (channel, data) => ipcRenderer.invoke(channel, data),
  onMessage: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args))
});
